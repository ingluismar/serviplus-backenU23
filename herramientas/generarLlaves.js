const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

// Genera el par de llaves Ed25519 del sistema de licenciamiento. Se corre
// UNA sola vez (o al rotar la llave). La privada nunca debe salir de este
// equipo ni subirse a ningún repositorio -por eso herramientas/claves/ está
// en .gitignore-; la pública es la que hay que pegar en
// utilidades/licencia.js (LLAVE_PUBLICA) para que el backend de cada
// cliente pueda verificar las licencias que se emitan con la privada.
const carpeta = path.join(__dirname, "claves");
if (!fs.existsSync(carpeta)) fs.mkdirSync(carpeta, { recursive: true });

const rutaPrivada = path.join(carpeta, "privada.pem");
if (fs.existsSync(rutaPrivada)) {
    console.error(
        `Ya existe una llave privada en ${rutaPrivada}. No se generó una nueva ` +
        "(la sobreescribirías y las licencias ya emitidas dejarían de verificar). " +
        "Bórrala a mano primero si de verdad quieres rotarla."
    );
    process.exit(1);
}

const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519", {
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" }
});

fs.writeFileSync(rutaPrivada, privateKey, { mode: 0o600 });
fs.writeFileSync(path.join(carpeta, "publica.pem"), publicKey);

console.log(`Llave privada guardada en ${rutaPrivada} (no la subas a git).`);
console.log("Pega este valor como LLAVE_PUBLICA en utilidades/licencia.js:\n");
console.log(publicKey);
