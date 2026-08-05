const ClienteModelo = require("../modelos/ClienteModelo");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const correoServicio = require("../servicios/correoServicio");
const LoginOperaciones = {};

const SALT_TIMES = 10;
const DURACION_TOKEN_MS = 60 * 60 * 1000; // 1 hora

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
        let password = req.body.password;
        const user = await ClienteModelo.findOne({correo: correo});
        if (user != null) {
            const result = await compararPassword(password, user.password);
            if (result) {
                const acceso = {
                    id: user._id,
                    nombres: user.nombres+" "+user.apellidos,
                    correo: user.correo,
                    es_admin: user.es_admin,
                    //token: generarToken(usuario.id, usuario.nombres+" "+usuario.apellidos, usuario.es_admin)
                }
                res.status(200).json(acceso);
            }
            else {
                res.status(401).send("Email o contraseña incorrectos");    
            }
        }
        else {
            res.status(401).send("Email o contraseña incorrectos");
        }
    } catch (error) {
        console.log(error);
        res.status(400).json(error);
    }
}

LoginOperaciones.solicitarRecuperacion = async (req, res) => {
    const MENSAJE_GENERICO = "Si el correo está registrado, se envió un enlace de recuperación";
    try {
        const correo = req.body.correo;
        const user = await ClienteModelo.findOne({ correo: correo });

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

        const user = await ClienteModelo.findOne({
            resetPasswordToken: hashearToken(token),
            resetPasswordExpira: { $gt: new Date() }
        });

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