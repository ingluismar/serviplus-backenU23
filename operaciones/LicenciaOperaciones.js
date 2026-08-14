const licenciaServicio = require("../servicios/licenciaServicio");
const auditoriaServicio = require("../servicios/auditoriaServicio");
const { EVENTOS_AUDITORIA } = auditoriaServicio;
const licenciaOperaciones = {};

licenciaOperaciones.obtenerEstado = async (req, res) => {
    try {
        const estado = await licenciaServicio.obtenerEstado({ forzar: true });
        res.status(200).send(estado);
    } catch (error) {
        res.status(400).send("Mala petición. " + error);
    }
};

// Recibe el archivo .lic tal cual (el frontend solo lo lee y lo manda como
// JSON, ver ConfiguracionLicenciaServicios.js) y lo guarda si su firma es
// auténtica. No exige que venga vigente -se puede cargar una que ya
// llegue vencida-, la vigencia se evalúa aparte en cada consulta.
licenciaOperaciones.cargarLicencia = async (req, res) => {
    try {
        const licenciaCruda = req.body;
        const resultado = await licenciaServicio.cargarLicencia(licenciaCruda);
        if (!resultado.ok) {
            return res.status(400).send(resultado.motivo || "La licencia no es válida.");
        }

        auditoriaServicio.registrar(req, {
            evento: EVENTOS_AUDITORIA.CARGA_LICENCIA,
            modulo: "Licencia",
            descripcion: `Carga de licencia (cliente: ${licenciaCruda?.datos?.cliente || "?"}, plan: ${licenciaCruda?.datos?.plan || "?"})`
        });

        const estado = await licenciaServicio.obtenerEstado({ forzar: true });
        res.status(200).send(estado);
    } catch (error) {
        res.status(400).send("Mala petición. " + error);
    }
};

module.exports = licenciaOperaciones;
