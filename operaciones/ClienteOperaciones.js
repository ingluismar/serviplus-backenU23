const clienteModelo = require("../modelos/ClienteModelo");
const bcrypt = require("bcrypt");
const auditoriaServicio = require("../servicios/auditoriaServicio");
const { EVENTOS_AUDITORIA } = auditoriaServicio;
const clienteOperaciones = {}

const cifrarPassword = async (password) => {
    const SALT_TIMES = 10;
    const salt = await bcrypt.genSalt(SALT_TIMES);
    return await bcrypt.hash(password, salt);
}

const ETIQUETAS_CAMPO = {
    nombres: "nombres",
    apellidos: "apellidos",
    documento: "documento",
    telefono: "teléfono",
    correo: "correo",
    usuario: "usuario",
    password: "contraseña",
    rol: "rol de usuario"
};

// Traduce los errores técnicos de Mongo/Mongoose a un mensaje claro para el usuario
const traducirErrorCliente = (error) => {
    if (error.code === 11000) {
        const campo = Object.keys(error.keyPattern || {})[0];
        const etiqueta = ETIQUETAS_CAMPO[campo] || campo;
        return `Ya existe un cliente registrado con ese ${etiqueta}. Verifica el dato e intenta de nuevo.`;
    }

    if (error.name === "ValidationError") {
        const primerError = Object.values(error.errors)[0];
        const etiqueta = ETIQUETAS_CAMPO[primerError.path] || primerError.path;

        if (primerError.kind === "maxlength") {
            return `El campo "${etiqueta}" no puede tener más de ${primerError.properties.maxlength} caracteres. Verifica el dato e intenta de nuevo.`;
        }
        if (primerError.kind === "required") {
            return `El campo "${etiqueta}" es obligatorio.`;
        }
        if (primerError.kind === "Boolean") {
            return `El campo "${etiqueta}" tiene un valor inválido. Selecciona una opción válida.`;
        }
        return primerError.message;
    }

    return "Ocurrió un error al guardar el cliente. Verifica los datos e intenta de nuevo.";
}

clienteOperaciones.crearCliente = async (req, res) => {
    try {
        const body = req.body;
        // Este endpoint es público (auto-registro): nunca se confía en el rol
        // que venga en el cuerpo de la petición, o cualquiera podría
        // registrarse como Administrador/Calldispatcher mandando la petición
        // directo a la API. Toda cuenta nueva nace Cliente; solo el
        // administrador puede subirle el rol después (modificarCliente).
        body.rol = "Cliente";
        body.password = await cifrarPassword(body.password);
        const cliente = new clienteModelo(body);
        const clienteGuardado = await cliente.save();

        // Autorregistro público: no hay sesión (req.usuario), así que el
        // "usuario" del evento es la propia cuenta recién creada.
        auditoriaServicio.registrar(req, {
            evento: EVENTOS_AUDITORIA.REGISTRO_CLIENTE,
            modulo: "Clientes",
            descripcion: "Autorregistro de cliente",
            usuario: {
                id: clienteGuardado._id,
                nombres: clienteGuardado.nombres + " " + clienteGuardado.apellidos,
                correo: clienteGuardado.correo,
                rol: clienteGuardado.rol
            },
            entidadAfectada: { tipo: "Cliente", id: clienteGuardado._id, referencia: clienteGuardado.correo }
        });

        res.status(201).send(clienteGuardado);
    } catch (error) {
        res.status(400).send(traducirErrorCliente(error));
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
                    { "usuario": { $regex: query.q, $options: "i"}},
                    { "correo": { $regex: query.q, $options: "i"}}
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
        const datosActualizar = {
            nombres: body.nombres,
            apellidos: body.apellidos,
            direccion: body.direccion,
            telefono: body.telefono,
            correo: body.correo,
            usuario: body.usuario,
            rol: body.rol,
            activo: body.activo,
            esVip: body.esVip
        }

        // Solo se actualiza y re-encripta la contraseña si se envió una nueva;
        // si no, se conserva la que ya tenía el cliente
        if (body.password) {
            datosActualizar.password = await cifrarPassword(body.password);
        }
        const clienteActualizado = await clienteModelo.findByIdAndUpdate(id, datosActualizar, { new: true });
        if (clienteActualizado != null) {
            auditoriaServicio.registrar(req, {
                evento: EVENTOS_AUDITORIA.MODIFICACION_CLIENTE,
                modulo: "Clientes",
                descripcion: "Modificación de datos de cliente",
                entidadAfectada: { tipo: "Cliente", id: clienteActualizado._id, referencia: clienteActualizado.correo }
            });
            res.status(200).send(clienteActualizado);
        }
        else {
            res.status(404).send("No hay datos");
        }
    } catch (error) {
        res.status(400).send(traducirErrorCliente(error));
    }
}


clienteOperaciones.borrarCliente = async (req, res) => {
    try {
        const id = req.params.id;
        const cliente = await clienteModelo.findByIdAndDelete(id);
        if (cliente != null) {
            auditoriaServicio.registrar(req, {
                evento: EVENTOS_AUDITORIA.ELIMINACION_CLIENTE,
                modulo: "Clientes",
                descripcion: "Eliminación de cliente",
                entidadAfectada: { tipo: "Cliente", id: cliente._id, referencia: cliente.correo }
            });
            res.status(200).send(cliente);
        } else {
            res.status(404).send("No hay datos");
        }
    } catch (error) {
        res.status(400).send("Mala petición. " + error);
    }
}

module.exports = clienteOperaciones;