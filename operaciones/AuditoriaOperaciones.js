const auditoriaModelo = require("../modelos/AuditoriaModelo");
const auditoriaOperaciones = {};

// Log de auditoría: solo lectura desde la API (no hay crearAuditoria,
// modificarAuditoria ni borrarAuditoria expuestos). Los registros los crea
// exclusivamente el propio backend, desde código de servidor de confianza
// (ver servicios/auditoriaServicio.js), nunca a partir de datos que llegan
// en un request; así ningún cliente -ni siquiera un administrador- puede
// falsificar, alterar o borrar la evidencia de auditoría vía API.
auditoriaOperaciones.buscarAuditorias = async (req, res) => {
    try {
        const { q, evento, resultado, usuario, desde, hasta } = req.query;
        const filtro = {};

        if (evento) {
            filtro.evento = evento;
        }
        if (resultado) {
            filtro.resultado = resultado;
        }
        if (usuario) {
            filtro["usuario.correo"] = { $regex: usuario, $options: "i" };
        }
        if (desde || hasta) {
            filtro.fecha = {};
            if (desde) filtro.fecha.$gte = new Date(desde);
            if (hasta) filtro.fecha.$lte = new Date(hasta);
        }
        if (q) {
            filtro["$or"] = [
                { "usuario.nombres": { $regex: q, $options: "i" } },
                { "usuario.correo": { $regex: q, $options: "i" } },
                { "descripcion": { $regex: q, $options: "i" } },
                { "evento": { $regex: q, $options: "i" } },
                { "ip": { $regex: q, $options: "i" } },
                { "entidadAfectada.referencia": { $regex: q, $options: "i" } }
            ];
        }

        const registros = await auditoriaModelo.find(filtro).sort({ fecha: -1 });
        if (registros.length > 0) {
            res.status(200).send(registros);
        } else {
            res.status(404).send("No hay registros de auditoría para estos filtros");
        }
    } catch (error) {
        res.status(400).send("Mala petición. " + error);
    }
};

auditoriaOperaciones.buscarAuditoria = async (req, res) => {
    try {
        const registro = await auditoriaModelo.findById(req.params.id);
        if (registro != null) {
            res.status(200).send(registro);
        } else {
            res.status(404).send("No hay datos");
        }
    } catch (error) {
        res.status(400).send("Mala petición. " + error);
    }
};

module.exports = auditoriaOperaciones;
