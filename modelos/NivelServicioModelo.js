const mongoose = require("mongoose");

// Catálogo configurable de niveles de servicio. Cada registro representa
// una opción que el frontend debe listar en el desplegable de "rol" al
// crear/editar un agente (pantalla de configuración -> botón 2).
const nivelServicioSchema = mongoose.Schema({

    nombre: { type : String, maxLength: 80, required: true, unique: true },
    descripcion: { type : String, maxLength: 200, required: false },
    activo: { type : Boolean, required: true, default: true }

});

module.exports = mongoose.model("nivelesservicio", nivelServicioSchema);
