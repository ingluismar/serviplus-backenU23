const clienteOperaciones = require("../operaciones/ClienteOperaciones");
const router = require("express").Router();

router.get("/", clienteOperaciones.buscarClientes);
router.get("/:id", clienteOperaciones.buscarCliente);
router.post("/", clienteOperaciones.crearCliente);
router.put("/:id", clienteOperaciones.modificarCliente);
router.delete("/:id", clienteOperaciones.borrarCliente);

module.exports = router;