const path = require("path");
const fs = require("fs");
const ticketModelo = require("../modelos/TicketModelo");
const ansModelo = require("../modelos/AnsModelo");
const clienteModelo = require("../modelos/ClienteModelo");
const correoServicio = require("../servicios/correoServicio");
const ticketOperaciones = {}

const CARPETA_ADJUNTOS = path.join(__dirname, "..", "uploads", "tickets");

// Traduce el texto libre de estadotk al campo correspondiente del ANS
const normalizarEstadoAns = (estadotk) => {
    if (!estadotk) return null;
    const valor = estadotk.toString().trim().toLowerCase();
    if (valor.includes("pendiente")) return "pendiente";
    if (valor.includes("proceso")) return "proceso";
    if (valor.includes("solucionado")) return "solucionado";
    return null;
};

// Calcula fecha límite, minutos restantes y si el ticket ya venció según el ANS configurado
const calcularEstadoAns = (ticket, ansConfig) => {
    const estado = normalizarEstadoAns(ticket.estadotk);
    if (!estado || !ansConfig || ansConfig[estado] == null || !ticket.fecha) {
        return { fechaLimite: null, tiempoRestanteMin: null, vencido: null };
    }

    const horas = ansConfig[estado];
    const fechaLimite = new Date(ticket.fecha.getTime() + horas * 60 * 60 * 1000);
    // Si ya se solucionó, se valida contra el momento del cierre; si no, contra ahora
    const referencia = (estado === "solucionado" && ticket.fechaCierre) ? ticket.fechaCierre : new Date();
    const tiempoRestanteMin = Math.round((fechaLimite - referencia) / 60000);

    return {
        fechaLimite,
        tiempoRestanteMin,
        vencido: tiempoRestanteMin <= 0
    };
};

// Adjunta los campos calculados de ANS a uno o varios tickets
const adjuntarEstadoAns = async (tickets) => {
    const ansConfig = await ansModelo.findOne();
    const lista = Array.isArray(tickets) ? tickets : [tickets];
    const resultado = lista.map((ticket) => {
        const plano = ticket.toObject();
        return { ...plano, ...calcularEstadoAns(ticket, ansConfig), ...calcularTiemposEnVivo(ticket) };
    });
    return Array.isArray(tickets) ? resultado : resultado[0];
};

// Relaciona cada estado "abierto" del ticket con la clave del acumulador de tiempos.
// "Solucionado" es terminal: no tiene tramo propio que siga corriendo.
const CLAVE_TIEMPO_POR_ESTADO = {
    "Pendiente": "pendiente",
    "En proceso": "proceso",
    "Suspendido": "suspendido"
};

// Reglas de transición para el nuevo estado Suspendido: solo se puede suspender
// un ticket que esté "En proceso", y desde Suspendido solo se puede reanudar
// (volver a "En proceso"); no se permite saltar directo a Solucionado.
const esTransicionValida = (estadoAnterior, estadoNuevo) => {
    if (estadoNuevo === "Suspendido") return estadoAnterior === "En proceso";
    if (estadoAnterior === "Suspendido") return estadoNuevo === "En proceso";
    return true;
};

// Cuando el ticket cambia de estado, cierra el tramo del estado saliente:
// calcula cuántos minutos reales duró y los suma al acumulador correspondiente.
// Devuelve los campos a persistir, o null si el estado no cambió.
const calcularTransicionEstado = (ticketActual, estadoNuevo, ahora) => {
    const estadoAnterior = ticketActual.estadotk;
    if (!estadoNuevo || estadoNuevo === estadoAnterior) {
        return null;
    }

    // Punto de partida del tramo que se cierra: estadoDesde si existe, o la fecha
    // de creación para tickets antiguos que todavía no tienen ese campo.
    const inicioTramo = ticketActual.estadoDesde || ticketActual.fecha || ahora;
    const claveAnterior = CLAVE_TIEMPO_POR_ESTADO[estadoAnterior];

    const tiempos = {
        pendiente: ticketActual.tiempos?.pendiente || 0,
        proceso: ticketActual.tiempos?.proceso || 0,
        suspendido: ticketActual.tiempos?.suspendido || 0
    };

    if (claveAnterior) {
        const minutosTramo = Math.max(0, Math.round((ahora - new Date(inicioTramo)) / 60000));
        tiempos[claveAnterior] += minutosTramo;
    }

    return { estadoDesde: ahora, tiempos };
};

