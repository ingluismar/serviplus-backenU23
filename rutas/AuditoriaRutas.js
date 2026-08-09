const auditoriaOperaciones = require("../operaciones/AuditoriaOperaciones");
const verificarToken = require("../middlewares/verificarToken");
const requiereAdmin = require("../middlewares/requiereAdmin");
const router = require("express").Router();

// Únicamente lectura y únicamente Administrador: el log de auditoría es
// información sensible (quién hizo qué, desde qué IP) y, sobre todo, tiene
// que ser inmutable para servir como evidencia -por eso no hay rutas
// POST/PUT/DELETE aquí; los registros los crea solo el propio backend-.
router.get("/", verificarToken, requiereAdmin, auditoriaOperaciones.buscarAuditorias);
router.get("/:id", verificarToken, requiereAdmin, auditoriaOperaciones.buscarAuditoria);

module.exports = router;
