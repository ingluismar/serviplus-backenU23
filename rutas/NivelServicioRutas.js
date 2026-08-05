const nivelServicioOperaciones = require("../operaciones/NivelServicioOperaciones");
const router = require("express").Router();

router.get("/", nivelServicioOperaciones.buscarNivelesServicio);
router.get("/:id", nivelServicioOperaciones.buscarNivelServicio);
router.post("/", nivelServicioOperaciones.crearNivelServicio);
router.put("/:id", nivelServicioOperaciones.modificarNivelServicio);
router.delete("/:id", nivelServicioOperaciones.borrarNivelServicio);

module.exports = router;
