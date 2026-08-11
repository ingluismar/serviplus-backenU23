const { execFile } = require("child_process");
const auditoriaModelo = require("../modelos/AuditoriaModelo");

// Catálogo cerrado de eventos auditables. Usar códigos fijos (en vez de
// texto libre en cada operación) es lo que permite luego filtrar el log de
// forma confiable ("dame todos los LOGIN_FALLIDO de este correo") y evita
// que un typo en una operación se vuelva un evento "fantasma" que no
// aparece en ningún filtro.
const EVENTOS_AUDITORIA = {
    LOGIN_EXITOSO: "LOGIN_EXITOSO",
    LOGIN_FALLIDO: "LOGIN_FALLIDO",
    SOLICITUD_RECUPERACION_PASSWORD: "SOLICITUD_RECUPERACION_PASSWORD",
    RESTABLECIMIENTO_PASSWORD: "RESTABLECIMIENTO_PASSWORD",

    REGISTRO_CLIENTE: "REGISTRO_CLIENTE",
    MODIFICACION_CLIENTE: "MODIFICACION_CLIENTE",
    ELIMINACION_CLIENTE: "ELIMINACION_CLIENTE",

    CREACION_AGENTE: "CREACION_AGENTE",
    MODIFICACION_AGENTE: "MODIFICACION_AGENTE",
    ELIMINACION_AGENTE: "ELIMINACION_AGENTE",

    CREACION_TICKET: "CREACION_TICKET",
    MODIFICACION_TICKET: "MODIFICACION_TICKET",
    ASIGNACION_TICKET: "ASIGNACION_TICKET",
    ELIMINACION_TICKET: "ELIMINACION_TICKET",

    CREACION_NIVEL_SERVICIO: "CREACION_NIVEL_SERVICIO",
    MODIFICACION_NIVEL_SERVICIO: "MODIFICACION_NIVEL_SERVICIO",
    ELIMINACION_NIVEL_SERVICIO: "ELIMINACION_NIVEL_SERVICIO",

    CREACION_ANS: "CREACION_ANS",
    MODIFICACION_ANS: "MODIFICACION_ANS",
    ELIMINACION_ANS: "ELIMINACION_ANS",

    MODIFICACION_CONFIGURACION_CORREO: "MODIFICACION_CONFIGURACION_CORREO",
    PRUEBA_CONFIGURACION_CORREO: "PRUEBA_CONFIGURACION_CORREO"
};

// Extrae la IP real del cliente. Si la API queda detrás de un proxy/balanceador
// (Nginx, Render, un load balancer, etc.) la IP de socket es la del proxy, no
// la del usuario final: por eso se prioriza X-Forwarded-For (su primer valor
// es el cliente original) y solo se cae a la IP de socket si no existe.
// También se normaliza el prefijo con el que Node representa una IPv4 sobre
// un socket IPv6 (::ffff:127.0.0.1 -> 127.0.0.1) para que el log sea legible.
const obtenerIp = (req) => {
    const forwardedFor = req.headers["x-forwarded-for"];
    let ip = forwardedFor ? forwardedFor.split(",")[0].trim() : req.socket?.remoteAddress;
    if (ip && ip.startsWith("::ffff:")) {
        ip = ip.slice(7);
    }
    return ip || null;
};

const PATRON_MAC = /([0-9a-fA-F]{2}[:-]){5}[0-9a-fA-F]{2}/;

// --- Dirección MAC: limitación técnica, no un descuido ---
// La MAC es una dirección de capa de enlace (Ethernet/WiFi): viaja solo
// hasta el primer router y ese router la reemplaza por la suya en cada
// salto. El servidor de esta API nunca recibe, a nivel de protocolo, la MAC
// real del dispositivo del usuario si hay aunque sea un router de por medio
// -que es siempre el caso fuera de una LAN-, y ningún navegador la expone a
// JavaScript (bloqueado a propósito por privacidad). Por eso no existe una
// forma legítima de "leer la MAC" de un visitante que entra por internet.
//
// Lo que sí es correcto y se implementa aquí es una resolución de mejor
// esfuerzo contra la tabla ARP del propio servidor: si el cliente está en la
// misma red local que el backend (despliegue interno/on-premise, o pruebas
// en la misma red de oficina), su MAC sí quedó en esa tabla y se puede leer
// con el comando `arp` del sistema operativo. Si el cliente llega desde
// fuera de esa red (que es el escenario normal con un backend en la nube),
// la búsqueda no encuentra nada y el campo queda registrado como "no
// disponible" -eso también es información de auditoría correcta, no un
// error de la implementación-.
const resolverMac = (ip) => {
    return new Promise((resolve) => {
        if (!ip || ip === "127.0.0.1" || ip === "::1") {
            return resolve(null);
        }
        const args = process.platform === "win32" ? ["-a", ip] : ["-n", ip];
        execFile("arp", args, { timeout: 1500 }, (error, stdout) => {
            if (error || !stdout) return resolve(null);
            const coincidencia = stdout.match(PATRON_MAC);
            resolve(coincidencia ? coincidencia[0].toUpperCase().replace(/-/g, ":") : null);
        });
    });
};

/**
 * Registra un evento en el log de auditoría. Se llama "y se olvida": nunca
 * bloquea ni puede tumbar la operación de negocio que audita -si guardar el
 * registro falla, solo se deja constancia en consola-, porque una falla al
 * auditar no puede convertirse en una falla del sistema.
 *
 * @param {import('express').Request} req - request en curso (de aquí se
 *   obtiene la IP, la MAC de mejor esfuerzo y el user-agent)
 * @param {object} datos
 * @param {string} datos.evento - uno de EVENTOS_AUDITORIA
 * @param {string} [datos.modulo] - área funcional, p. ej. "Tickets"
 * @param {string} [datos.descripcion] - detalle legible del evento
 * @param {"EXITOSO"|"FALLIDO"} [datos.resultado]
 * @param {object} [datos.usuario] - quién hizo la acción; si no se indica,
 *   se toma de req.usuario (sesión JWT) y si tampoco existe se registra
 *   como anónimo (acciones públicas: login fallido, registro de cliente)
 * @param {object} [datos.entidadAfectada] - { tipo, id, referencia }
 */
const registrar = async (req, datos) => {
    try {
        const ip = obtenerIp(req);
        const mac = await resolverMac(ip);

        const usuarioToken = req.usuario;
        const usuario = datos.usuario || (usuarioToken ? {
            id: usuarioToken.id,
            nombres: usuarioToken.nombres,
            correo: usuarioToken.correo,
            rol: usuarioToken.rol
        } : { id: null, nombres: "Anónimo", correo: null, rol: null });

        await auditoriaModelo.create({
            evento: datos.evento,
            modulo: datos.modulo || null,
            descripcion: datos.descripcion || null,
            resultado: datos.resultado || "EXITOSO",
            usuario,
            entidadAfectada: datos.entidadAfectada || null,
            ip,
            mac,
            userAgent: req.headers["user-agent"] || null
        });
    } catch (error) {
        console.log("No se pudo registrar auditoría:", error.message);
    }
};

module.exports = { registrar, obtenerIp, EVENTOS_AUDITORIA };
