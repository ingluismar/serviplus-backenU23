const nodemailer = require("nodemailer");

const transportador = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

const correoServicio = {};

correoServicio.enviarCorreoRecuperacion = async (correoDestino, enlace) => {
    await transportador.sendMail({
        from: `Serviplus <${process.env.EMAIL_USER}>`,
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
    await transportador.sendMail({
        from: `Serviplus <${process.env.EMAIL_USER}>`,
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
