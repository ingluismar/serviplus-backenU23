const jwt = require("jsonwebtoken");

// Exige un JWT válido en "Authorization: Bearer <token>" (emitido por
// LoginOperaciones.login). Si es válido, deja los datos del usuario
// (id/correo/rol) disponibles en req.usuario para las rutas y para
// requiereAdmin.
const verificarToken = (req, res, next) => {
    const encabezado = req.headers.authorization;
    const token = encabezado && encabezado.startsWith("Bearer ") ? encabezado.slice(7) : null;

    if (!token) {
        return res.status(401).send("Debes iniciar sesión para realizar esta acción.");
    }

    try {
        req.usuario = jwt.verify(token, process.env.JWT_SECRET);
        next();
    } catch (error) {
        return res.status(401).send("Tu sesión expiró o no es válida. Inicia sesión de nuevo.");
    }
}

module.exports = verificarToken;
