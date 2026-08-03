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

module.exports = correoServicio;
