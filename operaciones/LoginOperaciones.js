const ClienteModelo = require("../modelos/ClienteModelo");
const bcrypt = require("bcrypt");
const LoginOperaciones = {};

const compararPassword = async (recibido, guardado) => {
    return await bcrypt.compare(recibido, guardado);
}

LoginOperaciones.login = async(req, res) => {
    try {
        const correo = req.body.correo;
        let password = req.body.password;
        const user = await ClienteModelo.findOne({correo: correo});
        if (user != null) {
            const result = await compararPassword(password, user.password);
            if (result) {
                const acceso = {
                    nombres: user.nombres+" "+user.apellidos,
                    es_admin: user.es_admin,
                    //token: generarToken(usuario.id, usuario.nombres+" "+usuario.apellidos, usuario.es_admin)
                }
                res.status(200).json(acceso);
            }
            else {
                res.status(401).send("Email o contraseña incorrectos");    
            }
        }
        else {
            res.status(401).send("Email o contraseña incorrectos");
        }
    } catch (error) {
        console.log(error);
        res.status(400).json(error);
    }
}

module.exports = LoginOperaciones;