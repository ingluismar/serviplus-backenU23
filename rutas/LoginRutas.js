const LoginOperaciones = require("../operaciones/LoginOperaciones");
const router = require('express').Router();

router.post("/", LoginOperaciones.login);

module.exports = router
