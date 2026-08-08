const nivelServicioOperaciones = require("../operaciones/NivelServicioOperaciones");
const verificarToken = require("../middlewares/verificarToken");
const requiereAdmin = require("../middlewares/requiereAdmin");
const router = require("express").Router();

// La lectura queda abierta (catálogo sin datos sensibles, usado también por
// el formulario de agentes); solo crear/editar/borrar niveles requiere admin.
router.get("/", nivelServicioOperaciones.buscarNivelesServicio);
router.get("/:id", nivelServicioOperaciones.buscarNivelServicio);

router.post("/", verificarToken, requiereAdmin, nivelServicioOperaciones.crearNivelServicio);
router.put("/:id", verificarToken, requiereAdmin, nivelServicioOperaciones.modificarNivelServicio);
router.delete("/:id", verificarToken, requiereAdmin, nivelServicioOperaciones.borrarNivelServicio);

module.exports = router;
