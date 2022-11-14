const fechaActual = new Date();
const dia = fechaActual.getDate();
const mes = fechaActual.getMonth()+1;
const anio = fechaActual.getFullYear();
const fecha = (anio+"/"+mes+"/"+dia);
const horaActual = fechaActual.getHours();
const min = fechaActual.getMinutes();
const hora = (horaActual+":"+min)
const tiempoIn = (fecha+" "+hora);
const mongoose = require("mongoose");


const TicketSchema = mongoose.Schema({
    
    fecha:  { type : String, default: tiempoIn, required: false, unique: false },
    asunto: { type : String, maxLength: 150, required: true, unique: false },
    solicitud: { type : String, maxLength: 400, required: true, unique: false },
    agente: { type : String, maxLength: 50, required: false, unique: false },
    estadotk: { type : String, maxLength: 50, required: false, unique: false },
    cierre: { type : String, maxLength: 400, required: false, unique: false },
    fechaCierre:  { type : String, required: false, unique: false }
    
});

module.exports = mongoose.model("tickets", TicketSchema);