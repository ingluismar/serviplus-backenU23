const nivelServicioModelo = require("../modelos/NivelServicioModelo");
const auditoriaServicio = require("../servicios/auditoriaServicio");
const { EVENTOS_AUDITORIA } = auditoriaServicio;
const nivelServicioOperaciones = {}

const ETIQUETAS_CAMPO = {
    nombre: "nombre",
    descripcion: "descripción",
    activo: "estado"
};

// Traduce los errores técnicos de Mongo/Mongoose a un mensaje claro para el usuario
const traducirErrorNivelServicio = (error) => {
    if (error.code === 11000) {
        const campo = Object.keys(error.keyPattern || {})[0];
        const etiqueta = ETIQUETAS_CAMPO[campo] || campo;
        return `Ya existe un nivel de servicio registrado con ese ${etiqueta}. Verifica el dato e intenta de nuevo.`;
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

    return "Ocurrió un error al guardar el nivel de servicio. Verifica los datos e intenta de nuevo.";
}

nivelServicioOperaciones.crearNivelServicio = async (req, res) => {
    try {
        const body = req.body;
        const nivelServicio = new nivelServicioModelo(body);
        const nivelServicioGuardado = await nivelServicio.save();

        auditoriaServicio.registrar(req, {
            evento: EVENTOS_AUDITORIA.CREACION_NIVEL_SERVICIO,
            modulo: "Niveles de servicio",
            descripcion: `Creación del nivel de servicio "${nivelServicioGuardado.nombre}"`,
            entidadAfectada: { tipo: "NivelServicio", id: nivelServicioGuardado._id, referencia: nivelServicioGuardado.nombre }
        });

        res.status(201).send(nivelServicioGuardado);
    } catch (error) {
        res.status(400).send(traducirErrorNivelServicio(error));
    }
}

// Lista los niveles de servicio configurados. El frontend la usa tanto en la
// pantalla de configuración (todos) como para poblar el desplegable de
// nivel de servicio al crear un agente (filtrando por ?activo=true).
nivelServicioOperaciones.buscarNivelesServicio = async (req, res) => {
    try {
        const query = req.query;
        let listaniveles;
        if (query.q != null) {
            listaniveles = await nivelServicioModelo.find({
                "$or": [
                    { "nombre": { $regex: query.q, $options: "i"}},
                    { "descripcion": { $regex: query.q, $options: "i"}}
                ]
            });
        }
        else {
            listaniveles = await nivelServicioModelo.find(query);
        }
        if (listaniveles.length > 0) {
            res.status(200).send(listaniveles);

        } else {
            res.status(404).send("No hay datos");
        }
    } catch (error) {
        res.status(400).send("Mala petición. " + error);
    }
}

nivelServicioOperaciones.buscarNivelServicio = async (req, res) => {
    try {
        const id = req.params.id;
        const nivelServicio = await nivelServicioModelo.findById(id);
        if (nivelServicio != null) {
            res.status(200).send(nivelServicio);
        } else {
            res.status(404).send("No hay datos");
        }
    } catch (error) {
        res.status(400).send("Mala petición. " + error);
    }
}

nivelServicioOperaciones.modificarNivelServicio = async (req, res) => {
    try {
        const id = req.params.id;
        const body = req.body;

        const datosActualizar = {
            nombre: body.nombre,
            descripcion: body.descripcion,
            activo: body.activo
        }
        const nivelServicioActualizado = await nivelServicioModelo.findByIdAndUpdate(id, datosActualizar, { new: true, runValidators: true });
        if (nivelServicioActualizado != null) {
            auditoriaServicio.registrar(req, {
                evento: EVENTOS_AUDITORIA.MODIFICACION_NIVEL_SERVICIO,
                modulo: "Niveles de servicio",
                descripcion: `Modificación del nivel de servicio "${nivelServicioActualizado.nombre}"`,
                entidadAfectada: { tipo: "NivelServicio", id: nivelServicioActualizado._id, referencia: nivelServicioActualizado.nombre }
            });
            res.status(200).send(nivelServicioActualizado);
        }
        else {
            res.status(404).send("No hay datos");
        }
    } catch (error) {
        res.status(400).send(traducirErrorNivelServicio(error));
    }
}

nivelServicioOperaciones.borrarNivelServicio = async (req, res) => {
    try {
        const id = req.params.id;
        const nivelServicio = await nivelServicioModelo.findByIdAndDelete(id);
        if (nivelServicio != null) {
            auditoriaServicio.registrar(req, {
                evento: EVENTOS_AUDITORIA.ELIMINACION_NIVEL_SERVICIO,
                modulo: "Niveles de servicio",
                descripcion: `Eliminación del nivel de servicio "${nivelServicio.nombre}"`,
                entidadAfectada: { tipo: "NivelServicio", id: nivelServicio._id, referencia: nivelServicio.nombre }
            });
            res.status(200).send(nivelServicio);
        } else {
            res.status(404).send("No hay datos");
        }
    } catch (error) {
        res.status(400).send("Mala petición. " + error);
    }
}

module.exports = nivelServicioOperaciones;
