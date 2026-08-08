const clienteOperaciones = require("../operaciones/ClienteOperaciones");
const verificarToken = require("../middlewares/verificarToken");
const requiereAdmin = require("../middlewares/requiereAdmin");
const router = require("express").Router();

// El registro sigue siendo público (cualquiera puede crear su cuenta de
// cliente); consultar/editar/borrar clientes es exclusivo del administrador.
router.post("/", clienteOperaciones.crearCliente);

router.get("/", verificarToken, requiereAdmin, clienteOperaciones.buscarClientes);
router.get("/:id", verificarToken, requiereAdmin, clienteOperaciones.buscarCliente);
router.put("/:id", verificarToken, requiereAdmin, clienteOperaciones.modificarCliente);
router.delete("/:id", verificarToken, requiereAdmin, clienteOperaciones.borrarCliente);

module.exports = router;
