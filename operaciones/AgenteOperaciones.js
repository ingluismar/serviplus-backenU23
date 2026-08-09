const agenteModelo = require("../modelos/AgentesModelo");
const nivelServicioModelo = require("../modelos/NivelServicioModelo");
const bcrypt = require("bcrypt");
const auditoriaServicio = require("../servicios/auditoriaServicio");
const { EVENTOS_AUDITORIA } = auditoriaServicio;
const agenteOperaciones = {}

const SALT_TIMES = 10;

const cifrarPassword = async (password) => {
    const salt = await bcrypt.genSalt(SALT_TIMES);
    return await bcrypt.hash(password, salt);
}

const ETIQUETAS_CAMPO = {
    nombres: "nombres",
    apellidos: "apellidos",
    documento: "documento",
    nivelServicio: "nivel de servicio",
    telefono: "teléfono",
    correo: "correo",
    usuario: "usuario",
    password: "contraseña",
    rol: "rol"
};

// Traduce los errores técnicos de Mongo/Mongoose a un mensaje claro para el usuario
const traducirErrorAgente = (error) => {
    if (error.code === 11000) {
        const campo = Object.keys(error.keyPattern || {})[0];
        const etiqueta = ETIQUETAS_CAMPO[campo] || campo;
        return `Ya existe un agente registrado con ese ${etiqueta}. Verifica el dato e intenta de nuevo.`;
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
        return primerError.message;
    }

    return "Ocurrió un error al guardar el agente. Verifica los datos e intenta de nuevo.";
}

// Valida que el nivel de servicio enviado corresponda a uno configurado y
// activo. El desplegable de "nivel de servicio" en el formulario de agente
// se llena con ese catálogo (GET /niveles-servicio?activo=true), así que
// aquí se rechaza cualquier valor que no venga de ahí.
const validarNivelServicioAgente = async (nivelServicio) => {
    if (!nivelServicio) {
        return `El campo "nivel de servicio" es obligatorio.`;
    }
    const nivel = await nivelServicioModelo.findOne({ nombre: nivelServicio, activo: true });
    if (nivel == null) {
        return `El nivel de servicio "${nivelServicio}" no corresponde a uno configurado. Configúralo primero o selecciona uno existente.`;
    }
    return null;
}

agenteOperaciones.crearAgente = async (req, res) => {
    try {
        const body = req.body;
        const errorNivel = await validarNivelServicioAgente(body.nivelServicio);
        if (errorNivel != null) {
            return res.status(400).send(errorNivel);
        }
        if (body.password) {
            body.password = await cifrarPassword(body.password);
        }
        const agente = new agenteModelo(body);
        const agenteGuardado = await agente.save();

        auditoriaServicio.registrar(req, {
            evento: EVENTOS_AUDITORIA.CREACION_AGENTE,
            modulo: "Agentes",
            descripcion: `Creación de agente con rol ${agenteGuardado.rol}`,
            entidadAfectada: { tipo: "Agente", id: agenteGuardado._id, referencia: agenteGuardado.correo }
        });

        res.status(201).send(agenteGuardado);
    } catch (error) {
        res.status(400).send(traducirErrorAgente(error));
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
                    { "usuario": { $regex: query.q, $options: "i"}},
                    { "correo": { $regex: query.q, $options: "i"}}
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

        const errorNivel = await validarNivelServicioAgente(body.nivelServicio);
        if (errorNivel != null) {
            return res.status(400).send(errorNivel);
        }

        const datosActualizar = {
            nombres: body.nombres,
            apellidos: body.apellidos,
            documento: body.documento,
            nivelServicio: body.nivelServicio,
            telefono: body.telefono,
            correo: body.correo,
            usuario: body.usuario,
            rol: body.rol,
            activo: body.activo
        }

        // Igual que con clientes: solo se toca/re-encripta la contraseña si
        // se envió una nueva; en blanco significa "conservar la actual"
        if (body.password) {
            datosActualizar.password = await cifrarPassword(body.password);
        }

        const agenteActualizado = await agenteModelo.findByIdAndUpdate(id, datosActualizar, { new: true });
        if (agenteActualizado != null) {
            auditoriaServicio.registrar(req, {
                evento: EVENTOS_AUDITORIA.MODIFICACION_AGENTE,
                modulo: "Agentes",
                descripcion: "Modificación de datos de agente",
                entidadAfectada: { tipo: "Agente", id: agenteActualizado._id, referencia: agenteActualizado.correo }
            });
            res.status(200).send(agenteActualizado);
        }
        else {
            res.status(404).send("No hay datos");
        }
    } catch (error) {
        res.status(400).send(traducirErrorAgente(error));
    }
}


agenteOperaciones.borrarAgente = async (req, res) => {
    try {
        const id = req.params.id;
        const agente = await agenteModelo.findByIdAndDelete(id);
        if (agente != null) {
            auditoriaServicio.registrar(req, {
                evento: EVENTOS_AUDITORIA.ELIMINACION_AGENTE,
                modulo: "Agentes",
                descripcion: "Eliminación de agente",
                entidadAfectada: { tipo: "Agente", id: agente._id, referencia: agente.correo }
            });
            res.status(200).send(agente);
        } else {
            res.status(404).send("No hay datos");
        }
    } catch (error) {
        res.status(400).send("Mala petición. " + error);
    }
}

module.exports = agenteOperaciones;