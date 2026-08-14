const ticketOperaciones = require("../operaciones/TicketOperaciones");
const subirAdjunto = require("../middlewares/subirAdjunto");
const verificarToken = require("../middlewares/verificarToken");
const requiereAdmin = require("../middlewares/requiereAdmin");
const requiereModulo = require("../middlewares/requiereModulo");
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
// Mismos datos que "/" (todos los tickets), pero exclusiva del Dashboard
// ITSM: exige el módulo "dashboard" de la licencia (Professional/Enterprise,
// ver utilidades/licencia.js) y sesión de Administrador. Va antes de "/:id"
// a propósito -si quedara después, Express interpretaría "analitica" como
// un :id y nunca llegaría hasta acá-.
router.get("/analitica", verificarToken, requiereAdmin, requiereModulo("dashboard"), ticketOperaciones.buscarTickets);
router.get("/:id", ticketOperaciones.buscarTicket);
router.get("/:id/adjunto", ticketOperaciones.verAdjunto);
router.post("/", cargarAdjunto, ticketOperaciones.crearTicket);
// Requiere sesión: modificarTicket necesita saber quién hace la petición
// (para permitir o no la asignación de agente y dejar constancia de quién la hizo)
router.put("/:id", verificarToken, cargarAdjunto, ticketOperaciones.modificarTicket);
router.delete("/:id", ticketOperaciones.borrarTicket);

module.exports = router;