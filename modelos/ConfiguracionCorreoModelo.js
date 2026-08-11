const mongoose = require("mongoose");

// Datos de una cuenta de correo (los mismos para SMTP -salida- y POP3
// -entrada-, así que se comparte el esquema). La contraseña nunca se guarda
// en claro: se cifra con utilidades/cifrado.js antes de llegar aquí y solo
// se descifra al momento de usarla contra el servidor de correo.
const cuentaCorreoSchema = new mongoose.Schema({
    host: { type: String, required: true, trim: true },
    puerto: { type: Number, required: true, min: 1, max: 65535 },
    seguridad: { type: String, enum: ["SSL", "TLS", "Ninguna"], required: true, default: "TLS" },
    usuario: { type: String, required: true, trim: true },
    passwordCifrada: { type: String, required: false }
}, { _id: false });

// Configuración única (documento singleton, igual que AnsModelo) de la
// cuenta de correo que usa el backend para enviar notificaciones
// (recuperación de contraseña, creación de ticket, etc. — ver
// servicios/correoServicio.js). "proveedor" es solo una etiqueta libre
// (Gmail/Outlook/Personalizado...) para que el formulario pueda
// autocompletar host/puerto conocidos; lo que realmente se usa para enviar
// es el bloque "smtp".
//
// "pop3" queda parametrizado para cuando la aplicación necesite recibir/leer
// correo (hoy ningún flujo lo usa: las notificaciones solo envían) — se
// guarda igual para que la cuenta quede completamente configurada de una
// sola vez, según lo que provea el proveedor de correo.
const configuracionCorreoSchema = mongoose.Schema({
    proveedor: { type: String, required: true, default: "Gmail" },
    remitenteNombre: { type: String, required: true, trim: true, default: "Serviplus" },
    remitenteCorreo: { type: String, required: true, trim: true },
    smtp: { type: cuentaCorreoSchema, required: true },
    pop3: { type: cuentaCorreoSchema, required: false },
    activo: { type: Boolean, required: true, default: true }
});

module.exports = mongoose.model("configuracionCorreo", configuracionCorreoSchema);
