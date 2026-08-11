const crypto = require("crypto");

// Cifrado simétrico reversible (AES-256-CBC), para datos que el propio
// backend necesita poder leer de vuelta -a diferencia de la contraseña de
// un usuario, que se hashea con bcrypt y nunca se recupera-. Es el caso de
// la contraseña de la cuenta de correo saliente (ver ConfiguracionCorreoModelo):
// hay que poder pasársela tal cual a nodemailer para autenticar contra el
// servidor SMTP/POP3, así que un hash de un solo sentido no sirve.
//
// La clave sale de CLAVE_CIFRADO_CORREO; si esa variable de entorno no está
// definida, se deriva de JWT_SECRET como respaldo (para que funcione sin
// configuración adicional apenas se despliega), pero en producción conviene
// fijar una clave propia y no reutilizar el secreto de las sesiones.
const obtenerClave = () => {
    const fuente = process.env.CLAVE_CIFRADO_CORREO || process.env.JWT_SECRET || "serviplus-clave-de-cifrado-por-defecto";
    return crypto.createHash("sha256").update(fuente).digest(); // 32 bytes -> AES-256
};

// Devuelve "ivHex:cifradoHex". El IV va en claro junto con el texto cifrado
// (es su función: no es secreto, solo debe ser distinto en cada cifrado) y
// se necesita de vuelta para poder descifrar.
const cifrar = (textoPlano) => {
    if (!textoPlano) return "";
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv("aes-256-cbc", obtenerClave(), iv);
    const cifrado = Buffer.concat([cipher.update(textoPlano, "utf8"), cipher.final()]);
    return `${iv.toString("hex")}:${cifrado.toString("hex")}`;
};

const descifrar = (valorCifrado) => {
    if (!valorCifrado || !valorCifrado.includes(":")) return "";
    try {
        const [ivHex, dataHex] = valorCifrado.split(":");
        const decipher = crypto.createDecipheriv("aes-256-cbc", obtenerClave(), Buffer.from(ivHex, "hex"));
        const descifrado = Buffer.concat([decipher.update(Buffer.from(dataHex, "hex")), decipher.final()]);
        return descifrado.toString("utf8");
    } catch (error) {
        // Clave de cifrado cambiada, o valor corrupto: no se puede recuperar.
        return "";
    }
};

module.exports = { cifrar, descifrar };
