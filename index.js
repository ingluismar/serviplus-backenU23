//Importación
require('dotenv').config({ quiet: true });
const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const mongoose = require("./conexion");

//Configuración
const app = express();
const env = process.env;
const port = env.PORT || 8080;
app.use(express.json());
app.use(morgan('dev'));
app.use(cors());
// Licenciamiento: corta cualquier escritura (POST/PUT/PATCH/DELETE, salvo
// /login y /licencia) mientras la licencia esté vencida y ya pasó el
// período de gracia. Va antes de montar las rutas para que aplique a todas
// por igual; las lecturas nunca se ven afectadas.
app.use(require("./middlewares/soloLecturaSiVencida"));
//Arranque
app.listen(port, () => {
    console.log("API iniciado en puerto " + port);
});
require("./servicios/licenciaServicio").obtenerEstado()
    .then((estado) => {
        const detalle = estado.enGracia ? ` (en período de gracia, ${estado.diasRestantesGracia}d)` : "";
        console.log(`Licencia: ${estado.estado}${detalle} — instancia ${estado.instancia}`);
    })
    .catch((error) => console.log("No se pudo leer el estado de la licencia:", error.message));
//Rutas base
app.get('/', (req, res) => {
    res.send("API iniciado ");
});

app.use("/clientes", require("./rutas/ClienteRutas"));
app.use("/tickets", require("./rutas/TicketRutas"));
app.use("/login", require("./rutas/LoginRutas"));
app.use("/agentes", require("./rutas/AgenteRutas"));
app.use("/ans", require("./rutas/AnsRutas"));
app.use("/niveles-servicio", require("./rutas/NivelServicioRutas"));
app.use("/auditoria", require("./rutas/AuditoriaRutas"));
app.use("/configuracion-correo", require("./rutas/ConfiguracionCorreoRutas"));
app.use("/licencia", require("./rutas/LicenciaRutas"));