// Suma los minutos ya acumulados más el tramo del estado actual en curso (si el
// ticket sigue abierto) para tener el tiempo real hasta este instante.
// El tiempo total de atención excluye el tiempo suspendido (es una pausa, no
// tiempo de trabajo) y deja de crecer solo una vez el ticket queda Solucionado.
const calcularTiemposEnVivo = (ticket) => {
    const tiempos = {
        pendiente: ticket.tiempos?.pendiente || 0,
        proceso: ticket.tiempos?.proceso || 0,
        suspendido: ticket.tiempos?.suspendido || 0
    };

    const claveActual = CLAVE_TIEMPO_POR_ESTADO[ticket.estadotk];
    const inicioTramo = ticket.estadoDesde || ticket.fecha;
    if (claveActual && inicioTramo) {
        tiempos[claveActual] += Math.max(0, Math.round((new Date() - new Date(inicioTramo)) / 60000));
    }

    return { tiempos, tiempoTotalAtencion: tiempos.pendiente + tiempos.proceso };
};

// Suma los tiempos (en horas) configurados para cada estado del ANS, es decir,
// el tiempo total estimado para gestionar un ticket de principio a fin
const calcularTiempoTotalAns = (ansConfig) => {
    if (!ansConfig) return null;
    return (ansConfig.pendiente || 0) + (ansConfig.proceso || 0) + (ansConfig.solucionado || 0);
};

// Da un formato legible en español a un total de horas (ej. "1 día y 4 horas")
const formatearTiempoEstimado = (horas) => {
    if (horas == null) return "el tiempo estimado según nuestros acuerdos de servicio";

    const dias = Math.floor(horas / 24);
    const horasRestantes = horas % 24;

    if (dias === 0) return `${horasRestantes} hora${horasRestantes === 1 ? "" : "s"}`;
    if (horasRestantes === 0) return `${dias} día${dias === 1 ? "" : "s"}`;
    return `${dias} día${dias === 1 ? "" : "s"} y ${horasRestantes} hora${horasRestantes === 1 ? "" : "s"}`;
};

// Envía el correo de notificación de ticket creado al cliente asociado.
// Se ejecuta sin bloquear la respuesta HTTP y aísla sus propios errores
// para que un fallo en el envío nunca afecte la creación del ticket.
const enviarNotificacionTicketCreado = async (ticket) => {
    try {
        if (!ticket.cliente) return;

        const cliente = await clienteModelo.findById(ticket.cliente);
        if (!cliente || !cliente.correo) return;

        const ansConfig = await ansModelo.findOne();
        const tiempoTotal = calcularTiempoTotalAns(ansConfig);

        await correoServicio.enviarCorreoTicketCreado(
            cliente.correo,
            ticket.numeracionTicket,
            formatearTiempoEstimado(tiempoTotal)
        );
    } catch (errorCorreo) {
        console.log("Error al enviar correo de creación de ticket:", errorCorreo);
    }
};

ticketOperaciones.crearTicket = async (req, res) => {
    try {
        const nuevoTicketData = req.body;

        // Determinar el siguiente número de ticket comparando los números reales,
        // no el texto (numeracionTicket tiene anchos inconsistentes: "SD-003" vs "SD-0010")
        const todosLosTickets = await ticketModelo.find({}, "numeracionTicket");
        const ultimoNumero = todosLosTickets.reduce((maximo, t) => {
            const match = t.numeracionTicket.match(/(\d+)$/);
            const numero = match ? parseInt(match[1], 10) : 0;
            return Math.max(maximo, numero);
        }, 0);

        // Generar el próximo número de ticket con ancho fijo
        const nuevoNumeroTicket = ultimoNumero + 1;
        const numeracionTicket = `SD-${String(nuevoNumeroTicket).padStart(3, "0")}`;

        // Asegurarse de que el campo numeracionTicket esté presente en nuevoTicketData
        nuevoTicketData.numeracionTicket = numeracionTicket;

        // El cronómetro del estado inicial (Pendiente) arranca en el momento de creación
        nuevoTicketData.estadoDesde = nuevoTicketData.estadoDesde || new Date();

        // Si se subió un archivo, guardar solo la referencia (el binario ya quedó en /uploads/tickets)
        if (req.file) {
            nuevoTicketData.adjunto = {
                nombreOriginal: req.file.originalname,
                nombreArchivo: req.file.filename,
                tipo: req.file.mimetype,
                tamano: req.file.size
            };
        }

        // Crear el nuevo ticket con el número asignado
        const nuevoTicket = new ticketModelo(nuevoTicketData);

        // Guardar el nuevo ticket en la base de datos
        const ticketGuardado = await nuevoTicket.save();

        res.status(201).send(await adjuntarEstadoAns(ticketGuardado));

        // Notifica al cliente por correo (no se espera su resultado para no retrasar la respuesta)
        enviarNotificacionTicketCreado(ticketGuardado);

    } catch (error) {
       
        res.status(400).send("Mala petición. " + error);
    }
};

