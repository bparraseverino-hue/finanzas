# Finanzas — app personal para iPhone

Web app (se instala en la pantalla de inicio del iPhone) para registrar gastos e ingresos
en segundos. Cada movimiento se guarda en la hoja **Transacciones** de
tu hoja de Google, respetando sus columnas y fórmulas.

```
docs/          → la app (HTML/CSS/JS). GitHub Pages la publica desde aquí.
apps-script/   → Code.gs, el puente entre la app y tu hoja de Google.
```

## Paso 1 — Conectar la hoja (Apps Script) · 5 min

1. Abre la hoja → **Extensiones → Apps Script**.
2. Borra lo que haya en `Código.gs` y pega todo el contenido de [`apps-script/Code.gs`](apps-script/Code.gs). Guarda (⌘S).
3. Arriba, elige la función **`configurar`** y presiona **Ejecutar**. Google te pedirá permisos:
   *Revisar permisos → tu cuenta → Configuración avanzada → Ir a (proyecto) → Permitir*.
   (Es tu propio script; el aviso aparece porque Google no lo ha “verificado”.)
4. Abre **Registro de ejecución**: ahí sale `Tu clave secreta para la app es: …`. Cópiala.
5. **Implementar → Nueva implementación** → tipo **Aplicación web**:
   - Ejecutar como: **Yo**
   - Quién tiene acceso: **Cualquier usuario**
   → **Implementar** y copia la **URL de la aplicación web** (termina en `/exec`).

> “Cualquier usuario” solo significa que la URL responde sin iniciar sesión; sin tu clave
> secreta no lee ni escribe nada. Si algún día crees que alguien vio la clave, ejecuta
> `cambiarClave` y pon la nueva en la app.

**Si cambias `Code.gs` después:** Implementar → Gestionar implementaciones → ✏️ → Versión: *Nueva versión* → Implementar (así la URL no cambia).

## Paso 2 — Publicar la app (GitHub Pages) · 5 min

1. Crea un repositorio en GitHub (puede ser público; no contiene datos ni claves).
2. Sube el contenido de esta carpeta (o déjame hacer el `git push`).
3. En el repo: **Settings → Pages → Build and deployment → Deploy from a branch →
   `main` / `/docs` → Save**. En 1–2 minutos queda en `https://TU_USUARIO.github.io/NOMBRE_REPO/`.

## Paso 3 — Instalar en el iPhone

1. Abre esa dirección en **Safari**.
2. Botón **Compartir → Agregar a pantalla de inicio**.
3. Abre la app desde el ícono, pega la **URL** y la **clave** del Paso 1 → **Conectar**.

## Cómo se llena la hoja

| Columna | Qué escribe la app |
|---|---|
| A Fecha | la fecha elegida (Hoy / Ayer / otra) |
| B Año, C Mes | fórmula `YEAR`/`MONTH` igual que las demás filas |
| D Tipo, E Categoría, F Descripción, G Monto | lo que ingresas |
| H Con quién, I Mi parte, K Estado | solo si marcas “Compartido · me deben” |
| J Me deben, L Monto efectivo | las mismas fórmulas de la hoja |

Formatos y menús desplegables se copian de la fila 2. Las categorías salen de la hoja
**Categorías** (si agregas una ahí, aparece en la app al sincronizar).

Sin señal, el movimiento queda “por subir” en el teléfono y se envía solo al volver la conexión.
