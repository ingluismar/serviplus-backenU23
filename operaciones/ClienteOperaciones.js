const clienteModelo = require("../modelos/ClienteModelo");
const bcrypt = require("bcrypt");
const clienteOperaciones = {}

const cifrarPassword = async (password) => {
    const SALT_TIMES = 10;
    const salt = await bcrypt.genSalt(SALT_TIMES);
    return await bcrypt.hash(password, salt);
}



clienteOperaciones.crearCliente = async (req, res) => {
    try {
        const body = req.body;
        body.password = await cifrarPassword(body.password);
        const cliente = new clienteModelo(body);
        const clienteGuardado = await cliente.save();
        res.status(201).send(clienteGuardado);
    } catch (error) {
        res.status(400).json(error);
    }
}

clienteOperaciones.buscarClientes = async (req, res) => {
    try {
        const query = req.query;
        let listaclientes;
        if (query.q != null) {
            listaclientes = await clienteModelo.find({
                "$or": [
                    { "nombres": { $regex: query.q, $options: "i"}},
                    { "apellidos": { $regex: query.q, $options: "i"}},
                    { "documento": { $regex: query.q, $options: "i"}},
                    { "usuario": { $regex: query.q, $options: "i"}}
                ]
            });
        }
        else {
            listaclientes = await clienteModelo.find(query);
        }
        if (listaclientes.length > 0) {
            res.status(200).send(listaclientes);

        } else {
            res.status(404).send("No hay datos");
        }
    } catch (error) {
        res.status(400).send("Mala petición. " + error);
    }
}

clienteOperaciones.buscarCliente = async (req, res) => {
    try {
        const id = req.params.id;
        const cliente = await clienteModelo.findById(id);
        if (cliente != null) {
            res.status(200).send(cliente);
        } else {
            res.status(404).send("No hay datos");
        }
    } catch (error) {
        res.status(400).send("Mala petición. " + error);
    }
}

clienteOperaciones.modificarCliente = async (req, res) => {
    try {
        const id = req.params.id;
        const body = req.body;
        if (body.passw != null) {
            body.password = await cifrarPassword(body.password);
        }
        const datosActualizar = {
            nombres: body.nombres,
            apellidos: body.apellidos,
            direccion: body.direccion,
            telefono: body.telefono,
            correo: body.correo,
            usuario: body.usuario,
            password: body.password,
            es_admin: body.es_admin
        }
        const clienteActualizado = await clienteModelo.findByIdAndUpdate(id, datosActualizar, { new: true });
        if (clienteActualizado != null) {
            res.status(200).send(clienteActualizado);
        }
        else {
            res.status(404).send("No hay datos");
        }
    } catch (error) {
        res.status(400).send("Mala petición. " + error);
    }
}




clienteOperaciones.borrarCliente = async (req, res) => {
    try {
        const id = req.params.id;
        const cliente = await clienteModelo.findByIdAndDelete(id);
        if (cliente != null) {
            res.status(200).send(cliente);
        } else {
            res.status(404).send("No hay datos");
        }
    } catch (error) {
        res.status(400).send("Mala petición. " + error);
    }
}

module.exports = clienteOperaciones;