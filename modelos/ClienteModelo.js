const mongoose = require("mongoose");

const clienteSchema = mongoose.Schema({

    nombres: { type : String, maxLength: 80, required: true, unique: false },
    apellidos: { type : String, maxLength: 80, required: true, unique: false },
    documento:  { type : String, maxLength: 10, required: true, unique: true },
    telefono : { type : String, required: true, unique: false },
    correo: { type : String, maxLength: 120, required: true, unique: false },
    usuario: { type : String, maxLength: 20, required: true, unique: true },
    password: { type : String,  required: true },
    es_admin: { type:Boolean, required:true }
});

module.exports = mongoose.model("clientes", clienteSchema);
