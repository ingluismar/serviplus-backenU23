const mongoose = require("mongoose");


const TicketSchema = mongoose.Schema({

    numeracionTicket: { type: String, required: true, unique: true },
    cliente: { type: mongoose.Schema.Types.ObjectId, ref: "clientes", required: false },
    fecha:  { type: Date, default: Date.now, required: false, unique: false },
    asunto: { type: String, maxLength: 150, required: true, unique: false },
    // Clasificación ITIL: el cliente elige entre reportar una falla (Incidente)
    // o pedir algo nuevo (Requerimiento/Service Request).
    tipo: { type: String, enum: ["Incidente", "Requerimiento"], required: true },
    // Tipificación concreta bajo el tipo elegido. Se presenta al cliente en
    // lenguaje amigable (con ejemplos) pero se guarda como concepto concreto.
    categoria: {
        type: String,
        enum: [
            "Hardware", "Software", "Redes e Internet",
            "Accesos y permisos", "Instalación y configuración", "Equipo y suministros", "Información y otros"
        ],
        required: true
    },
    solicitud: { type: String, maxLength: 400, required: true, unique: false },
    agente: { type: String, maxLength: 50, required: false, unique: false },
    // Trazabilidad de la asignación: quién asignó el agente y cuándo, para que
    // no exista repudio (el agente no puede alegar que nadie se lo asignó, y
    // queda registrado qué Administrador/Calldispatcher tomó la decisión).
    // Se recalcula cada vez que "agente" cambia (ver TicketOperaciones.modificarTicket).
    asignadoPor: {
        id: { type: String, required: false },
        nombres: { type: String, required: false },
        correo: { type: String, required: false }
    },
    fechaAsignacion: { type: Date, required: false },
    estadotk: { type: String, maxLength: 50, required: false, unique: false },
    cierre: { type: String, maxLength: 400, required: false, unique: false },
    fechaCierre:  { type: Date, required: false, unique: false },
    motivoSuspension: { type: String, maxLength: 400, required: false, unique: false },
    // Nivel de impacto ITIL: qué tan grave es el efecto del incidente sobre el
    // negocio (alcance de usuarios/servicios afectados). Lo define el
    // dispatcher/agente al triar el caso, es independiente del ANS (urgencia).
    impacto: { type: String, enum: ["Alto", "Medio", "Bajo"], required: false, unique: false },
    // Prioridad del ticket: se sugiere en el frontend a partir de impacto ×
    // esVip, pero el dispatcher/agente la asigna/ajusta manualmente al triar
    // (igual que impacto). Es para priorizar y reportar (dashboard, cola de
    // trabajo) — el ANS no depende de este campo, depende de esVip (ver
    // AnsModelo y TicketOperaciones.calcularEstadoAns).
    prioridad: { type: String, enum: ["Critica", "Alta", "Media", "Baja"], required: false, unique: false },
    // Copiado de Cliente.esVip al crear el ticket (ver crearTicket), para que
    // el ticket conserve su condición aunque el cliente cambie después, y el
    // dispatcher pueda corregirlo puntualmente sin tocar el maestro de clientes.
    // Determina qué ANS aplica: si es true y hay un ANS "vip" parametrizado
    // (ver AnsModelo), se usa ese en vez del estándar.
    esVip: { type: Boolean, required: false, default: false, unique: false },
    // Marca desde cuándo el ticket está en el estado actual (estadotk).
    // Se usa para calcular, al momento del próximo cambio de estado, cuántos
    // minutos reales acumula ese estado.
    estadoDesde: { type: Date, required: false, unique: false },
    // Minutos acumulados y "congelados" en cada estado por el que ya pasó el ticket.
    // No incluye el tramo del estado actual, que sigue corriendo (se calcula al vuelo).
    tiempos: {
        pendiente: { type: Number, default: 0, min: 0 },
        proceso: { type: Number, default: 0, min: 0 },
        suspendido: { type: Number, default: 0, min: 0 }
    },
    adjunto: {
        nombreOriginal: { type: String, required: false },
        nombreArchivo: { type: String, required: false },
        tipo: { type: String, required: false },
        tamano: { type: Number, required: false }
    }
});

module.exports = mongoose.model("tickets", TicketSchema);