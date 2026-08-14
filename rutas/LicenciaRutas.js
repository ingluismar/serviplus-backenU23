const licenciaOperaciones = require("../operaciones/LicenciaOperaciones");
const verificarToken = require("../middlewares/verificarToken");
const requiereAdmin = require("../middlewares/requiereAdmin");
const router = require("express").Router();

// Exclusivo de Administrador: incluye la huella de esta instalación (para
// pedirle a ServiPlus una licencia atada a ella) y el detalle del plan
// cargado. Ver middlewares/soloLecturaSiVencida.js: esta ruta queda exenta
// del modo de solo lectura, porque hay que poder cargar una licencia nueva
// incluso con la anterior vencida.
router.get("/", verificarToken, requiereAdmin, licenciaOperaciones.obtenerEstado);
router.put("/", verificarToken, requiereAdmin, licenciaOperaciones.cargarLicencia);

module.exports = router;
