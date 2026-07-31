const mongoose = require("mongoose");

const ansSchema = mongoose.Schema({

    pendiente: { type : Number, min: 0, required: true, unique: false },
    proceso: { type : Number, min: 0, required: true, unique: false },
    solucionado:  { type : Number, min: 0, required: true, unique: false }

});

module.exports = mongoose.model("ans", ansSchema);