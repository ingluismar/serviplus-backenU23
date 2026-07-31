const mongoose = require("mongoose");


const TicketSchema = mongoose.Schema({

    numeracionTicket: { type: String, required: true, unique: true },
    fecha:  { type: Date, default: Date.now, required: false, unique: false },
    asunto: { type: String, maxLength: 150, required: true, unique: false },
    solicitud: { type: String, maxLength: 400, required: true, unique: false },
    agente: { type: String, maxLength: 50, required: false, unique: false },
    estadotk: { type: String, maxLength: 50, required: false, unique: false },
    cierre: { type: String, maxLength: 400, required: false, unique: false },
    fechaCierre:  { type: Date, required: false, unique: false },
    adjunto: {
        nombreOriginal: { type: String, required: false },
        nombreArchivo: { type: String, required: false },
        tipo: { type: String, required: false },
        tamano: { type: Number, required: false }
    }
});

module.exports = mongoose.model("tickets", TicketSchema);