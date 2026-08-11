const nodemailer = require("nodemailer");
const configuracionCorreoModelo = require("../modelos/ConfiguracionCorreoModelo");
const { descifrar } = require("../utilidades/cifrado");

const correoServicio = {};

// Arma el transportador a partir de la configuración de correo parametrizada
// por el administrador (Configuración > Correo de notificaciones, ver
// ConfiguracionCorreoOperaciones) en vez de una cuenta de Gmail fija por
// variables de entorno. Se construye en cada envío -no se cachea- para que
// un cambio de configuración aplique de inmediato, sin reiniciar el
// servidor. Si todavía no se ha guardado ninguna configuración, cae a
// EMAIL_USER/EMAIL_PASS (el comportamiento que tenía este servicio antes),
// para no dejar de enviar notificaciones mientras el administrador no ha
// entrado a parametrizarla.
const obtenerTransportadorYRemitente = async () => {
    const configuracion = await configuracionCorreoModelo.findOne();

    if (configuracion?.smtp?.usuario && configuracion.smtp.passwordCifrada) {
        return {
            transportador: nodemailer.createTransport({
                host: configuracion.smtp.host,
                port: configuracion.smtp.puerto,
                secure: configuracion.smtp.seguridad === "SSL",
                auth: {
                    user: configuracion.smtp.usuario,
                    pass: descifrar(configuracion.smtp.passwordCifrada)
                }
            }),
            remitente: `${configuracion.remitenteNombre} <${configuracion.remitenteCorreo}>`
        };
    }

    return {
        transportador: nodemailer.createTransport({
            service: "gmail",
            auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
        }),
        remitente: `Serviplus <${process.env.EMAIL_USER}>`
    };
};

correoServicio.enviarCorreoRecuperacion = async (correoDestino, enlace) => {
    const { transportador, remitente } = await obtenerTransportadorYRemitente();
    await transportador.sendMail({
        from: remitente,
        to: correoDestino,
        subject: "Recuperación de contraseña - Serviplus",
        html: `
            <p>Recibimos una solicitud para restablecer tu contraseña.</p>
            <p><a href="${enlace}">Haz clic aquí para definir una nueva contraseña</a></p>
            <p>Este enlace expira en 1 hora. Si no solicitaste este cambio, puedes ignorar este correo.</p>
        `
    });
};

correoServicio.enviarCorreoTicketCreado = async (correoDestino, numeracionTicket, tiempoEstimadoTexto) => {
    const { transportador, remitente } = await obtenerTransportadorYRemitente();
    await transportador.sendMail({
        from: remitente,
        to: correoDestino,
        subject: `Ticket ${numeracionTicket} creado - Serviplus`,
        html: `
            <p>Hemos recibido tu solicitud y se generó el ticket <strong>${numeracionTicket}</strong>.</p>
            <p>Será gestionado en un tiempo estimado de <strong>${tiempoEstimadoTexto}</strong>, de acuerdo con los tiempos de servicio establecidos para cada etapa (pendiente, en proceso, solucionado).</p>
            <p>Puedes hacer seguimiento a tu ticket ingresando a la plataforma de Serviplus.</p>
        `
    });
};

module.exports = correoServicio;
