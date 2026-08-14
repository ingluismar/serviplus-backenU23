const crypto = require("crypto");

// Fase 1 del sistema de licenciamiento (ver la propuesta): esquema del
// archivo de licencia, firma/verificación (Ed25519) y catálogo de planes.
// Este módulo SÍ viaja con el backend que se despliega en casa de cada
// cliente -por eso solo tiene la mitad pública del par de llaves-. La
// mitad privada (la que firma) vive únicamente en herramientas/generarLicencia.js,
// que nunca se despliega junto con la aplicación.

// Catálogo de planes: qué módulos y límites trae cada uno por defecto al
// emitir una licencia (ver herramientas/generarLicencia.js). El backend del
// cliente no necesita este catálogo para validar -la licencia ya trae sus
// propios "modulos"/"limites" explícitos, autocontenidos-, pero centralizarlo
// acá evita que cada emisión tenga que repetir la lista de módulos a mano.
// null en un límite significa "sin límite".
const PLANES = {
    basic: {
        etiqueta: "Basic",
        modulos: [],
        limites: { agentes: 5 }
    },
    professional: {
        etiqueta: "Professional",
        modulos: ["dashboard", "vip", "auditoria"],
        limites: { agentes: 20 }
    },
    enterprise: {
        etiqueta: "Enterprise",
        modulos: ["dashboard", "vip", "auditoria", "correo"],
        limites: { agentes: null }
    }
};

// Serialización determinística (claves ordenadas, recursiva): firmar/verificar
// deben operar siempre sobre los mismos bytes sin importar en qué orden haya
// quedado escrito el objeto en JS (JSON.stringify normal no garantiza eso).
const serializarDeterministico = (valor) => {
    if (Array.isArray(valor)) {
        return `[${valor.map(serializarDeterministico).join(",")}]`;
    }
    if (valor && typeof valor === "object") {
        const claves = Object.keys(valor).sort();
        return `{${claves.map((clave) => `${JSON.stringify(clave)}:${serializarDeterministico(valor[clave])}`).join(",")}}`;
    }
    return JSON.stringify(valor);
};

// Firma los "datos" de una licencia con la llave privada Ed25519 (PEM).
// Uso exclusivo de herramientas/generarLicencia.js -del lado de ServiPlus-,
// nunca del backend que corre en casa del cliente (que no tiene esta llave).
const firmar = (datos, llavePrivadaPem) => {
    const mensaje = Buffer.from(serializarDeterministico(datos), "utf8");
    return crypto.sign(null, mensaje, { key: llavePrivadaPem, format: "pem" }).toString("base64");
};

// Verifica una licencia completa ({datos, firma}) contra la llave pública
// embebida y evalúa su vigencia (vigente / vigente-en-gracia / vencida).
// Nunca lanza una excepción hacia afuera: siempre devuelve un estado
// explícito, para que quien la llame decida qué hacer -la aplicación nunca
// se cae ni pierde datos por una licencia inválida o ausente-.
// `ahora` es inyectable (por defecto la fecha real) para poder probar
// vencimientos sin esperar al calendario, y para que licenciaServicio.js
// pueda pasarle una fecha protegida contra un reloj del sistema retrocedido.
const verificarLicencia = (licencia, llavePublicaPem = LLAVE_PUBLICA, ahora = new Date()) => {
    if (!licencia || typeof licencia !== "object" || !licencia.datos || !licencia.firma) {
        return { estado: "invalida", motivo: "El archivo de licencia no tiene el formato esperado." };
    }

    let firmaValida = false;
    try {
        const mensaje = Buffer.from(serializarDeterministico(licencia.datos), "utf8");
        firmaValida = crypto.verify(
            null, mensaje, { key: llavePublicaPem, format: "pem" }, Buffer.from(licencia.firma, "base64")
        );
    } catch (error) {
        return { estado: "invalida", motivo: "No se pudo verificar la firma: " + error.message };
    }

    if (!firmaValida) {
        return { estado: "invalida", motivo: "La firma no coincide: el archivo fue modificado o no fue emitido por ServiPlus." };
    }

    const { datos } = licencia;
    if (!datos.expira) {
        return { estado: "vigente", enGracia: false, datos };
    }

    // Siempre en UTC (la "Z" es la parte que importa): "emitida"/"expira" se
    // generan en UTC (ver herramientas/generarLicencia.js) y el servidor que
    // valida puede estar en cualquier huso horario -sin fijar UTC acá, un
    // vencimiento a medianoche podía leerse distinto según dónde corra el
    // backend, moviendo el límite real hasta casi un día entero-.
    const fechaExpira = new Date(`${datos.expira}T23:59:59Z`);
    const finGracia = new Date(fechaExpira);
    finGracia.setUTCDate(finGracia.getUTCDate() + (datos.gracia_dias || 0));

    if (ahora <= fechaExpira) {
        return { estado: "vigente", enGracia: false, datos };
    }
    if (ahora <= finGracia) {
        return {
            estado: "vigente",
            enGracia: true,
            diasRestantesGracia: Math.ceil((finGracia - ahora) / 86400000),
            datos
        };
    }
    return { estado: "vencida", motivo: `La licencia venció el ${datos.expira}.`, datos };
};

// Llave pública Ed25519: la única mitad del par que viaja con el backend
// desplegado en casa del cliente. Se completa corriendo
// herramientas/generarLlaves.js y pegando el resultado acá.
const LLAVE_PUBLICA = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEAzgFX6Hiod7AAI+DUd9iHDG29C5IoeVHDK2fnEyne898=
-----END PUBLIC KEY-----`;

module.exports = { PLANES, serializarDeterministico, firmar, verificarLicencia, LLAVE_PUBLICA };
