const nodemailer = require("nodemailer");
const configuracionCorreoModelo = require("../modelos/ConfiguracionCorreoModelo");
const auditoriaServicio = require("../servicios/auditoriaServicio");
const { EVENTOS_AUDITORIA } = auditoriaServicio;
const { cifrar, descifrar } = require("../utilidades/cifrado");
const configuracionCorreoOperaciones = {};

// La cuenta de Gmail que el backend ya venía usando por variables de entorno
// (EMAIL_USER/EMAIL_PASS, ver servicios/correoServicio.js antes de este
// cambio). Sirve como valor inicial la primera vez que alguien consulta la
// configuración, para que las notificaciones sigan funcionando con la misma
// cuenta sin que el administrador tenga que volver a escribir la contraseña.
const configuracionPorDefecto = () => ({
    proveedor: "Gmail",
    remitenteNombre: "Serviplus",
    remitenteCorreo: process.env.EMAIL_USER || "",
    smtp: {
        host: "smtp.gmail.com",
        puerto: 465,
        seguridad: "SSL",
        usuario: process.env.EMAIL_USER || "",
        passwordCifrada: process.env.EMAIL_PASS ? cifrar(process.env.EMAIL_PASS) : ""
    },
    activo: true
});

// Documento único: si todavía no existe ninguna configuración, se crea a
// partir de las variables de entorno (la cuenta que ya se estaba usando) en
// vez de dejar el primer GET vacío.
const obtenerOCrear = async () => {
    let configuracion = await configuracionCorreoModelo.findOne();
    if (!configuracion) {
        configuracion = await configuracionCorreoModelo.create(configuracionPorDefecto());
    }
    return configuracion;
};

// La contraseña nunca sale del backend en claro: en su lugar se informa si
// hay una guardada (para que el formulario muestre "hay una contraseña
// guardada" en vez de un campo vacío, sin exponer el valor real).
const limpiarCuenta = (cuenta) => {
    if (!cuenta) return cuenta;
    const { passwordCifrada, ...resto } = cuenta.toObject ? cuenta.toObject() : cuenta;
    return { ...resto, tieneContrasena: !!passwordCifrada };
};

const paraRespuesta = (configuracion) => {
    const plano = configuracion.toObject();
    return { ...plano, smtp: limpiarCuenta(plano.smtp), pop3: limpiarCuenta(plano.pop3) };
};

configuracionCorreoOperaciones.buscarConfiguracion = async (req, res) => {
    try {
        const configuracion = await obtenerOCrear();
        res.status(200).send(paraRespuesta(configuracion));
    } catch (error) {
        res.status(400).send("Mala petición. " + error);
    }
};

// Arma el bloque smtp/pop3 a guardar: si llega una contraseña nueva, se
// cifra; si el campo viene vacío, se conserva la que ya había (mismo
// criterio que ClienteOperaciones.modificarCliente con la contraseña del
// cliente — dejarlo en blanco significa "no cambiar la contraseña").
const armarCuenta = (body, cuentaActual) => {
    if (!body || !body.host) return undefined;
    return {
        host: body.host,
        puerto: Number(body.puerto),
        seguridad: body.seguridad,
        usuario: body.usuario,
        passwordCifrada: body.password ? cifrar(body.password) : (cuentaActual?.passwordCifrada || "")
    };
};

configuracionCorreoOperaciones.guardarConfiguracion = async (req, res) => {
    try {
        const body = req.body;
        const actual = await obtenerOCrear();

        const smtp = armarCuenta(body.smtp, actual.smtp);
        if (!smtp) {
            return res.status(400).send("La cuenta SMTP (host, puerto, usuario) es obligatoria.");
        }

        const datosActualizar = {
            proveedor: body.proveedor || "Personalizado",
            remitenteNombre: body.remitenteNombre,
            remitenteCorreo: body.remitenteCorreo,
            smtp,
            pop3: armarCuenta(body.pop3, actual.pop3),
            activo: body.activo !== false
        };

        const actualizada = await configuracionCorreoModelo.findByIdAndUpdate(
            actual._id, datosActualizar, { new: true, runValidators: true }
        );

        auditoriaServicio.registrar(req, {
            evento: EVENTOS_AUDITORIA.MODIFICACION_CONFIGURACION_CORREO,
            modulo: "Configuración",
            descripcion: `Modificación de la configuración de correo de notificaciones (proveedor: ${actualizada.proveedor}, remitente: ${actualizada.remitenteCorreo})`
        });

        res.status(200).send(paraRespuesta(actualizada));
    } catch (error) {
        res.status(400).send(error.name === "ValidationError" ? "Verifica los datos de la cuenta de correo." : "Mala petición. " + error);
    }
};

// Arma un transportador de nodemailer con la configuración YA GUARDADA (no
// con lo que haya sin guardar en el formulario) y manda un correo de
// prueba — para validar host/puerto/usuario/contraseña sin depender de que
// falle una notificación real más tarde.
configuracionCorreoOperaciones.enviarCorreoPrueba = async (req, res) => {
    try {
        const destino = req.body.destino;
        if (!destino) {
            return res.status(400).send("Indica un correo de destino para la prueba.");
        }

        const configuracion = await obtenerOCrear();
        if (!configuracion.smtp?.usuario || !configuracion.smtp?.passwordCifrada) {
            return res.status(400).send("Todavía no hay una cuenta SMTP guardada con usuario y contraseña.");
        }

        const transportador = nodemailer.createTransport({
            host: configuracion.smtp.host,
            port: configuracion.smtp.puerto,
            secure: configuracion.smtp.seguridad === "SSL",
            auth: {
                user: configuracion.smtp.usuario,
                pass: descifrar(configuracion.smtp.passwordCifrada)
            }
        });

        await transportador.sendMail({
            from: `${configuracion.remitenteNombre} <${configuracion.remitenteCorreo}>`,
            to: destino,
            subject: "Correo de prueba - Configuración de notificaciones",
            html: `
                <p>Este es un correo de prueba de la configuración de notificaciones de ${configuracion.remitenteNombre}.</p>
                <p>Si lo recibiste, la cuenta SMTP quedó parametrizada correctamente.</p>
            `
        });

        auditoriaServicio.registrar(req, {
            evento: EVENTOS_AUDITORIA.PRUEBA_CONFIGURACION_CORREO,
            modulo: "Configuración",
            descripcion: `Envío de correo de prueba a ${destino} con la configuración de correo vigente`
        });

        res.status(200).send("Correo de prueba enviado.");
    } catch (error) {
        auditoriaServicio.registrar(req, {
            evento: EVENTOS_AUDITORIA.PRUEBA_CONFIGURACION_CORREO,
            modulo: "Configuración",
            descripcion: `Falló el envío del correo de prueba a ${req.body.destino}: ${error.message || error}`,
            resultado: "FALLIDO"
        });
        res.status(400).send("No se pudo enviar el correo de prueba: " + (error.message || error));
    }
};

module.exports = configuracionCorreoOperaciones;
