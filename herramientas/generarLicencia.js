const fs = require("fs");
const path = require("path");
const { firmar, PLANES } = require("../utilidades/licencia");

// CLI de emisión de licencias. Uso exclusivo de ServiPlus -no se despliega
// junto con el backend del cliente, no tiene ruta HTTP ni pantalla-.
//
// Uso:
//   node herramientas/generarLicencia.js --cliente="Acme S.A.S" --plan=professional [opciones]
//
// Opciones:
//   --expira=YYYY-MM-DD   Fecha de vencimiento. Se omite -> licencia perpetua.
//   --gracia=15           Días de gracia tras vencer antes de pasar a solo lectura (por defecto 15).
//   --agentes=20          Sobreescribe el límite de agentes del plan.
//   --modulos=dashboard,vip,auditoria   Sobreescribe los módulos incluidos del plan.
//   --instancia=xxxxx     Huella de la instalación del cliente, si ya se conoce (opcional en esta fase).
//   --clave-privada=ruta  Por defecto herramientas/claves/privada.pem
//   --salida=archivo.lic  Por defecto <cliente>.lic en el directorio actual

const args = Object.fromEntries(
    process.argv.slice(2)
        .filter((a) => a.startsWith("--"))
        .map((a) => {
            const [clave, ...resto] = a.slice(2).split("=");
            return [clave, resto.join("=")];
        })
);

const mostrarUsoYSalir = (mensaje) => {
    if (mensaje) console.error(mensaje + "\n");
    console.error(
        'Uso: node herramientas/generarLicencia.js --cliente="Nombre" --plan=basic|professional|enterprise ' +
        "[--expira=YYYY-MM-DD] [--gracia=15] [--agentes=20] [--modulos=dashboard,vip] [--instancia=xxx] " +
        "[--clave-privada=ruta] [--salida=archivo.lic]"
    );
    process.exit(1);
};

if (!args.cliente || !args.plan) {
    mostrarUsoYSalir("Faltan --cliente y/o --plan.");
}

const planBase = PLANES[args.plan];
if (!planBase) {
    mostrarUsoYSalir(`Plan desconocido: "${args.plan}". Usa basic, professional o enterprise.`);
}

const rutaPrivada = args["clave-privada"] || path.join(__dirname, "claves", "privada.pem");
if (!fs.existsSync(rutaPrivada)) {
    mostrarUsoYSalir(`No se encontró la llave privada en ${rutaPrivada}. Corre primero herramientas/generarLlaves.js.`);
}
const llavePrivada = fs.readFileSync(rutaPrivada, "utf8");

const datos = {
    cliente: args.cliente,
    instancia: args.instancia || null,
    plan: args.plan,
    emitida: new Date().toISOString().slice(0, 10),
    expira: args.expira || null,
    gracia_dias: args.gracia != null ? Number(args.gracia) : 15,
    limites: {
        agentes: args.agentes != null ? Number(args.agentes) : planBase.limites.agentes
    },
    modulos: args.modulos ? args.modulos.split(",").map((m) => m.trim()).filter(Boolean) : planBase.modulos
};

const licencia = { datos, firma: firmar(datos, llavePrivada) };

const nombreArchivo = args.salida || `${args.cliente.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "_")}.lic`;
fs.writeFileSync(nombreArchivo, JSON.stringify(licencia, null, 2));

console.log(`Licencia generada: ${nombreArchivo}\n`);
console.log(JSON.stringify(datos, null, 2));
