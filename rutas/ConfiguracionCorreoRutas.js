const configuracionCorreoOperaciones = require("../operaciones/ConfiguracionCorreoOperaciones");
const verificarToken = require("../middlewares/verificarToken");
const requiereAdmin = require("../middlewares/requiereAdmin");
const router = require("express").Router();

// A diferencia de ANS, esta configuración sí incluye datos sensibles (host y
// usuario de la cuenta de correo) — aunque la contraseña nunca sale en
// claro (ver ConfiguracionCorreoOperaciones), hasta la lectura exige sesión
// de administrador.
router.get("/", verificarToken, requiereAdmin, configuracionCorreoOperaciones.buscarConfiguracion);
router.put("/", verificarToken, requiereAdmin, configuracionCorreoOperaciones.guardarConfiguracion);
router.post("/probar", verificarToken, requiereAdmin, configuracionCorreoOperaciones.enviarCorreoPrueba);

module.exports = router;