ticketOperaciones.buscarTickets = async (req, res) => {
    try {
        const filtro = req.query;
        let listatickets;

        if (filtro.q != null) {
            listatickets = await ticketModelo.find({
                "$or": [
                    { "numeracionTicket": { $regex: filtro.q, $options: "i" } },
                    { "asunto": { $regex: filtro.q, $options: "i" } },
                    { "solicitud": { $regex: filtro.q, $options: "i" } },
                    { "estadotk": { $regex: filtro.q, $options: "i" } },
                    { "tipo": { $regex: filtro.q, $options: "i" } },
                    { "categoria": { $regex: filtro.q, $options: "i" } }

                ]
            });
        } else {
            listatickets = await ticketModelo.find(filtro);
        }

        if (listatickets.length > 0) {
            res.status(200).send(await adjuntarEstadoAns(listatickets));
        } else {
            res.status(404).send("No hay datos");
        }
    } catch (error) {
        res.status(400).send("Mala petición. " + error);
    }
}

ticketOperaciones.buscarTicket = async (req, res) => {
    try {
        const id = req.params.id;
        const ticket = await ticketModelo.findById(id);
        if (ticket != null) {
            res.status(200).send(await adjuntarEstadoAns(ticket));
        } else {
            res.status(404).send("No hay datos");
        }
    } catch (error) {
        res.status(400).send("Mala petición. " + error);
    }
}

ticketOperaciones.verAdjunto = async (req, res) => {
    try {
        const id = req.params.id;
        const ticket = await ticketModelo.findById(id);
        if (!ticket || !ticket.adjunto || !ticket.adjunto.nombreArchivo) {
            return res.status(404).send("Este ticket no tiene un archivo adjunto");
        }

        const rutaArchivo = path.join(CARPETA_ADJUNTOS, ticket.adjunto.nombreArchivo);
        if (!fs.existsSync(rutaArchivo)) {
            return res.status(404).send("El archivo adjunto ya no está disponible");
        }

        const nombreSeguro = ticket.adjunto.nombreOriginal.replace(/["\r\n]/g, "");
        res.setHeader("Content-Type", ticket.adjunto.tipo);
        res.setHeader("Content-Disposition", `inline; filename="${nombreSeguro}"`);
        res.sendFile(rutaArchivo);
    } catch (error) {
        res.status(400).send("Mala petición. " + error);
    }
}

ticketOperaciones.modificarTicket = async (req, res) => {
    try {
        const id = req.params.id;
        const body = req.body;

        const ticketActual = await ticketModelo.findById(id);
        if (ticketActual == null) {
            return res.status(404).send("No hay datos");
        }

        if (body.estadotk && body.estadotk !== ticketActual.estadotk && !esTransicionValida(ticketActual.estadotk, body.estadotk)) {
            return res.status(400).send(`No se puede pasar de "${ticketActual.estadotk}" a "${body.estadotk}" directamente.`);
        }

        const datosActualizar = {

            asunto: body.asunto,
            solicitud: body.solicitud,
            agente: body.agente,
            estadotk: body.estadotk,
            cierre: body.cierre,
            fechaCierre: body.fechaCierre,
            motivoSuspension: body.motivoSuspension,
            impacto: body.impacto
        }

        // Si el estado cambia, cierra el tramo del estado saliente y acumula sus minutos
        const transicion = calcularTransicionEstado(ticketActual, body.estadotk, new Date());
        if (transicion) {
            datosActualizar.estadoDesde = transicion.estadoDesde;
            datosActualizar.tiempos = transicion.tiempos;
        }

        // Si se subió un archivo nuevo, reemplaza la referencia del adjunto
        if (req.file) {
            datosActualizar.adjunto = {
                nombreOriginal: req.file.originalname,
                nombreArchivo: req.file.filename,
                tipo: req.file.mimetype,
                tamano: req.file.size
            };
        }

        const ticketActualizado = await ticketModelo.findByIdAndUpdate(id, datosActualizar, { new: true });
        if (ticketActualizado != null) {
            res.status(200).send(await adjuntarEstadoAns(ticketActualizado));
        }
        else {
            res.status(404).send("No hay datos");
        }
    } catch (error) {
        res.status(400).send("Mala petición. " + error);
    }
}

ticketOperaciones.borrarTicket = async (req, res) => {
    try {
        const id = req.params.id;
        const ticket = await ticketModelo.findByIdAndDelete(id);
        if (ticket != null) {
            res.status(200).send(ticket);
        } else {
            res.status(404).send("No hay datos");
        }
    } catch (error) {
        res.status(400).send("Mala petición. " + error);
    }
}

module.exports = ticketOperaciones;