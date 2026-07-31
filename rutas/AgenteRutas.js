const agenteOperaciones = require("../operaciones/AgenteOperaciones");
const router = require("express").Router();

router.get("/", agenteOperaciones.buscarAgentes);
router.get("/:id", agenteOperaciones.buscarAgente);
router.post("/", agenteOperaciones.crearAgente);
router.put("/:id", agenteOperaciones.modificarAgente);
router.delete("/:id", agenteOperaciones.borrarAgente);

module.exports = router;