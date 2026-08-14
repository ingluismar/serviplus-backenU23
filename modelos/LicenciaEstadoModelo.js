const mongoose = require("mongoose");

// Documento único (mismo patrón que AnsModelo/ConfiguracionCorreoModelo):
// guarda la huella de esta instalación -se genera una sola vez al primer
// arranque y nunca cambia- y la última licencia cargada, tal cual llegó
// ({datos, firma}, ver utilidades/licencia.js). "ultimaFechaVista" es la
// fecha más tardía que este backend ha observado alguna vez: sirve para
// detectar un reloj del sistema retrocedido (ver servicios/licenciaServicio.js).
const licenciaEstadoSchema = mongoose.Schema({
    instancia: { type: String, required: true, unique: true },
    licencia: { type: mongoose.Schema.Types.Mixed, required: false, default: null },
    ultimaFechaVista: { type: Date, required: true, default: Date.now }
});

module.exports = mongoose.model("licenciaEstado", licenciaEstadoSchema);
