const licenciaServicio = require("../servicios/licenciaServicio");

// Bloquea una acción (típicamente crear un recurso) si ya se alcanzó el
// límite contratado. `contarActual(req)` debe devolver cuántos hay ahora
// mismo (ej. agentes activos); un límite null en la licencia significa
// "sin límite" (así vienen los planes altos, ver utilidades/licencia.js).
const requiereLimite = (nombreLimite, contarActual) => async (req, res, next) => {
    const licencia = await licenciaServicio.obtenerEstado();
    const limite = licencia.limites?.[nombreLimite];

    if (limite == null) return next(); // sin límite explícito para este plan

    const actual = await contarActual(req);
    if (actual >= limite) {
        return res.status(402).send(
            `Alcanzaste el límite de ${nombreLimite} de tu plan actual (${limite}). Contacta a ServiPlus para ampliarlo.`
        );
    }
    next();
};

module.exports = requiereLimite;
