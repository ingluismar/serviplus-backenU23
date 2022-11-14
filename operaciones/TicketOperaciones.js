const ticketModelo = require("../modelos/TicketModelo");
const ticketOperaciones = {}

ticketOperaciones.crearTicket = async (req, res) => {
    try {
        const objeto = req.body;
        console.log(objeto);
        const ticket = new ticketModelo(objeto);
        const ticketGuardado = await ticket.save();
        res.status(201).send(ticketGuardado);
    } catch (error) {
        res.status(400).send("Mala petición. " + error);
    }
}

ticketOperaciones.buscarTickets = async (req, res) => {
    try {
        const filtro = req.query;
        let listatickets;
        if (filtro.q != null) {
            listatickets = await ticketModelo.find({
                "$or": [
                    { "asunto": { $regex: filtro.q, $options: "i" } },
                    { "solicitud": { $regex: filtro.q, $options: "i" } }
                ]
            });
        }
        else {
            listatickets = await ticketModelo.find(filtro);
        }
        if (listatickets.length > 0) {
            res.status(200).send(listatickets);
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
            res.status(200).send(ticket);
        } else {
            res.status(404).send("No hay datos");
        }
    } catch (error) {
        res.status(400).send("Mala petición. " + error);
    }
}

ticketOperaciones.modificarTicket = async (req, res) => {
    try {
        const id = req.params.id;
        const body = req.body;
        const datosActualizar = {

            asunto: body.asunto,
            solicitud: body.solicitud,
            agente: body.agente,
            estadotk: body.estadotk,
            cierre: body.cierre,
            fechaCierre: body.fechaCierre
        }
        const ticketActualizado = await ticketModelo.findByIdAndUpdate(id, datosActualizar, { new: true });
        if (ticketActualizado != null) {
            res.status(200).send(ticketActualizado);
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