const personalOperaciones = require("../operaciones/PersonalOperaciones");
const router = require("express").Router();

router.get("/", personalOperaciones.crearPersonal);
router.get("/:id", personalOperaciones.buscarPersonal);
router.post("/", personalOperaciones.crearPersonal);
router.put("/:id", personalOperaciones.modificarPersonal);
router.delete("/:id", personalOperaciones.borrarPersonal);

module.exports = router;