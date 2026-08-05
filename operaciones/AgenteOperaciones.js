const agenteModelo = require("../modelos/AgentesModelo");
const nivelServicioModelo = require("../modelos/NivelServicioModelo");
const agenteOperaciones = {}

const ETIQUETAS_CAMPO = {
    nombres: "nombres",
    apellidos: "apellidos",
    documento: "documento",
    rol: "rol",
    telefono: "teléfono",
    correo: "correo",
    usuario: "usuario"
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

// Valida que el rol enviado corresponda a un nivel de servicio configurado y
// activo. El desplegable de "rol" en el formulario de agente se llena con
// los niveles de servicio (GET /niveles-servicio?activo=true), así que aquí
// se rechaza cualquier valor que no venga de ese catálogo.
const validarRolAgente = async (rol) => {
    if (!rol) {
        return `El campo "rol" es obligatorio.`;
    }
    const nivel = await nivelServicioModelo.findOne({ nombre: rol, activo: true });
    if (nivel == null) {
        return `El rol "${rol}" no corresponde a un nivel de servicio configurado. Configura primero el nivel de servicio o selecciona uno existente.`;
    }
    return null;
}

agenteOperaciones.crearAgente = async (req, res) => {
    try {
        const body = req.body;
        const errorRol = await validarRolAgente(body.rol);
        if (errorRol != null) {
            return res.status(400).send(errorRol);
        }
        const agente = new agenteModelo(body);
        const agenteGuardado = await agente.save();
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

        const errorRol = await validarRolAgente(body.rol);
        if (errorRol != null) {
            return res.status(400).send(errorRol);
        }

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
        res.status(400).send(traducirErrorAgente(error));
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