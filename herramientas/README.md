# Herramientas de licenciamiento

Uso exclusivo de ServiPlus (el vendedor). Nada de esta carpeta se despliega
como parte de la aplicación en casa del cliente — no expone rutas HTTP ni
pantallas; son scripts de línea de comandos que corre quien emite licencias.

Diseño completo: ver la propuesta "Licenciamiento ServiPlus". Resumen del
mecanismo: cada licencia es un archivo `.lic` (JSON) firmado con una llave
Ed25519 que solo tiene ServiPlus. El backend del cliente (`utilidades/licencia.js`)
solo trae la mitad **pública** de esa llave, así que puede *verificar* una
licencia pero nunca *fabricar* una válida.

## 1. Generar el par de llaves (una sola vez)

```
node herramientas/generarLlaves.js
```

Guarda `herramientas/claves/privada.pem` (nunca se sube a git — ver
`.gitignore`) y `herramientas/claves/publica.pem`. Copia el PEM público que
imprime en pantalla dentro de `utilidades/licencia.js`, en la constante
`LLAVE_PUBLICA`, y despliega esa versión del backend a los clientes.

Si la llave privada se llegara a filtrar, hay que rotarla: borrar
`herramientas/claves/`, correr el script de nuevo y volver a desplegar el
backend con la nueva llave pública — las licencias ya emitidas con la llave
vieja dejan de verificar, así que hay que reemitirlas.

## 2. Emitir una licencia para un cliente

```
node herramientas/generarLicencia.js --cliente="Acme S.A.S" --plan=professional --expira=2027-08-13
```

Planes disponibles: `basic`, `professional`, `enterprise` (módulos y
límites de cada uno en `utilidades/licencia.js`, catálogo `PLANES`). Sin
`--expira`, la licencia queda perpetua (sin fecha de vencimiento). Ver
`node herramientas/generarLicencia.js` sin argumentos para el resto de
opciones (gracia, agentes, módulos a la medida, archivo de salida).

El `.lic` resultante se le envía al cliente (por correo, o se sube desde la
pantalla Configuración → Licencia una vez esté esa fase implementada).

## 3. Verificar una licencia a mano (depuración)

```
node -e "console.log(require('./utilidades/licencia').verificarLicencia(require('./acme.lic')))"
```
