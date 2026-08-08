const agenteOperaciones = require("../operaciones/AgenteOperaciones");
const verificarToken = require("../middlewares/verificarToken");
const requiereAdmin = require("../middlewares/requiereAdmin");
const router = require("express").Router();

// Ver el listado de agentes lo necesitan tanto el Administrador como el
// Calldispatcher (para poder asignarles casos); crear/editar/borrar agentes
// sigue siendo exclusivo del administrador.
const permiteVerAgentes = (req, res, next) => {
    if (req.usuario?.rol !== "Administrador" && req.usuario?.rol !== "Calldispatcher") {
        return res.status(403).send("No tienes permisos para ver el listado de agentes.");
    }
    next();
};

router.get("/", verificarToken, permiteVerAgentes, agenteOperaciones.buscarAgentes);
router.get("/:id", verificarToken, permiteVerAgentes, agenteOperaciones.buscarAgente);
router.post("/", verificarToken, requiereAdmin, agenteOperaciones.crearAgente);
router.put("/:id", verificarToken, requiereAdmin, agenteOperaciones.modificarAgente);
router.delete("/:id", verificarToken, requiereAdmin, agenteOperaciones.borrarAgente);

module.exports = router;
