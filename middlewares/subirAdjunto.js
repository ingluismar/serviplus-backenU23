const multer = require("multer");
const path = require("path");

const TIPOS_PERMITIDOS = ["image/png", "image/jpeg", "image/jpg", "image/gif", "image/webp", "application/pdf"];
const TAMANO_MAXIMO = 5 * 1024 * 1024; // 5MB

const almacenamiento = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, "..", "uploads", "tickets"));
    },
    filename: (req, file, cb) => {
        const sufijo = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, sufijo + path.extname(file.originalname));
    }
});

const filtroArchivo = (req, file, cb) => {
    if (!TIPOS_PERMITIDOS.includes(file.mimetype)) {
        return cb(new Error("Solo se permiten imágenes o archivos PDF"));
    }
    cb(null, true);
};

const subirAdjunto = multer({
    storage: almacenamiento,
    fileFilter: filtroArchivo,
    limits: { fileSize: TAMANO_MAXIMO }
});

module.exports = subirAdjunto;
