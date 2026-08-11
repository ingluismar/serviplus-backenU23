const mongoose = require("mongoose");

const clienteSchema = mongoose.Schema({

    nombres: { type : String, maxLength: 80, required: true, unique: false },
    apellidos: { type : String, maxLength: 80, required: true, unique: false },
    documento:  { type : String, maxLength: 10, required: true, unique: true },
    telefono : { type : String, required: true, unique: false },
    correo: { type : String, maxLength: 120, required: true, unique: false },
    usuario: { type : String, maxLength: 20, required: true, unique: true },
    password: { type : String,  required: true },
    // Rol del sistema: determina qué puede hacer esta cuenta al iniciar
    // sesión. Calldispatcher y Administrador son los únicos que pueden
    // asignar un ticket a un agente de soporte (ver TicketOperaciones).
    rol: { type: String, enum: ["Cliente", "Administrador", "Calldispatcher"], required: true, default: "Cliente" },
    // Permite al administrador inactivar la cuenta sin borrarla. Un cliente
    // inactivo no puede iniciar sesión (ver LoginOperaciones.login).
    activo: { type: Boolean, required: true, default: true },
    // Marca clientes VIP/directivos designados por la empresa. Se hereda a
    // cada ticket nuevo de este cliente (ver TicketOperaciones.crearTicket)
    // y sube la prioridad sugerida al triar el caso (ver sugerirPrioridad en
    // el frontend), lo que a su vez le da un ANS más corto.
    esVip: { type: Boolean, required: true, default: false },
    resetPasswordToken: { type: String, required: false },
    resetPasswordExpira: { type: Date, required: false }
});

module.exports = mongoose.model("clientes", clienteSchema);
