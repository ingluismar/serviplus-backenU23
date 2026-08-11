const ansModelo = require("../modelos/AnsModelo");
const auditoriaServicio = require("../servicios/auditoriaServicio");
const { EVENTOS_AUDITORIA } = auditoriaServicio;
const ansOperaciones = {}


ansOperaciones.crearAns = async (req, res) => {
    try {
        const body = req.body;
        const ans = new ansModelo(body);
        const ansGuardado = await ans.save();

        auditoriaServicio.registrar(req, {
            evento: EVENTOS_AUDITORIA.CREACION_ANS,
            modulo: "ANS",
            descripcion: "Creación de parametrización de ANS"
        });

        res.status(201).send(ansGuardado);
    } catch (error) {
        res.status(400).json(error);
    }
}

ansOperaciones.buscarAnss = async (req, res) => {
    try {
        const query = req.query;
        let listaans;
        if (query.q != null) {
            listaans = await ansModelo.find({
                "$or": [
                    { "proceso": { $regex: query.q, $options: "i"}},
                    { "pendiente": { $regex: query.q, $options: "i"}},
                    { "solucionado": { $regex: query.q, $options: "i"}}
                ]
            });
        }
        else {
            listaans = await ansModelo.find(query);
        }
        if (listaans.length > 0) {
            res.status(200).send(listaans);

        } else {
            res.status(404).send("No hay datos");
        }
    } catch (error) {
        res.status(400).send("Mala petición. " + error);
    }
}

ansOperaciones.buscarAns = async (req, res) => {
    try {
        const id = req.params.id;
        const ans = await ansModelo.findById(id);
        if (ans != null) {
            res.status(200).send(ans);
        } else {
            res.status(404).send("No hay datos");
        }
    } catch (error) {
        res.status(400).send("Mala petición. " + error);
    }
}

ansOperaciones.modificarAns = async (req, res) => {
    try {
        const id = req.params.id;
        const body = req.body;

        const datosActualizar = {
            pendiente: body.pendiente,
            proceso: body.proceso,
            solucionado: body.solucionado,
            vip: body.vip
        }
        const ansActualizado = await ansModelo.findByIdAndUpdate(id, datosActualizar, { new: true, runValidators: true });
        if (ansActualizado != null) {
            let descripcion = `Modificación de parametrización de ANS (estándar — pendiente: ${ansActualizado.pendiente}h, proceso: ${ansActualizado.proceso}h, solucionado: ${ansActualizado.solucionado}h)`;
            if (ansActualizado.vip) {
                descripcion += ` (VIP — pendiente: ${ansActualizado.vip.pendiente}h, proceso: ${ansActualizado.vip.proceso}h, solucionado: ${ansActualizado.vip.solucionado}h)`;
            }
            auditoriaServicio.registrar(req, {
                evento: EVENTOS_AUDITORIA.MODIFICACION_ANS,
                modulo: "ANS",
                descripcion
            });
            res.status(200).send(ansActualizado);
        }
        else {
            res.status(404).send("No hay datos");
        }
    } catch (error) {
        res.status(400).send("Mala petición. " + error);
    }
}




ansOperaciones.borrarAns = async (req, res) => {
    try {
        const id = req.params.id;
        const ans = await ansModelo.findByIdAndDelete(id);
        if (ans != null) {
            auditoriaServicio.registrar(req, {
                evento: EVENTOS_AUDITORIA.ELIMINACION_ANS,
                modulo: "ANS",
                descripcion: "Eliminación de parametrización de ANS"
            });
            res.status(200).send(ans);
        } else {
            res.status(404).send("No hay datos");
        }
    } catch (error) {
        res.status(400).send("Mala petición. " + error);
    }
}

module.exports = ansOperaciones;