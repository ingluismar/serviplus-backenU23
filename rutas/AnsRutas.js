const ansOperaciones = require("../operaciones/AnsOperaciones");
const router = require("express").Router();

router.get("/", ansOperaciones.buscarAnss);
router.get("/:id", ansOperaciones.buscarAns);
router.post("/", ansOperaciones.crearAns);
router.put("/:id", ansOperaciones.modificarAns);
router.delete("/:id", ansOperaciones.borrarAns);

module.exports = router;