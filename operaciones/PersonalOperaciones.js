const personalModelo = require("../modelos/PersonalModelo");
const bcrypt = require ("bcrypt");
const personalOperaciones = {}

const cifrarPassword = async (password) => {
    const SALT_TIMES = 10;
    const salt = await bcrypt.genSalt(SALT_TIMES);
    return await bcrypt.hash (password, salt);
}



    personalOperaciones.crearPersonal = async (req, res) => {
    try {
        const body = req.body;
        body.password = await cifrarPassword(body.password);
        const personal = new personalModelo(body);
        const personalGuardado = await personal.save();
        res.status(201).send(personalGuardado);
    } catch (error) {
        res.status(400).json(error);
    }
}



personalOperaciones.buscarPersonal = async(req, res)=>{
    try { 
        const filtro = req.query;
        let listapersonal;
        if (filtro.q != null) {
            listapersonal = await personalModelo.find({
                "$or" : [ 
                    { "nombres": { $regex: query.q, $options: "i"}},
                    { "apellidos": { $regex: query.q, $options: "i"}},
                    { "documento": { $regex: query.q, $options: "i"}},
                    { "usuario": { $regex: query.q, $options: "i"}}
            
                ]
            });
        }

        else{
            listapersonal = await personalModelo.find(filtro);
        }
        
        if (listapersonal.length > 0){
            res.status(200).send(listapersonal);
        } else{
            res.status(404).send("No hay datos");
        }
    } catch (error) {
            res.status(400).send("Mala petición." + error);
    }
}


personalOperaciones.buscarAgente = async(req, res)=>{
    try { 
        const id = req.params.id;
        const agente = await personalModelo.findById(id);
        if (agente != null){
            res.status(200).send(agente);
        } else{
            res.status(404).send("no hay datos");
        }
    } catch (error) {
            res.status(400).send("Mala petición." + error);
    }
}
    

personalOperaciones.modificarPersonal = async (req, res)=>{

    try {
        const id = req.params.id;
        const body = req.body;
        if (body.password != null) {
            body.password = await cifrarPassword (body.password)
        }
        const datosActualizar = {
            nombres: body.nombres,
            apellidos: body.apellidos,
            telefono: body.telefono,
            password: body.password,
        }
        const personalActualizado = await personalModelo.findByIdAndUpdate(id, datosActualizar, { new : true });
        if (personalActualizado != null) {
            res.status(200).send(personalActualizado);
        }
        else {
            res.status(404).send("No hay datos");
        }
    } catch (error) {
        res.status(400).send("Mala petición. " +error);
    }
}

personalOperaciones.eliminarPersonal = async (req, res)=>{

        try {
            const id = req.params.id;
            const agente = await personalModelo.findByIdAndDelete(id);
            if (agente != null){
                res.status(200).send(agente);
            } else {
                res.status(404).send("No hay datos");
            }
        } catch (error) {
            res.status(400).send("Mala petición. " + error);
        }
    }
    

module.exports = personalOperaciones;