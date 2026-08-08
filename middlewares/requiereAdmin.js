// Se usa después de verificarToken: exige que el rol dentro del token sea
// "Administrador". Los únicos tres roles del sistema son Agente, Cliente y
// Administrador (los agentes no inician sesión hoy, así que en la práctica
// esto distingue Cliente de Administrador).
const requiereAdmin = (req, res, next) => {
    if (!req.usuario || req.usuario.rol !== "Administrador") {
        return res.status(403).send("No tienes permisos de administrador para realizar esta acción.");
    }
    next();
}

module.exports = requiereAdmin;
