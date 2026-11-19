/**
 * Backend de "Mis Finanzas" para tu hoja de finanzas en Google Sheets.
 * Escribe en "Transacciones" y lee "Categorías" (categorías y tabla de Gastos Fijos).
 *
 * Se pega en: Hoja de cálculo > Extensiones > Apps Script.
 * 1) Ejecuta la función `configurar` una vez (te muestra tu clave secreta en el registro).
 * 2) Implementar > Nueva implementación > Aplicación web
 *    - Ejecutar como: Yo
 *    - Quién tiene acceso: Cualquier usuario
 * 3) Copia la URL que termina en /exec y pégala en la app junto con la clave.
 */

const HOJA_TRANSACCIONES = 'Transacciones';
const HOJA_CATEGORIAS = 'Categorías';
const COLUMNAS = 12; // A..L
const FILA_MODELO = 2; // fila desde la que se copian formatos y validaciones

// ---------- Configuración ----------

function configurar() {
  const props = PropertiesService.getScriptProperties();
  let clave = props.getProperty('TOKEN');
  if (!clave) {
    clave = Utilities.getUuid().replace(/-/g, '').slice(0, 20);
    props.setProperty('TOKEN', clave);
  }
  Logger.log('Tu clave secreta para la app es: ' + clave);
  return clave;
}

/** Si alguna vez crees que alguien vio tu clave, ejecuta esto y usa la nueva en la app. */
function cambiarClave() {
  PropertiesService.getScriptProperties().deleteProperty('TOKEN');
  return configurar();
}

// ---------- Entrada HTTP ----------

function doGet() {
  return json_({ ok: true, app: 'Mis Finanzas', mensaje: 'Backend funcionando. Usa la app para conectarte.' });
}

function doPost(e) {
  let req = {};
  try {
    req = JSON.parse((e && e.postData && e.postData.contents) || '{}');
  } catch (err) {
    return json_({ ok: false, error: 'Solicitud inválida' });
  }
  try {
    const clave = PropertiesService.getScriptProperties().getProperty('TOKEN');
    if (!clave) return json_({ ok: false, error: 'Falta ejecutar "configurar" en Apps Script' });
    if (req.token !== clave) return json_({ ok: false, error: 'Clave incorrecta' });

    switch (req.action) {
      case 'ping':
        return json_({ ok: true });
      case 'list':
        return json_(Object.assign({ ok: true }, listar_()));
      case 'add':
        return json_(Object.assign({ ok: true }, conBloqueo_(() => agregar_(req.item || {}, req.uid))));
      case 'update':
        return json_(Object.assign({ ok: true }, conBloqueo_(() => actualizarEstado_(req))));
      case 'delete':
        return json_(Object.assign({ ok: true }, conBloqueo_(() => eliminar_(req))));
      default:
        return json_({ ok: false, error: 'Acción desconocida' });
    }
  } catch (err) {
    return json_({ ok: false, error: String((err && err.message) || err) });
  }
}

// ---------- Lectura ----------

function listar_() {
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName(HOJA_TRANSACCIONES);
  const tz = ss.getSpreadsheetTimeZone();
  const ultima = ultimaFilaConDatos_(sh);
  const items = [];

  if (ultima >= 2) {
    const valores = sh.getRange(2, 1, ultima - 1, COLUMNAS).getValues();
    valores.forEach((v, i) => {
      const [fecha, anio, mes, tipo, categoria, descripcion, monto, conQuien, miParte, meDeben, estado] = v;
      if (fecha === '' && monto === '' && descripcion === '') return;
      let fechaIso = '';
      if (fecha instanceof Date) fechaIso = Utilities.formatDate(fecha, tz, 'yyyy-MM-dd');
      items.push({
        row: i + 2,
        fecha: fechaIso,
        fechaTexto: fecha instanceof Date ? '' : String(fecha),
        anio: Number(anio) || null,
        mes: Number(mes) || null,
        tipo: String(tipo),
        categoria: String(categoria),
        descripcion: String(descripcion),
        monto: num_(monto),
        conQuien: String(conQuien || ''),
        miParte: miParte === '' ? null : num_(miParte),
        meDeben: meDeben === '' ? null : num_(meDeben),
        estado: String(estado || ''),
      });
    });
  }

  return { items: items, categorias: categorias_(ss), fijos: fijos_(ss), zona: tz };
}

function categorias_(ss) {
  const sh = ss.getSheetByName(HOJA_CATEGORIAS);
  const out = { ingreso: [], gasto: [] };
  if (!sh) return out;
  const v = sh.getRange(1, 1, sh.getLastRow(), 2).getValues();
  v.forEach(([nombre, tipo]) => {
    nombre = String(nombre || '').trim();
    tipo = String(tipo || '').trim();
    if (!nombre || /^Categorías de/i.test(nombre)) return;
    if (tipo === 'Ingreso') out.ingreso.push(nombre);
    else out.gasto.push(nombre); // "Gasto", "Gasto Variable" o categoría nueva sin tipo
  });
  return out;
}

/** Tabla "Gastos Fijos" de la hoja Categorías (columnas E:I): nombre, categoría, monto base, palabras clave, día de pago. */
function fijos_(ss) {
  const sh = ss.getSheetByName(HOJA_CATEGORIAS);
  if (!sh || sh.getLastRow() < 2) return [];
  return sh.getRange(2, 5, sh.getLastRow() - 1, 5).getValues()
    .filter((v) => String(v[0]).trim())
    .map(([nombre, categoria, base, claves, dia]) => ({
      nombre: String(nombre).trim(),
      categoria: String(categoria || '').trim(),
      base: base === '' ? null : num_(base),
      claves: String(claves || '').trim(),
      dia: dia === '' ? null : Number(dia) || null,
    }));
}

