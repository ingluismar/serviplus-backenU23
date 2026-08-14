const crypto = require("crypto");
const licenciaEstadoModelo = require("../modelos/LicenciaEstadoModelo");
const { verificarLicencia, PLANES } = require("../utilidades/licencia");

// Fase 2 del sistema de licenciamiento: el servicio en tiempo de ejecución
// que consultan los middlewares (requiereModulo/requiereLimite/soloLecturaSiVencida)
// y la pantalla de administración. Envuelve utilidades/licencia.js (que es
// puro: solo sabe firmar/verificar) con lo que hace falta para operar en
// este backend: persistencia, caché y protección contra reloj retrocedido.

// Cuánto tiempo se reutiliza el último estado calculado antes de volver a
// leer de la base de datos y re-verificar la firma. La verificación en sí
// es barata (Ed25519), pero no hace falta repetirla en cada petición HTTP.
const TTL_CACHE_MS = 5 * 60 * 1000;

let cache = null; // { estado, calculadoEn }

// Documento único: si todavía no existe, se crea con una huella nueva
// (aleatoria, queda fija para siempre) y sin licencia cargada -así el
// primer arranque nunca queda sin registro-.
const obtenerOCrearRegistro = async () => {
    let registro = await licenciaEstadoModelo.findOne();
    if (!registro) {
        registro = await licenciaEstadoModelo.create({
            instancia: crypto.randomUUID(),
            licencia: null,
            ultimaFechaVista: new Date()
        });
    }
    return registro;
};

// La huella de esta instalación (para que el administrador se la pase a
// ServiPlus y reciba una licencia atada específicamente a esta instancia).
const obtenerHuella = async () => (await obtenerOCrearRegistro()).instancia;

// Sin licencia, o con una que no pasa la verificación, el sistema no queda
// "abierto": se trata como si estuviera en el plan Basic (sus módulos y
// límites), que es el único nivel que no depende de tener una licencia real.
const SIN_LICENCIA = { modulos: PLANES.basic.modulos, limites: PLANES.basic.limites };

const calcularEstado = async () => {
    const registro = await obtenerOCrearRegistro();

    // Protección contra reloj retrocedido: si el reloj del sistema marca
    // una fecha anterior a la última que este backend ya vio, se sigue
    // usando esa última fecha vista para evaluar vencimientos -así,
    // adelantar el reloj hacia atrás no "revive" una licencia vencida-.
    // Nunca se guarda una fecha vista menor a la que ya había.
    const ahoraSistema = new Date();
    const relojRetrocedido = ahoraSistema < registro.ultimaFechaVista;
    const ahoraEfectiva = relojRetrocedido ? registro.ultimaFechaVista : ahoraSistema;
    if (!relojRetrocedido) {
        registro.ultimaFechaVista = ahoraSistema;
        await registro.save();
    }

    const base = { instancia: registro.instancia, relojRetrocedido, verificadoEn: ahoraEfectiva };

    if (!registro.licencia) {
        return { ...base, estado: "sin_licencia", motivo: "No se ha cargado ninguna licencia.", ...SIN_LICENCIA };
    }

    const resultado = verificarLicencia(registro.licencia, undefined, ahoraEfectiva);

    // Vínculo de instancia: si la licencia trae una huella específica y no
    // coincide con la de esta instalación, no es válida acá -aunque la
    // firma sí sea auténtica-, para que copiar el .lic de otro cliente no
    // sirva de nada.
    if (resultado.estado !== "invalida" && resultado.datos?.instancia && resultado.datos.instancia !== registro.instancia) {
        return { ...base, estado: "invalida", motivo: "Esta licencia fue emitida para otra instalación.", ...SIN_LICENCIA };
    }

    if (resultado.estado === "invalida") {
        return { ...base, estado: "invalida", motivo: resultado.motivo, ...SIN_LICENCIA };
    }

    return {
        ...base,
        estado: resultado.estado, // "vigente" | "vencida"
        enGracia: resultado.enGracia || false,
        diasRestantesGracia: resultado.diasRestantesGracia,
        motivo: resultado.motivo || null,
        datos: resultado.datos,
        modulos: resultado.datos.modulos || [],
        limites: resultado.datos.limites || {}
    };
};

// Devuelve el estado cacheado (si sigue vigente el TTL) o lo recalcula.
const obtenerEstado = async ({ forzar = false } = {}) => {
    if (!forzar && cache && (Date.now() - cache.calculadoEn) < TTL_CACHE_MS) {
        return cache.estado;
    }
    const estado = await calcularEstado();
    cache = { estado, calculadoEn: Date.now() };
    return estado;
};

const invalidarCache = () => { cache = null; };

// Guarda una licencia nueva -solo si su firma es auténtica-, reemplazando
// la que hubiera. No exige que esté vigente (se puede cargar una que ya
// venga vencida), solo que sea genuina: la evaluación de vigencia es
// responsabilidad de calcularEstado/obtenerEstado, no de esta función.
const cargarLicencia = async (licenciaCruda) => {
    const verificacion = verificarLicencia(licenciaCruda);
    if (verificacion.estado === "invalida") {
        return { ok: false, motivo: verificacion.motivo };
    }
    const registro = await obtenerOCrearRegistro();
    registro.licencia = licenciaCruda;
    await registro.save();
    invalidarCache();
    return { ok: true };
};

module.exports = { obtenerHuella, obtenerEstado, invalidarCache, cargarLicencia };
