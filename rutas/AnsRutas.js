const ansOperaciones = require("../operaciones/AnsOperaciones");
const verificarToken = require("../middlewares/verificarToken");
const requiereAdmin = require("../middlewares/requiereAdmin");
const router = require("express").Router();

// La lectura queda abierta (datos de configuración sin información
// personal); solo crear/editar/borrar la configuración del ANS requiere admin.
router.get("/", ansOperaciones.buscarAnss);
router.get("/:id", ansOperaciones.buscarAns);

router.post("/", verificarToken, requiereAdmin, ansOperaciones.crearAns);
router.put("/:id", verificarToken, requiereAdmin, ansOperaciones.modificarAns);
router.delete("/:id", verificarToken, requiereAdmin, ansOperaciones.borrarAns);

module.exports = router;
