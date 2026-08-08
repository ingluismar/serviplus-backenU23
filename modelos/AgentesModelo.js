const mongoose = require("mongoose");

const agenteSchema = mongoose.Schema({

    nombres: { type : String, maxLength: 80, required: true, unique: false },
    apellidos: { type : String, maxLength: 80, required: true, unique: false },
    documento:  { type : String, maxLength: 10, required: true, unique: true },
    // Especialidad/nivel de servicio del agente (catálogo parametrizable en
    // NivelServicioModelo, ej. "Nivel 1", "Nivel 2"). Es independiente del
    // rol del sistema (ver abajo): diferencia la especialidad del agente,
    // no lo que puede hacer en la herramienta.
    nivelServicio:  { type : String, maxLength: 80, required: true, unique: false },
    telefono : { type : String, required: true, unique: false },
    correo: { type : String, maxLength: 120, required: true, unique: false },
    usuario: { type : String, maxLength: 20, required: true, unique: true },
    // El agente ahora inicia sesión con su propia cuenta. Sin contraseña
    // (agentes migrados antes de este cambio) simplemente no puede loguearse
    // hasta que el administrador le asigne una editando su ficha.
    password: { type: String, required: false },
    // Rol del sistema para ESTE agente al iniciar sesión:
    // - Agente: solo ve y gestiona (resuelve) los tickets que tiene asignados.
    // - Calldispatcher: además puede asignar casos a otros agentes.
    // - Administrador: control total de la herramienta.
    rol: { type: String, enum: ["Agente", "Calldispatcher", "Administrador"], required: true, default: "Agente" },
    // Permite al administrador inactivar al agente sin borrarlo. Un agente
    // inactivo no aparece en el desplegable de asignación de tickets ni
    // puede iniciar sesión.
    activo: { type: Boolean, required: true, default: true },
    // "Olvidé mi contraseña" (mismo mecanismo que ClienteModelo)
    resetPasswordToken: { type: String, required: false },
    resetPasswordExpira: { type: Date, required: false }
});

module.exports = mongoose.model("agentes", agenteSchema);