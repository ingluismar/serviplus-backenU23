const licenciaServicio = require("../servicios/licenciaServicio");

// Bloquea el acceso a una ruta si el módulo no está incluido en la
// licencia vigente. Sin licencia -o con una inválida o emitida para otra
// instalación- la lista de módulos queda vacía (equivalente al plan
// Basic, ver licenciaServicio.js), así que cualquier ruta protegida acá
// exige una licencia real que la incluya explícitamente.
const requiereModulo = (nombreModulo) => async (req, res, next) => {
    const licencia = await licenciaServicio.obtenerEstado();
    if (!licencia.modulos.includes(nombreModulo)) {
        return res.status(402).send(
            `Este módulo ("${nombreModulo}") no está incluido en tu licencia actual. Contacta a ServiPlus para ampliar tu plan.`
        );
    }
    next();
};

module.exports = requiereModulo;
