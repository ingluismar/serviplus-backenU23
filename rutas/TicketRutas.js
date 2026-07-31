const ticketOperaciones = require("../operaciones/TicketOperaciones");
const subirAdjunto = require("../middlewares/subirAdjunto");
const router = require("express").Router();

// Envuelve multer para responder con un error controlado (400) en vez de dejarlo pasar sin manejar
const cargarAdjunto = (req, res, next) => {
    subirAdjunto.single("archivo")(req, res, (error) => {
        if (error) {
            return res.status(400).send("Archivo inválido. " + error.message);
        }
        next();
    });
};

router.get("/", ticketOperaciones.buscarTickets);
router.get("/:id", ticketOperaciones.buscarTicket);
router.get("/:id/adjunto", ticketOperaciones.verAdjunto);
router.post("/", cargarAdjunto, ticketOperaciones.crearTicket);
router.put("/:id", cargarAdjunto, ticketOperaciones.modificarTicket);
router.delete("/:id", ticketOperaciones.borrarTicket);

module.exports = router;