const mongoose = require("mongoose");
const { Schema } = mongoose;

// Registro de auditoría: deja constancia de "quién hizo qué, cuándo y desde
// dónde" para cada acción sensible del sistema (autenticación, altas/bajas/
// modificaciones de clientes, agentes, tickets y parametrización). Es de
// solo lectura desde la API a propósito -no existen rutas PUT/DELETE para
// esta colección- porque un log de auditoría que se puede editar o borrar
// deja de servir como evidencia: la trazabilidad exige que sea inmutable.
const AuditoriaEsquema = new Schema({
    fecha: {
        type: Date,
        default: Date.now,
        required: true
    },
    // Código corto y estable del evento (ver EVENTOS_AUDITORIA en
    // servicios/auditoriaServicio.js), p. ej. "LOGIN_EXITOSO",
    // "ASIGNACION_TICKET". Se guarda como texto (no como referencia) para
    // que el histórico no cambie de significado si el catálogo evoluciona.
    evento: {
        type: String,
        required: true
    },
    // Área funcional del evento, para filtrar rápido: "Autenticación",
    // "Tickets", "Clientes", "Agentes", "Niveles de servicio", "ANS"
    modulo: {
        type: String
    },
    descripcion: {
        type: String
    },
    resultado: {
        type: String,
        enum: ["EXITOSO", "FALLIDO"],
        default: "EXITOSO"
    },
    // Quién hizo la acción. Se guarda "plano" (no como ref a Cliente/Agente)
    // porque el usuario puede borrarse o cambiar de datos después, y el log
    // tiene que conservar la foto exacta de cómo se llamaba/qué rol tenía
    // en el momento del evento (integridad histórica de la evidencia).
    usuario: {
        id: { type: Schema.Types.Mixed, default: null },
        nombres: { type: String, default: null },
        correo: { type: String, default: null },
        rol: { type: String, default: null }
    },
    // Recurso sobre el que se actuó (el ticket, cliente o agente afectado),
    // cuando aplica.
    entidadAfectada: {
        tipo: { type: String, default: null },
        id: { type: Schema.Types.Mixed, default: null },
        referencia: { type: String, default: null }
    },
    // Dirección IP de origen de la petición (ver obtenerIp en
    // auditoriaServicio.js: respeta X-Forwarded-For detrás de un proxy).
    ip: {
        type: String,
        default: null
    },
    // Dirección MAC del dispositivo, capturada por mejor esfuerzo mediante
    // la tabla ARP del servidor. Solo es resoluble cuando el cliente está en
    // la misma red local que el backend; fuera de esa red (internet de por
    // medio) queda en null porque el protocolo IP no transporta la MAC más
    // allá del salto local -ver el comentario detallado en
    // auditoriaServicio.js-.
    mac: {
        type: String,
        default: null
    },
    // Cadena User-Agent del navegador/dispositivo: en la práctica es la
    // huella de dispositivo más fiable disponible para una app web (a
    // diferencia de la MAC, sí viaja hasta el servidor en cualquier red).
    userAgent: {
        type: String,
        default: null
    }
}, { versionKey: false });

// Los listados de auditoría siempre se consultan más recientes primero y se
// filtran por rango de fechas y/o por usuario: estos índices sostienen esos
// dos patrones de consulta sin necesitar un escaneo completo de colección.
AuditoriaEsquema.index({ fecha: -1 });
AuditoriaEsquema.index({ "usuario.correo": 1, fecha: -1 });
AuditoriaEsquema.index({ evento: 1, fecha: -1 });

module.exports = mongoose.model("Auditoria", AuditoriaEsquema, "auditoria");
