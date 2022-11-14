const ticketOperaciones = require("../operaciones/TicketOperaciones");
const router = require("express").Router();

router.get("/", ticketOperaciones.buscarTickets);
router.get("/:id", ticketOperaciones.buscarTicket);
router.post("/", ticketOperaciones.crearTicket);
router.put("/:id", ticketOperaciones.modificarTicket);
router.delete("/:id", ticketOperaciones.borrarTicket);

module.exports = router;