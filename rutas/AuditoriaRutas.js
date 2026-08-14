const auditoriaOperaciones = require("../operaciones/AuditoriaOperaciones");
const verificarToken = require("../middlewares/verificarToken");
const requiereAdmin = require("../middlewares/requiereAdmin");
const requiereModulo = require("../middlewares/requiereModulo");
const router = require("express").Router();

// Únicamente lectura y únicamente Administrador: el log de auditoría es
// información sensible (quién hizo qué, desde qué IP) y, sobre todo, tiene
// que ser inmutable para servir como evidencia -por eso no hay rutas
// POST/PUT/DELETE aquí; los registros los crea solo el propio backend-.
// Módulo "auditoria" del licenciamiento: Basic no lo incluye (ver
// utilidades/licencia.js), así que además exige una licencia que sí lo traiga.
router.get("/", verificarToken, requiereAdmin, requiereModulo("auditoria"), auditoriaOperaciones.buscarAuditorias);
router.get("/:id", verificarToken, requiereAdmin, requiereModulo("auditoria"), auditoriaOperaciones.buscarAuditoria);

module.exports = router;
