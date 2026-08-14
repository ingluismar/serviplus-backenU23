const licenciaServicio = require("../servicios/licenciaServicio");

const METODOS_ESCRITURA = ["POST", "PUT", "PATCH", "DELETE"];

// Rutas exentas incluso escribiendo: hay que poder iniciar sesión y hay
// que poder cargar una licencia nueva para salir del modo de solo lectura.
const RUTAS_EXENTAS = ["/login", "/licencia"];

// Corta cualquier escritura mientras la licencia esté vencida (ya pasado
// el período de gracia) — nunca bloquea lecturas ni borra nada, así que
// toda la información existente sigue siendo consultable en todo momento.
// Se monta global (antes de las rutas) en index.js.
const soloLecturaSiVencida = async (req, res, next) => {
    if (!METODOS_ESCRITURA.includes(req.method)) return next();
    if (RUTAS_EXENTAS.some((ruta) => req.path.startsWith(ruta))) return next();

    try {
        const licencia = await licenciaServicio.obtenerEstado();
        if (licencia.estado === "vencida") {
            return res.status(402).send(
                "La licencia de ServiPlus está vencida y ya pasó el período de gracia. La aplicación quedó en " +
                "modo de solo lectura: puedes seguir consultando la información existente, pero no crear ni " +
                "modificar registros hasta que se cargue una licencia vigente en Configuración → Licencia."
            );
        }
        next();
    } catch (error) {
        // Un fallo al consultar el estado de la licencia (ej. Mongo caído
        // un instante) nunca debe tumbar la operación de negocio en curso.
        next();
    }
};

module.exports = soloLecturaSiVencida;
