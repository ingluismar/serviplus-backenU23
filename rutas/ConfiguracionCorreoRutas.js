const configuracionCorreoOperaciones = require("../operaciones/ConfiguracionCorreoOperaciones");
const verificarToken = require("../middlewares/verificarToken");
const requiereAdmin = require("../middlewares/requiereAdmin");
const requiereModulo = require("../middlewares/requiereModulo");
const router = require("express").Router();

// A diferencia de ANS, esta configuración sí incluye datos sensibles (host y
// usuario de la cuenta de correo) — aunque la contraseña nunca sale en
// claro (ver ConfiguracionCorreoOperaciones), hasta la lectura exige sesión
// de administrador. Módulo "correo" del licenciamiento: es de plan
// Enterprise (ver utilidades/licencia.js) — sin esa licencia, el envío de
// notificaciones (recuperación de contraseña, ticket creado) sigue
// funcionando con la configuración por defecto, solo no se puede
// personalizar la cuenta SMTP desde esta pantalla.
router.get("/", verificarToken, requiereAdmin, requiereModulo("correo"), configuracionCorreoOperaciones.buscarConfiguracion);
router.put("/", verificarToken, requiereAdmin, requiereModulo("correo"), configuracionCorreoOperaciones.guardarConfiguracion);
router.post("/probar", verificarToken, requiereAdmin, requiereModulo("correo"), configuracionCorreoOperaciones.enviarCorreoPrueba);

module.exports = router;
