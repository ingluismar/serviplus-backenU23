const LoginOperaciones = require("../operaciones/LoginOperaciones");
const router = require('express').Router();

router.post("/", LoginOperaciones.login);
router.post("/recuperar", LoginOperaciones.solicitarRecuperacion);
router.post("/restablecer", LoginOperaciones.restablecerPassword);

module.exports = router
