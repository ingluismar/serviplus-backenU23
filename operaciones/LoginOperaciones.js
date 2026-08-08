const ClienteModelo = require("../modelos/ClienteModelo");
const AgenteModelo = require("../modelos/AgentesModelo");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const correoServicio = require("../servicios/correoServicio");
const LoginOperaciones = {};

const SALT_TIMES = 10;
const DURACION_TOKEN_MS = 60 * 60 * 1000; // 1 hora
const DURACION_SESION = "8h";

// Firma el token de sesión que el frontend debe enviar como
// "Authorization: Bearer <token>" en cada petición protegida. El rol viaja
// dentro del token (no se vuelve a preguntar a la base de datos en cada
// petición) para que verificarToken/requiereAdmin puedan decidir el acceso
// sin una consulta extra.
//
// "nombres" es el nombre completo (para saludar/mostrar en pantalla).
// "nombreAgente" es el valor EXACTO del campo "nombres" del agente, sin
// concatenar apellidos: es lo que queda guardado en ticket.agente cuando el
// dispatcher lo asigna (ver el <option value={agente.nombres}> del
// desplegable), así que "Mis tickets" y el control de que un agente solo
// toque lo suyo tienen que comparar contra este mismo valor, no contra el
// nombre completo.
const generarTokenSesion = (usuario, esAgente) => {
    return jwt.sign(
        {
            id: usuario._id,
            nombres: usuario.nombres + " " + usuario.apellidos,
            nombreAgente: esAgente ? usuario.nombres : undefined,
            correo: usuario.correo,
            rol: usuario.rol
        },
        process.env.JWT_SECRET,
        { expiresIn: DURACION_SESION }
    );
}

const compararPassword = async (recibido, guardado) => {
    return await bcrypt.compare(recibido, guardado);
}

const cifrarPassword = async (password) => {
    const salt = await bcrypt.genSalt(SALT_TIMES);
    return await bcrypt.hash(password, salt);
}

const hashearToken = (token) => {
    return crypto.createHash("sha256").update(token).digest("hex");
}

LoginOperaciones.login = async(req, res) => {
    try {
        const correo = req.body.correo;
        const password = req.body.password;

        // Clientes (incluye Administrador/Calldispatcher dados de alta como
        // cliente) y Agentes son dos colecciones distintas que ahora pueden
        // iniciar sesión; se busca la cuenta por correo en ambas.
        let user = await ClienteModelo.findOne({ correo: correo });
        let esAgente = false;
        if (user == null) {
            user = await AgenteModelo.findOne({ correo: correo });
            esAgente = user != null;
        }

        // Sin contraseña configurada (agentes migrados antes de tener login
        // propio) no hay nada que comparar: se trata igual que credenciales
        // inválidas, sin revelar el motivo exacto.
        if (user == null || !user.password) {
            return res.status(401).send("Email o contraseña incorrectos");
        }

        const result = await compararPassword(password, user.password);
        if (!result) {
            return res.status(401).send("Email o contraseña incorrectos");
        }

        if (user.activo === false) {
            return res.status(401).send("Tu cuenta está inactiva. Contacta al administrador.");
        }

        const acceso = {
            id: user._id,
            nombres: user.nombres+" "+user.apellidos,
            nombreAgente: esAgente ? user.nombres : undefined,
            correo: user.correo,
            rol: user.rol,
            token: generarTokenSesion(user, esAgente)
        }
        res.status(200).json(acceso);
    } catch (error) {
        console.log(error);
        res.status(400).json(error);
    }
}

LoginOperaciones.solicitarRecuperacion = async (req, res) => {
    const MENSAJE_GENERICO = "Si el correo está registrado, se envió un enlace de recuperación";
    try {
        const correo = req.body.correo;
        // Igual que en login: la cuenta puede ser de cliente o de agente
        let user = await ClienteModelo.findOne({ correo: correo });
        if (user == null) {
            user = await AgenteModelo.findOne({ correo: correo });
        }

        if (user != null) {
            const token = crypto.randomBytes(32).toString("hex");
            user.resetPasswordToken = hashearToken(token);
            user.resetPasswordExpira = new Date(Date.now() + DURACION_TOKEN_MS);
            await user.save();

            const enlace = `${process.env.FRONTEND_URL}/restablecer-password/${token}`;
            try {
                await correoServicio.enviarCorreoRecuperacion(user.correo, enlace);
            } catch (errorCorreo) {
                console.log("Error al enviar correo de recuperación:", errorCorreo);
            }
        }

        // Respuesta genérica siempre, para no revelar si el correo existe o no
        res.status(200).send(MENSAJE_GENERICO);
    } catch (error) {
        console.log(error);
        res.status(400).json(error);
    }
}

LoginOperaciones.restablecerPassword = async (req, res) => {
    try {
        const { token, nuevaPassword } = req.body;

        if (!token || !nuevaPassword) {
            return res.status(400).send("Falta el token o la nueva contraseña");
        }

        const filtroToken = {
            resetPasswordToken: hashearToken(token),
            resetPasswordExpira: { $gt: new Date() }
        };
        let user = await ClienteModelo.findOne(filtroToken);
        if (user == null) {
            user = await AgenteModelo.findOne(filtroToken);
        }

        if (user == null) {
            return res.status(400).send("El enlace es inválido o ya expiró");
        }

        user.password = await cifrarPassword(nuevaPassword);
        user.resetPasswordToken = undefined;
        user.resetPasswordExpira = undefined;
        await user.save();

        res.status(200).send("Contraseña actualizada correctamente");
    } catch (error) {
        console.log(error);
        res.status(400).json(error);
    }
}

module.exports = LoginOperaciones;