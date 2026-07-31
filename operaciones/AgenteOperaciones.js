const agenteModelo = require("../modelos/AgentesModelo");
const agenteOperaciones = {}




agenteOperaciones.crearAgente = async (req, res) => {
    try {
        const body = req.body;
        const agente = new agenteModelo(body);
        const agenteGuardado = await agente.save();
        res.status(201).send(agenteGuardado);
    } catch (error) {
        res.status(400).json(error);
    }
}

agenteOperaciones.buscarAgentes = async (req, res) => {
    try {
        const query = req.query;
        let listaagentes;
        if (query.q != null) {
            listaagentes = await agenteModelo.find({
                "$or": [
                    { "nombres": { $regex: query.q, $options: "i"}},
                    { "apellidos": { $regex: query.q, $options: "i"}},
                    { "documento": { $regex: query.q, $options: "i"}},
                    { "usuario": { $regex: query.q, $options: "i"}}
                ]
            });
        }
        else {
            listaagentes = await agenteModelo.find(query);
        }
        if (listaagentes.length > 0) {
            res.status(200).send(listaagentes);

        } else {
            res.status(404).send("No hay datos");
        }
    } catch (error) {
        res.status(400).send("Mala petición. " + error);
    }
}

agenteOperaciones.buscarAgente = async (req, res) => {
    try {
        const id = req.params.id;
        const agente = await agenteModelo.findById(id);
        if (agente != null) {
            res.status(200).send(agente);
        } else {
            res.status(404).send("No hay datos");
        }
    } catch (error) {
        res.status(400).send("Mala petición. " + error);
    }
}

agenteOperaciones.modificarAgente = async (req, res) => {
    try {
        const id = req.params.id;
        const body = req.body;
        
        const datosActualizar = {
            nombres: body.nombres,
            apellidos: body.apellidos,
            documento: body.documento,
            rol: body.rol,
            telefono: body.telefono,
            correo: body.correo,
            usuario: body.usuario
        }
        const agenteActualizado = await agenteModelo.findByIdAndUpdate(id, datosActualizar, { new: true });
        if (agenteActualizado != null) {
            res.status(200).send(agenteActualizado);
        }
        else {
            res.status(404).send("No hay datos");
        }
    } catch (error) {
        res.status(400).send("Mala petición. " + error);
    }
}




agenteOperaciones.borrarAgente = async (req, res) => {
    try {
        const id = req.params.id;
        const agente = await agenteModelo.findByIdAndDelete(id);
        if (agente != null) {
            res.status(200).send(agente);
        } else {
            res.status(404).send("No hay datos");
        }
    } catch (error) {
        res.status(400).send("Mala petición. " + error);
    }
}

module.exports = agenteOperaciones;