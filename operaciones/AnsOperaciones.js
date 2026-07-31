const ansModelo = require("../modelos/AnsModelo");
const ansOperaciones = {}


ansOperaciones.crearAns = async (req, res) => {
    try {
        const body = req.body;
        const ans = new ansModelo(body);
        const ansGuardado = await ans.save();
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
        }
        const ansActualizado = await ansModelo.findByIdAndUpdate(id, datosActualizar, { new: true });
        if (ansActualizado != null) {
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
            res.status(200).send(ans);
        } else {
            res.status(404).send("No hay datos");
        }
    } catch (error) {
        res.status(400).send("Mala petición. " + error);
    }
}

module.exports = ansOperaciones;