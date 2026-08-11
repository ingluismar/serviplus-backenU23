const mongoose = require("mongoose");

// Mismos 3 tiempos (uno por estado del ticket) que un ANS "vip" opcional,
// para no duplicar la definición.
const nivelAnsSchema = new mongoose.Schema({
    pendiente: { type: Number, min: 0, required: true, unique: false },
    proceso: { type: Number, min: 0, required: true, unique: false },
    solucionado: { type: Number, min: 0, required: true, unique: false }
}, { _id: false });

// Documento único (ansModelo.findOne() en TicketOperaciones): el ANS
// estándar son los 3 campos de siempre, igual que antes de este cambio. El
// bloque "vip" es un segundo ANS opcional, con los mismos 3 tiempos, que se
// usa en su lugar cuando el ticket es de una solicitud VIP/directiva
// (Ticket.esVip) — ver TicketOperaciones.calcularEstadoAns. Si no se
// configura, un ticket VIP simplemente usa el ANS estándar.
const ansSchema = mongoose.Schema({
    pendiente: { type: Number, min: 0, required: true, unique: false },
    proceso: { type: Number, min: 0, required: true, unique: false },
    solucionado: { type: Number, min: 0, required: true, unique: false },
    vip: { type: nivelAnsSchema, required: false }
});

module.exports = mongoose.model("ans", ansSchema);