// ---------- Escritura ----------

function agregar_(item, uid) {
  const cache = CacheService.getScriptCache();
  if (uid) {
    const previa = cache.get('uid_' + uid);
    if (previa) return { row: Number(previa), duplicado: true };
  }

  const tipo = item.tipo === 'Ingreso' ? 'Ingreso' : item.tipo === 'Gasto' ? 'Gasto' : null;
  if (!tipo) throw new Error('Tipo inválido');
  const monto = Math.round(Number(item.monto));
  if (!(monto > 0)) throw new Error('Monto inválido');
  const categoria = String(item.categoria || '').trim();
  if (!categoria) throw new Error('Falta la categoría');
  const fecha = fechaDesdeIso_(item.fecha);

  const conQuien = String(item.conQuien || '').trim();
  let miParte = '';
  let estado = '';
  if (conQuien) {
    miParte = Math.max(0, Math.min(monto, Math.round(Number(item.miParte) || 0)));
    estado = ['Pendiente', 'Cobrado', 'N/A'].indexOf(item.estado) >= 0 ? item.estado : 'Pendiente';
  }

  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName(HOJA_TRANSACCIONES);
  const r = ultimaFilaConDatos_(sh) + 1;
  if (r > sh.getMaxRows()) sh.insertRowsAfter(sh.getMaxRows(), 1);

  const modelo = sh.getRange(FILA_MODELO, 1, 1, COLUMNAS);
  const destino = sh.getRange(r, 1, 1, COLUMNAS);
  modelo.copyTo(destino, SpreadsheetApp.CopyPasteType.PASTE_FORMAT, false);
  modelo.copyTo(destino, SpreadsheetApp.CopyPasteType.PASTE_DATA_VALIDATION, false);

  // Valores que escribe la app (las fórmulas se copian de la fila modelo para respetar
  // el idioma de la hoja, que usa ";" como separador).
  sh.getRange(r, 1).setValue(fecha);
  sh.getRange(r, 4, 1, 6).setValues([[tipo, categoria, String(item.descripcion || '').trim(), monto, conQuien, miParte]]);
  sh.getRange(r, 11).setValue(estado);
  const P = SpreadsheetApp.CopyPasteType.PASTE_FORMULA;
  sh.getRange(FILA_MODELO, 2, 1, 2).copyTo(sh.getRange(r, 2, 1, 2), P, false); // B Año, C Mes
  sh.getRange(FILA_MODELO, 10).copyTo(sh.getRange(r, 10), P, false); // J Me deben
  sh.getRange(FILA_MODELO, 12).copyTo(sh.getRange(r, 12), P, false); // L Monto efectivo
  SpreadsheetApp.flush();

  if (uid) cache.put('uid_' + uid, String(r), 21600);
  return { row: r };
}

function actualizarEstado_(req) {
  const sh = SpreadsheetApp.getActive().getSheetByName(HOJA_TRANSACCIONES);
  const r = verificarFila_(sh, req);
  const estado = ['Pendiente', 'Cobrado', 'N/A'].indexOf(req.estado) >= 0 ? req.estado : null;
  if (!estado) throw new Error('Estado inválido');
  sh.getRange(r, 11).setValue(estado);
  return { row: r };
}

function eliminar_(req) {
  const sh = SpreadsheetApp.getActive().getSheetByName(HOJA_TRANSACCIONES);
  const r = verificarFila_(sh, req);
  sh.deleteRow(r);
  sh.insertRowsAfter(sh.getMaxRows(), 1); // mantiene el mismo número total de filas
  return { row: r };
}

/** Confirma que la fila sigue siendo la misma transacción antes de tocarla. */
function verificarFila_(sh, req) {
  const r = Number(req.row);
  if (!(r >= 2)) throw new Error('Fila inválida');
  const v = sh.getRange(r, 1, 1, COLUMNAS).getValues()[0];
  const mismaDesc = String(v[5]).trim() === String(req.descripcion || '').trim();
  const mismoMonto = num_(v[6]) === Math.round(Number(req.monto));
  if (!mismaDesc || !mismoMonto) {
    throw new Error('La hoja cambió desde la última sincronización. Actualiza e intenta de nuevo.');
  }
  return r;
}

// ---------- Utilidades ----------

function ultimaFilaConDatos_(sh) {
  const max = sh.getMaxRows();
  if (max < 2) return 1;
  const v = sh.getRange(2, 1, max - 1, 7).getValues(); // columnas A..G
  for (let i = v.length - 1; i >= 0; i--) {
    if (v[i][0] !== '' || v[i][5] !== '' || v[i][6] !== '') return i + 2;
  }
  return 1;
}

function fechaDesdeIso_(s) {
  // Se interpreta en la zona horaria de la hoja para que el día nunca se corra.
  const tz = SpreadsheetApp.getActive().getSpreadsheetTimeZone();
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(String(s || '')) ? String(s) : Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd');
  return Utilities.parseDate(iso, tz, 'yyyy-MM-dd');
}

function num_(x) {
  if (typeof x === 'number') return Math.round(x);
  const n = Number(String(x).replace(/[^\d-]/g, ''));
  return isNaN(n) ? 0 : n;
}

function conBloqueo_(fn) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    return fn();
  } finally {
    lock.releaseLock();
  }
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
