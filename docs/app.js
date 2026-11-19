/* Mis Finanzas — web app personal conectada a Google Sheets */
(() => {
  'use strict';

  // ---------------------------------------------------------------- utilidades
  const $ = (s, el = document) => el.querySelector(s);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const MES_CORTO = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const nf = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 0 });
  const fmt = (n) => (n < 0 ? '−$' : '$') + nf.format(Math.abs(Math.round(n || 0)));
  const fmtShort = (n) => {
    const a = Math.abs(n);
    if (a >= 1e6) return '$' + (n / 1e6).toLocaleString('es-CL', { maximumFractionDigits: 1 }) + 'M';
    if (a >= 1e3) return '$' + Math.round(n / 1e3) + 'k';
    return '$' + Math.round(n);
  };
  const pad = (n) => String(n).padStart(2, '0');
  const isoDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const today = () => isoDate(new Date());
  const yesterday = () => { const d = new Date(); d.setDate(d.getDate() - 1); return isoDate(d); };
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const shortCat = (c) => String(c).replace(/\s*\(.*\)\s*/, '');
  const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();

  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
    del(k) { try { localStorage.removeItem(k); } catch {} },
  };

  const EMOJI = [
    [/sueldo/, '💼'], [/freelance|extra/, '🧑‍💻'], [/ahorro/, '🏦'], [/inversi/, '📈'], [/bono/, '🎁'],
    [/otros ingresos/, '💰'], [/vivienda|casa/, '🏠'], [/aliment|comida/, '🍽️'], [/transporte|auto/, '🚗'],
    [/servicio/, '💡'], [/salud/, '🩺'], [/educa/, '📚'], [/ocio|entreten/, '🎉'], [/ropa|cuidado/, '👕'],
    [/mascota/, '🐾'], [/deuda|credito/, '💳'], [/regalo/, '🎁'], [/otro/, '📦'],
  ];
  const emoji = (cat) => { const n = norm(cat); for (const [re, e] of EMOJI) if (re.test(n)) return e; return '🏷️'; };

  const DEFAULT_CATS = {
    ingreso: ['Sueldo', 'Freelance / Trabajos extra', 'Inversiones', 'Bonos y regalos', 'Otros ingresos'],
    gasto: ['Vivienda', 'Alimentación', 'Transporte', 'Servicios básicos (luz, agua, internet)', 'Salud', 'Educación',
      'Ocio y entretenimiento', 'Ropa y cuidado personal', 'Mascotas', 'Ahorro e inversión', 'Deudas y créditos', 'Otros gastos', 'Regalos'],
  };

  const ICON = {
    home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 11.5 12 5l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5h-5v5H5a1 1 0 0 1-1-1z"/></svg>',
    list: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1" fill="currentColor"/><circle cx="4.5" cy="12" r="1" fill="currentColor"/><circle cx="4.5" cy="18" r="1" fill="currentColor"/></svg>',
    people: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8.5" r="3.5"/><path d="M2.5 20c.6-3.4 3.2-5.5 6.5-5.5s5.9 2.1 6.5 5.5"/><path d="M16 5.2a3.3 3.3 0 0 1 0 6.6M18.2 14.8c1.8.7 3 2.5 3.3 5.2"/></svg>',
    gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
    sync: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 11a8 8 0 0 0-14.3-4.9L4 8"/><path d="M4 4v4h4"/><path d="M4 13a8 8 0 0 0 14.3 4.9L20 16"/><path d="M20 20v-4h-4"/></svg>',
    cloudOff: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3l18 18"/><path d="M8.5 6.3A6 6 0 0 1 17.7 10H18a4 4 0 0 1 2.3 7.3M17 18H7a5 5 0 0 1-2.6-9.3"/></svg>',
    left: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m15 5-7 7 7 7"/></svg>',
    right: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m9 5 7 7-7 7"/></svg>',
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
    back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 5H9l-6 7 6 7h12a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1z"/><path d="m16 9-5 6M11 9l5 6"/></svg>',
  };

  // ---------------------------------------------------------------- estado
  const now = new Date();
  const S = {
    cfg: store.get('fin.cfg', null), // {url, token} | {demo:true}
    items: store.get('fin.items', []),
    categorias: store.get('fin.cats', DEFAULT_CATS),
    queue: store.get('fin.queue', []),
    lastSync: store.get('fin.lastSync', null),
    view: 'resumen',
    ym: { y: now.getFullYear(), m: now.getMonth() + 1 },
    filtro: 'todos',
    q: '',
    showAllCats: false,
    syncing: false,
    error: null,
    openPerson: null,
  };
  const save = () => {
    store.set('fin.items', S.items);
    store.set('fin.cats', S.categorias);
    store.set('fin.queue', S.queue);
    store.set('fin.lastSync', S.lastSync);
  };

  // ---------------------------------------------------------------- datos
  function normItem(it, pending) {
    let y, m, d;
    if (it.fecha && /^\d{4}-\d{2}-\d{2}$/.test(it.fecha)) [y, m, d] = it.fecha.split('-').map(Number);
    else { y = it.anio || null; m = it.mes || null; d = 1; }
    const monto = Number(it.monto) || 0;
    const shared = !!(it.conQuien && String(it.conQuien).trim());
    const miParte = it.miParte === null || it.miParte === undefined || it.miParte === '' ? null : Number(it.miParte);
    const efectivo = miParte !== null ? miParte : monto; // igual que la columna "Monto efectivo"
    let meDeben = it.meDeben;
    if (meDeben === null || meDeben === undefined) meDeben = shared ? monto - (miParte || 0) : 0;
    return {
      ...it, y, m, d, monto, miParte, efectivo, meDeben: Number(meDeben) || 0, shared,
      key: pending ? 'q:' + it.uid : 'r:' + it.row, pending: !!pending,
      ts: y ? new Date(y, m - 1, d).getTime() : 0,
    };
  }
  function allItems() {
    const base = S.items.map((i) => normItem(i, false));
    const q = S.queue.map((op) => normItem({ ...op.item, uid: op.uid }, true));
    return base.concat(q);
  }
  const inMonth = (list, y, m) => list.filter((i) => i.y === y && i.m === m);
  function totals(list) {
    let ing = 0, gas = 0;
    for (const i of list) { if (i.tipo === 'Ingreso') ing += i.efectivo; else if (i.tipo === 'Gasto') gas += i.efectivo; }
    return { ing, gas, saldo: ing - gas };
  }
  function people() {
    const map = new Map();
    for (const i of allItems()) if (i.shared) {
      const k = norm(i.conQuien);
      if (!map.has(k)) map.set(k, { name: i.conQuien.trim(), n: 0, last: 0 });
      const p = map.get(k); p.n++; p.last = Math.max(p.last, i.ts);
    }
    return [...map.values()].sort((a, b) => b.last - a.last || b.n - a.n);
  }

  // ---------------------------------------------------------------- API
  async function api(action, payload = {}) {
    if (S.cfg && S.cfg.demo) return Demo.handle(action, payload);
    if (!S.cfg || !S.cfg.url) throw new Error('Sin configurar');
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 30000);
    try {
      const res = await fetch(S.cfg.url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ token: S.cfg.token, action, ...payload }),
        redirect: 'follow',
        signal: ctrl.signal,
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Error del servidor');
      return data;
    } catch (e) {
      if (e.name === 'AbortError') throw new Error('Sin respuesta (tiempo agotado)');
      if (e instanceof TypeError) throw new Error('Sin conexión');
      throw e;
    } finally { clearTimeout(t); }
  }

  let syncAgain = false;
  async function sync({ quiet = true } = {}) {
    if (!S.cfg) return;
    if (S.syncing) { syncAgain = true; return; }
    S.syncing = true; renderStatus();
    try {
      while (S.queue.length) {
        const op = S.queue[0];
        await api('add', { item: op.item, uid: op.uid });
        S.queue.shift(); save();
      }
      const data = await api('list');
      S.items = data.items || [];
      if (data.categorias && (data.categorias.gasto.length || data.categorias.ingreso.length)) S.categorias = data.categorias;
      S.lastSync = Date.now(); S.error = null; save();
      if (!quiet) toast('Sincronizado con tu hoja ✓');
    } catch (e) {
      S.error = e.message;
      if (!quiet) toast(e.message);
    } finally {
      S.syncing = false;
      render();
      if (syncAgain) { syncAgain = false; sync(); }
    }
  }

  // ---------------------------------------------------------------- render principal
  function render() {
    const v = $('#view');
    if (!S.cfg) { v.innerHTML = viewSetup(); $('#tabbar').innerHTML = ''; return; }
    const views = { resumen: viewResumen, movimientos: viewMovimientos, cobros: viewCobros, ajustes: viewAjustes };
    const searchFocused = document.activeElement && document.activeElement.id === 'q';
    v.innerHTML = views[S.view]();
    renderTabbar();
    if (searchFocused) { const q = $('#q'); q.focus(); q.setSelectionRange(q.value.length, q.value.length); }
  }

  function renderTabbar() {
    const t = (id, icon, label) => `<button class="tab ${S.view === id ? 'on' : ''}" data-a="tab" data-v="${id}">${ICON[icon]}<span>${label}</span></button>`;
    $('#tabbar').innerHTML = `<div class="inner">
      ${t('resumen', 'home', 'Resumen')}${t('movimientos', 'list', 'Movimientos')}
      <button class="fab" data-a="add" aria-label="Agregar movimiento">${ICON.plus}</button>
      ${t('cobros', 'people', 'Cobros')}${t('ajustes', 'gear', 'Ajustes')}</div>`;
  }

  function statusBtn() {
    const pend = S.queue.length;
    let cls = '', icon = ICON.sync, label = 'Sincronizar';
    if (S.syncing) cls = 'spin';
    else if (S.error) { cls = 'alert'; icon = ICON.cloudOff; label = 'Error de sincronización: ' + S.error; }
    return `<button class="iconbtn ${cls}" id="statusbtn" data-a="sync" aria-label="${esc(label)}" style="position:relative">${icon}${pend ? `<span class="badge pend" style="position:absolute;top:-6px;right:-10px;margin:0">${pend}</span>` : ''}</button>`;
  }
  function renderStatus() { const b = $('#statusbtn'); if (b) b.outerHTML = statusBtn(); }

  function header(title) {
    return `<div class="top"><h1 class="title">${title}</h1>${statusBtn()}</div>`;
  }
  function monthNav() {
    const { y, m } = S.ym;
    const isNow = y === now.getFullYear() && m === now.getMonth() + 1;
    return `<div class="monthnav">
      <button class="arrow" data-a="month" data-d="-1" aria-label="Mes anterior">${ICON.left}</button>
      <button class="label" data-a="monthnow">${MESES[m - 1]} ${y}${isNow ? '' : ' <span class="badge">volver a hoy</span>'}</button>
      <button class="arrow" data-a="month" data-d="1" aria-label="Mes siguiente">${ICON.right}</button></div>`;
  }
  function banner() {
    const parts = [];
    if (S.cfg && S.cfg.demo) parts.push('Estás en <b>modo demo</b> con datos de ejemplo. Conecta tu hoja en Ajustes.');
    if (S.error && !S.syncing) parts.push(`No se pudo sincronizar (${esc(S.error)}).${S.queue.length ? ` Tienes ${S.queue.length} movimiento(s) guardado(s) en el teléfono; se subirán solos.` : ''}`);
    return parts.length ? `<div class="banner">ⓘ <div>${parts.join('<br>')}</div></div>` : '';
  }

  // ----- Resumen
  function viewResumen() {
    const all = allItems();
    const { y, m } = S.ym;
    const mes = inMonth(all, y, m);
    const t = totals(mes);
    const sum = t.ing + t.gas;

    // gastos por categoría
    const byCat = new Map();
    for (const i of mes) if (i.tipo === 'Gasto' && i.efectivo > 0) byCat.set(i.categoria, (byCat.get(i.categoria) || 0) + i.efectivo);
    const cats = [...byCat.entries()].sort((a, b) => b[1] - a[1]);
    const maxCat = cats.length ? cats[0][1] : 1;
    const shown = S.showAllCats ? cats : cats.slice(0, 6);
    const catRows = shown.map(([c, v]) => `
      <div class="catrow">
        <div class="em">${emoji(c)}</div>
        <div class="n">${esc(shortCat(c))}</div>
        <div class="a num">${fmt(v)}</div>
        <div class="bar"><span style="width:${Math.max(2, (v / maxCat) * 100).toFixed(1)}%"></span></div>
        <div class="p num">${t.gas ? Math.round((v / t.gas) * 100) : 0}%</div>
      </div>`).join('');

    // cobros pendientes
    const pend = all.filter((i) => i.shared && i.estado === 'Pendiente' && i.meDeben > 0);
    const pendTot = pend.reduce((s, i) => s + i.meDeben, 0);
    const pendPeople = new Set(pend.map((i) => norm(i.conQuien))).size;

    return `${header('Resumen')}${banner()}${monthNav()}
      <section class="card hero">
        <div class="label">Saldo del mes</div>
        <div class="big num">${fmt(t.saldo)}</div>
        <div class="split">
          <div class="pill"><div class="k"><span class="sw ing"></span>Ingresos</div><div class="v num">${fmt(t.ing)}</div></div>
          <div class="pill"><div class="k"><span class="sw gas"></span>Gastos</div><div class="v num">${fmt(t.gas)}</div></div>
        </div>
        ${sum ? `<div class="ratio" role="img" aria-label="Ingresos ${fmt(t.ing)}, gastos ${fmt(t.gas)}">
          ${t.ing ? `<span style="width:${(t.ing / sum) * 100}%;background:var(--ingreso)"></span>` : ''}
          ${t.gas ? `<span style="width:${(t.gas / sum) * 100}%;background:var(--gasto)"></span>` : ''}</div>
          <div class="ratio-cap">${t.ing ? `Gastaste el ${Math.round((t.gas / t.ing) * 100)}% de lo que ingresó este mes` : 'Aún no registras ingresos este mes'}</div>` : ''}
      </section>

      ${pendTot ? `<button class="card owe" data-a="tab" data-v="cobros" style="width:100%;text-align:left">
        <div><div class="label" style="font-size:14px;color:var(--ink-2);font-weight:500">Te deben</div>
        <div class="v num">${fmt(pendTot)}</div><div class="s">${pendPeople} persona${pendPeople === 1 ? '' : 's'} · ${pend.length} pendiente${pend.length === 1 ? '' : 's'}</div></div>
        <span class="chev">${ICON.right}</span></button>` : ''}

      <section class="card">
        <h3>Gastos por categoría <small>${cats.length} categoría${cats.length === 1 ? '' : 's'}</small></h3>
        ${cats.length ? catRows : `<div class="empty"><span class="e">🧾</span>Sin gastos en ${MESES[m - 1]}. Toca <b>+</b> para agregar uno.</div>`}
        ${cats.length > 6 ? `<button class="more" data-a="morecats">${S.showAllCats ? 'Ver menos' : `Ver las ${cats.length} categorías`}</button>` : ''}
      </section>

      <section class="card trend">
        <h3>Últimos 6 meses</h3>
        ${trendChart(all)}
        <div class="hint">Toca un mes para verlo en detalle.</div>
      </section>`;
  }

  function trendChart(all) {
    const months = [];
    for (let k = 5; k >= 0; k--) {
      const d = new Date(S.ym.y, S.ym.m - 1 - k, 1);
      const y = d.getFullYear(), m = d.getMonth() + 1;
      months.push({ y, m, ...totals(inMonth(all, y, m)) });
    }
    const sel = months[5];
    const W = 340, H = 168, L = 34, R = 4, T = 8, B = 24;
    const max = Math.max(1, ...months.map((x) => Math.max(x.ing, x.gas)));
    const step = niceStep(max / 2);
    const top = Math.ceil(max / step) * step;
    const ys = (v) => T + (H - T - B) * (1 - v / top);
    const gw = (W - L - R) / 6, bw = Math.min(16, gw / 2 - 6);
    let grid = '';
    for (let v = 0; v <= top; v += step) {
      grid += `<line class="${v === 0 ? 'base' : 'grid'}" x1="${L}" x2="${W - R}" y1="${ys(v)}" y2="${ys(v)}"/>`;
      grid += `<text class="ylab" x="${L - 6}" y="${ys(v) + 3.5}" text-anchor="end">${v === 0 ? '0' : fmtShort(v)}</text>`;
    }
    const bars = months.map((x, i) => {
      const cx = L + gw * i + gw / 2;
      const isSel = i === 5;
      const p1 = barPath(cx - bw - 1, ys(x.ing), bw, ys(0) - ys(x.ing), 4);
      const p2 = barPath(cx + 1, ys(x.gas), bw, ys(0) - ys(x.gas), 4);
      return `<g class="grp ${isSel ? '' : 'dim'}" data-a="pickmonth" data-y="${x.y}" data-m="${x.m}" role="button" aria-label="${MESES[x.m - 1]}: ingresos ${fmt(x.ing)}, gastos ${fmt(x.gas)}">
        <rect x="${L + gw * i + 2}" y="${T}" width="${gw - 4}" height="${H - T}" rx="8" fill="${isSel ? 'var(--card-2)' : 'transparent'}"/>
        ${p1 ? `<path class="bi" d="${p1}"/>` : ''}${p2 ? `<path class="bg" d="${p2}"/>` : ''}
        <text class="xlab ${isSel ? 'sel' : ''}" x="${cx}" y="${H - 7}" text-anchor="middle">${MES_CORTO[x.m - 1]}</text></g>`;
    }).join('');
    return `<div class="legend"><span><span class="sw ing"></span>Ingresos <b class="num">${fmt(sel.ing)}</b></span><span><span class="sw gas"></span>Gastos <b class="num">${fmt(sel.gas)}</b></span></div>
      <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Ingresos y gastos de los últimos 6 meses">${grid}${bars}</svg>`;
  }
  function niceStep(x) {
    const p = Math.pow(10, Math.floor(Math.log10(x)));
    const f = x / p;
    return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p;
  }
  function barPath(x, y, w, h, r) {
    if (!(h > 0.5)) return '';
    r = Math.min(r, h, w / 2);
    return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
  }

  // ----- Movimientos
  function viewMovimientos() {
    const { y, m } = S.ym;
    let list = inMonth(allItems(), y, m);
    if (S.filtro === 'gastos') list = list.filter((i) => i.tipo === 'Gasto');
    if (S.filtro === 'ingresos') list = list.filter((i) => i.tipo === 'Ingreso');
    if (S.q) { const q = norm(S.q); list = list.filter((i) => norm(i.descripcion + ' ' + i.categoria + ' ' + i.conQuien).includes(q)); }
    list.sort((a, b) => b.ts - a.ts || (b.pending - a.pending) || (b.row || 0) - (a.row || 0));

    const groups = [];
    for (const i of list) {
      const k = i.d + '-' + i.m;
      if (!groups.length || groups[groups.length - 1].k !== k) groups.push({ k, i, items: [] });
      groups[groups.length - 1].items.push(i);
    }
    const t = totals(list);
    const body = groups.map((g) => {
      const day = new Date(g.i.y, g.i.m - 1, g.i.d);
      const lbl = g.i.fecha ? `${DIAS[day.getDay()]} ${g.i.d} ${MES_CORTO[g.i.m - 1]}` : 'Sin fecha exacta';
      const net = g.items.reduce((s, i) => s + (i.tipo === 'Ingreso' ? i.efectivo : -i.efectivo), 0);
      return `<div class="day"><span>${lbl}</span><span class="num">${fmt(net)}</span></div>
        <div class="list">${g.items.map(txRow).join('')}</div>`;
    }).join('');

    return `${header('Movimientos')}${banner()}${monthNav()}
      <div class="search">${ICON.search}<input id="q" type="search" placeholder="Buscar" value="${esc(S.q)}" autocomplete="off"></div>
      <div class="filters seg">
        ${['todos', 'gastos', 'ingresos'].map((f) => `<button class="${S.filtro === f ? 'on' : ''}" data-a="filtro" data-f="${f}">${f[0].toUpperCase() + f.slice(1)}</button>`).join('')}
      </div>
      ${list.length ? `<div class="legend" style="justify-content:space-between"><span>${list.length} movimiento${list.length === 1 ? '' : 's'}</span><span>Neto <b class="num">${fmt(t.saldo)}</b></span></div>${body}`
        : `<div class="card empty"><span class="e">🔎</span>No hay movimientos ${S.q ? 'que coincidan' : 'en ' + MESES[m - 1]}.</div>`}`;
  }
  function txRow(i) {
    const ing = i.tipo === 'Ingreso';
    const sub = [shortCat(i.categoria)];
    if (i.shared) sub.push('con ' + i.conQuien);
    const desc = i.descripcion || shortCat(i.categoria);
    return `<button class="tx" data-a="detail" data-k="${esc(i.key)}">
      <div class="em">${emoji(i.categoria)}</div>
      <div style="min-width:0"><div class="d">${esc(desc)}</div>
        <div class="c">${esc(sub.join(' · '))}${i.pending ? '<span class="badge pend">por subir</span>' : ''}${i.shared && i.estado === 'Pendiente' ? '<span class="badge pend">te deben</span>' : ''}</div></div>
      <div class="m num ${ing ? 'ing' : ''}">${i.efectivo ? (ing ? '+' : '−') : ''}${fmt(i.efectivo).replace('−', '')}
        ${i.shared && i.efectivo !== i.monto ? `<small>de ${fmt(i.monto)}</small>` : ''}</div>
    </button>`;
  }

  // ----- Cobros
  function viewCobros() {
    const all = allItems().filter((i) => i.shared && i.meDeben > 0);
    const map = new Map();
    for (const i of all) {
      const k = norm(i.conQuien);
      if (!map.has(k)) map.set(k, { k, name: i.conQuien.trim(), pend: 0, cobr: 0, items: [] });
      const p = map.get(k);
      if (i.estado === 'Pendiente') { p.pend += i.meDeben; p.items.push(i); }
      else if (i.estado === 'Cobrado') p.cobr += i.meDeben;
    }
    const ps = [...map.values()].sort((a, b) => b.pend - a.pend || b.cobr - a.cobr);
    const total = ps.reduce((s, p) => s + p.pend, 0);
    const cards = ps.map((p) => {
      const open = S.openPerson === p.k;
      p.items.sort((a, b) => b.ts - a.ts);
      return `<section class="card person">
        <button class="head" data-a="person" data-k="${esc(p.k)}">
          <div class="avatar">${esc(p.name[0] || '?')}</div>
          <div class="who"><b>${esc(p.name)}</b><span>${p.items.length ? `${p.items.length} pendiente${p.items.length === 1 ? '' : 's'}` : 'Al día ✓'} · cobrado ${fmt(p.cobr)}</span></div>
          <div class="tot"><b class="num">${fmt(p.pend)}</b><span>te debe</span></div>
        </button>
        ${open && p.items.length ? `<div class="items">${p.items.map((i) => `
          <div class="prow"><div class="d">${esc(i.descripcion || i.categoria)}<small>${i.fecha ? `${i.d} ${MES_CORTO[i.m - 1]} ${i.y}` : ''} · total ${fmt(i.monto)}</small></div>
            <div class="a num">${fmt(i.meDeben)}</div>
            ${i.pending ? '<span class="badge pend">por subir</span>' : `<button class="mini" data-a="cobrar" data-k="${esc(i.key)}">Cobrado</button>`}
          </div>`).join('')}</div>` : ''}
      </section>`;
    }).join('');
    return `${header('Cobros')}${banner()}
      <section class="card hero"><div class="label">Total que te deben</div><div class="big num" style="margin-bottom:4px">${fmt(total)}</div>
        <div class="ratio-cap" style="margin-top:0">Se calcula con “Con quién”, “Mi parte” y “Estado” de tu hoja.</div></section>
      ${ps.length ? cards : '<div class="card empty"><span class="e">🤝</span>Cuando registres un gasto compartido aparecerá aquí.</div>'}`;
  }

  // ----- Ajustes
  function viewAjustes() {
    const demo = S.cfg && S.cfg.demo;
    const last = S.lastSync ? new Date(S.lastSync) : null;
    return `${header('Ajustes')}${banner()}
      <section class="card">
        <h3>Conexión</h3>
        <div class="kv"><span>Modo</span><span>${demo ? 'Demo (datos de ejemplo)' : 'Google Sheets'}</span></div>
        <div class="kv"><span>Última sincronización</span><span>${last ? `${last.getDate()} ${MES_CORTO[last.getMonth()]} · ${pad(last.getHours())}:${pad(last.getMinutes())}` : '—'}</span></div>
        <div class="kv"><span>Movimientos en la hoja</span><span class="num">${S.items.length}</span></div>
        <div class="kv"><span>Por subir</span><span class="num">${S.queue.length}</span></div>
        ${S.error ? `<div class="kv"><span>Último error</span><span style="color:var(--neg-text)">${esc(S.error)}</span></div>` : ''}
        <div class="stack" style="margin-top:12px">
          <button class="btn" data-a="sync-loud">Sincronizar ahora</button>
          <button class="btn secondary" data-a="reconfig">${demo ? 'Conectar mi hoja de Google' : 'Cambiar URL o clave'}</button>
        </div>
      </section>
      <section class="card note">
        <h3>Cómo funciona</h3>
        Cada movimiento se guarda primero en el teléfono y se sube enseguida a la hoja <b>Transacciones</b>.
        Si no tienes señal, queda “por subir” y se envía solo cuando vuelva la conexión.
        Lo que edites directo en la hoja aparece aquí al sincronizar.
      </section>
      ${!demo ? `<button class="btn danger" data-a="logout">Desconectar este teléfono</button>` : `<button class="btn danger" data-a="logout">Salir del modo demo</button>`}`;
  }

  // ----- Setup
  function viewSetup(prefill) {
    const c = prefill || {};
    return `<div class="welcome"><img class="logo" src="icons/icon-192.png" alt=""><h1>Finanzas</h1><p>Tus gastos e ingresos, directo a tu hoja.</p></div>
      <section class="card">
        <div class="field"><label for="cfg-url">URL de tu Apps Script</label><input id="cfg-url" type="url" inputmode="url" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="https://script.google.com/macros/s/…/exec" value="${esc(c.url || '')}"></div>
        <div class="field"><label for="cfg-token">Clave secreta</label><input id="cfg-token" type="password" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="La que te dio la función configurar" value="${esc(c.token || '')}"></div>
        <button class="btn" data-a="connect" id="connect">Conectar</button>
      </section>
      <section class="card note">
        <h3>¿Dónde encuentro esto?</h3>
        <ol><li>En tu hoja: <b>Extensiones → Apps Script</b>, pega el código de <i>Code.gs</i>.</li>
        <li>Ejecuta <b>configurar</b> y copia la clave del registro.</li>
        <li><b>Implementar → Nueva implementación → Aplicación web</b>, acceso “Cualquier usuario”, y copia la URL.</li></ol>
      </section>
      <button class="btn secondary" data-a="demo">Probar con datos de ejemplo</button>`;
  }

  // ---------------------------------------------------------------- hojas (sheets)
  let sheetCleanup = null;
  function openSheet(html, cls = '') {
    const root = $('#sheet-root');
    root.innerHTML = `<div class="backdrop" data-a="close"></div><div class="sheet ${cls}" role="dialog" aria-modal="true"><div class="grab"></div>${html}</div>`;
    requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('open')));
    return $('.sheet', root);
  }
  function closeSheet() {
    const root = $('#sheet-root');
    root.classList.remove('open');
    if (sheetCleanup) { sheetCleanup(); sheetCleanup = null; }
    if (document.activeElement) document.activeElement.blur();
    setTimeout(() => { if (!root.classList.contains('open')) root.innerHTML = ''; }, 320);
  }

  // ----- Agregar movimiento
  let A = null;
  function catUsage(tipo) {
    const cut = Date.now() - 120 * 864e5;
    const c = new Map();
    for (const i of allItems()) if (i.tipo === tipo && i.ts >= cut) c.set(i.categoria, (c.get(i.categoria) || 0) + 1);
    return c;
  }
  function catList() {
    const base = A.tipo === 'Ingreso' ? S.categorias.ingreso : S.categorias.gasto;
    const used = catUsage(A.tipo);
    const extra = [...used.keys()].filter((c) => c && !base.includes(c));
    return [...base, ...extra].map((c, idx) => ({ c, n: used.get(c) || 0, idx })).sort((a, b) => b.n - a.n || a.idx - b.idx).map((x) => x.c);
  }

  function openAdd() {
    A = { tipo: 'Gasto', monto: '', categoria: null, descripcion: '', fecha: today(), compartido: false, conQuien: '', parte: 'nada', miParte: '', estado: 'Pendiente' };
    const sheet = openSheet(`
      <div class="sbar"><button class="l" data-a="close">Cancelar</button>
        <div class="seg tipo" id="a-tipo"></div><span class="r"></span></div>
      <div class="sbody">
        <div class="amount"><div class="v num" id="a-amount"></div></div>
        <div class="chips dates" id="a-dates"></div>
        <div class="lbl">Categoría</div>
        <div class="cats" id="a-cats"></div>
        <div class="lbl">Descripción</div>
        <input class="text" id="a-desc" type="text" placeholder="Ej: almuerzo, supermercado…" autocomplete="off" enterkeyhint="done">
        <div class="chips sugs" id="a-sugs"></div>
        <div id="a-shared"></div>
      </div>
      <div class="sfoot">
        <div class="keypad" id="a-keys">
          ${['1', '2', '3', '4', '5', '6', '7', '8', '9', '000', '0', 'del'].map((k) => `<button data-a="key" data-k="${k}" aria-label="${k === 'del' ? 'Borrar' : k}">${k === 'del' ? ICON.back : k}</button>`).join('')}
        </div>
        <button class="btn" id="a-save" data-a="save"></button>
      </div>`, 'add');

    const desc = $('#a-desc', sheet);
    desc.addEventListener('input', () => { A.descripcion = desc.value; updSugs(); updSave(); });
    desc.addEventListener('keydown', (e) => { if (e.key === 'Enter') desc.blur(); });
    const onFocus = (e) => { if (e.target.matches('input:not([type=date])')) sheet.classList.add('typing'); };
    const onBlur = () => setTimeout(() => { if (!sheet.contains(document.activeElement) || !document.activeElement.matches('input:not([type=date])')) sheet.classList.remove('typing'); }, 50);
    sheet.addEventListener('focusin', onFocus);
    sheet.addEventListener('focusout', onBlur);
    sheet.addEventListener('change', (e) => {
      if (e.target.id === 'a-date') { A.fecha = e.target.value || today(); updDates(); }
    });
    sheet.addEventListener('input', (e) => {
      if (e.target.id === 'a-who') { A.conQuien = e.target.value; updOwe(); updWhoChips(); updSave(); }
      if (e.target.id === 'a-parte') { A.miParte = e.target.value.replace(/\D/g, ''); updOwe(); }
    });
    updAll();
  }
  function updAll() { updTipo(); updAmount(); updDates(); updCats(); updSugs(); updShared(); updSave(); }
  function updTipo() {
    $('#a-tipo').innerHTML = `<button class="g ${A.tipo === 'Gasto' ? 'on' : ''}" data-a="tipo" data-t="Gasto">Gasto</button><button class="i ${A.tipo === 'Ingreso' ? 'on' : ''}" data-a="tipo" data-t="Ingreso">Ingreso</button>`;
  }
  function updAmount(pop) {
    const el = $('#a-amount');
    const n = Number(A.monto || 0);
    el.textContent = fmt(n);
    el.classList.toggle('zero', !n);
    if (pop) { el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); }
    if (A.compartido) updOwe();
  }
  function updDates() {
    const t = today(), ye = yesterday();
    const other = A.fecha !== t && A.fecha !== ye;
    $('#a-dates').innerHTML = `
      <button class="chip ${A.fecha === t ? 'on' : ''}" data-a="fecha" data-f="${t}">Hoy</button>
      <button class="chip ${A.fecha === ye ? 'on' : ''}" data-a="fecha" data-f="${ye}">Ayer</button>
      <label class="chip datechip ${other ? 'on' : ''}">📅 ${other ? (() => { const [y, m, d] = A.fecha.split('-').map(Number); return `${d} ${MES_CORTO[m - 1]}${y !== new Date().getFullYear() ? ' ' + y : ''}`; })() : 'Otra fecha'}
        <input type="date" id="a-date" value="${A.fecha}" max="${t}" aria-label="Elegir otra fecha"></label>`;
  }
  function updCats() {
    $('#a-cats').innerHTML = catList().map((c) => `<button class="cat ${A.categoria === c ? 'on' : ''}" data-a="cat" data-c="${esc(c)}"><span class="e">${emoji(c)}</span>${esc(shortCat(c))}</button>`).join('');
  }
  function updSugs() {
    const q = norm(A.descripcion);
    const el = $('#a-sugs');
    if (q.length < 2) { el.innerHTML = ''; return; }
    const seen = new Set(), out = [];
    const items = allItems().filter((i) => i.tipo === A.tipo && i.descripcion).sort((a, b) => b.ts - a.ts);
    for (const i of items) {
      const nd = norm(i.descripcion);
      if (nd === q || seen.has(nd) || !nd.includes(q)) continue;
      seen.add(nd); out.push(i);
      if (out.length >= 5) break;
    }
    el.innerHTML = out.map((i) => `<button class="chip sug" data-a="sug" data-k="${esc(i.key)}">${esc(i.descripcion)} <em>${emoji(i.categoria)} ${fmtShort(i.monto)}</em></button>`).join('');
  }
  function updShared() {
    const el = $('#a-shared');
    if (A.tipo !== 'Gasto') { el.innerHTML = ''; return; }
    el.innerHTML = `
      <button class="toggle" data-a="shared"><div><b>Compartido · me deben</b><span>Pagaste tú y otra persona te debe una parte</span></div><div class="switch ${A.compartido ? 'on' : ''}"></div></button>
      ${A.compartido ? `<div class="shared">
        <div class="lbl">Con quién</div>
        <div class="chips" id="a-whochips"></div>
        <input class="text" id="a-who" type="text" placeholder="Nombre" value="${esc(A.conQuien)}" autocomplete="off" style="margin-top:8px">
        <div class="lbl">Mi parte</div>
        <div class="chips">
          <button class="chip ${A.parte === 'nada' ? 'on' : ''}" data-a="parte" data-p="nada">Nada, me deben todo</button>
          <button class="chip ${A.parte === 'mitad' ? 'on' : ''}" data-a="parte" data-p="mitad">La mitad</button>
          <button class="chip ${A.parte === 'otro' ? 'on' : ''}" data-a="parte" data-p="otro">Otro monto</button>
        </div>
        ${A.parte === 'otro' ? `<input class="text" id="a-parte" type="text" inputmode="numeric" pattern="[0-9]*" placeholder="Lo que pagaste tú" value="${esc(A.miParte)}" style="margin-top:8px">` : ''}
        <div class="lbl">Estado</div>
        <div class="seg">${['Pendiente', 'Cobrado'].map((e) => `<button class="${A.estado === e ? 'on' : ''}" data-a="estado" data-e="${e}">${e}</button>`).join('')}</div>
        <div class="owe-line" id="a-owe"></div>
      </div>` : ''}`;
    if (A.compartido) { updWhoChips(); updOwe(); }
  }
  function updWhoChips() {
    const el = $('#a-whochips'); if (!el) return;
    const ps = people().slice(0, 8);
    el.innerHTML = ps.map((p) => `<button class="chip ${norm(A.conQuien) === norm(p.name) ? 'on' : ''}" data-a="who" data-n="${esc(p.name)}">${esc(p.name)}</button>`).join('');
    el.style.display = ps.length ? '' : 'none';
  }
  function miParteVal() {
    const monto = Number(A.monto || 0);
    if (A.parte === 'nada') return 0;
    if (A.parte === 'mitad') return Math.round(monto / 2);
    return Math.min(monto, Number(A.miParte || 0));
  }
  function updOwe() {
    const el = $('#a-owe'); if (!el) return;
    const monto = Number(A.monto || 0), mp = miParteVal();
    el.innerHTML = monto ? `${A.conQuien ? esc(A.conQuien) : 'Te'} ${A.conQuien ? 'te debe' : 'deben'} <b class="num">${fmt(monto - mp)}</b> · tu gasto real: <b class="num">${fmt(mp)}</b>` : 'Ingresa el monto total que pagaste.';
  }
  function updSave() {
    const b = $('#a-save');
    const ok = Number(A.monto) > 0 && A.categoria && (!A.compartido || A.conQuien.trim());
    b.disabled = !ok;
    b.textContent = !Number(A.monto) ? 'Ingresa un monto' : !A.categoria ? 'Elige una categoría' : A.compartido && !A.conQuien.trim() ? '¿Con quién?' : `Guardar ${A.tipo.toLowerCase()} de ${fmt(Number(A.monto))}`;
  }
  function saveAdd() {
    const monto = Number(A.monto);
    if (!(monto > 0) || !A.categoria) return;
    const item = { fecha: A.fecha, tipo: A.tipo, categoria: A.categoria, descripcion: A.descripcion.trim(), monto };
    if (A.tipo === 'Gasto' && A.compartido && A.conQuien.trim()) {
      item.conQuien = A.conQuien.trim();
      item.miParte = miParteVal();
      item.estado = A.estado;
    }
    S.queue.push({ uid: uid(), item, at: Date.now() });
    save();
    const [y, m] = A.fecha.split('-').map(Number);
    S.ym = { y, m };
    closeSheet();
    render();
    toast(`${A.tipo} de ${fmt(monto)} guardado ✓`);
    sync();
  }

  // ----- Detalle
  function findItem(key) { return allItems().find((i) => i.key === key); }
  function openDetail(key) {
    const i = findItem(key); if (!i) return;
    const ing = i.tipo === 'Ingreso';
    const row = (k, v) => (v === '' || v === null || v === undefined ? '' : `<div class="kv"><span>${k}</span><span>${v}</span></div>`);
    openSheet(`
      <div class="sbar"><span></span><b>${i.tipo}</b><button class="r" data-a="close" style="color:var(--ink-2);padding:6px 4px">Cerrar</button></div>
      <div class="sbody">
        <div class="dhero"><div class="em">${emoji(i.categoria)}</div><div class="v num">${ing ? '+' : '−'}${fmt(i.monto).replace('−', '')}</div><div class="d">${esc(i.descripcion || shortCat(i.categoria))}</div></div>
        <div class="dl">
          ${row('Fecha', i.fecha ? `${DIAS[new Date(i.y, i.m - 1, i.d).getDay()]} ${i.d} de ${MESES[i.m - 1]} ${i.y}` : esc(i.fechaTexto || `${MESES[(i.m || 1) - 1]} ${i.y || ''}`))}
          ${row('Categoría', esc(i.categoria))}
          ${i.shared ? row('Con quién', esc(i.conQuien)) + row('Mi parte', fmt(i.efectivo)) + row('Me debe', fmt(i.meDeben)) + row('Estado', esc(i.estado || '—')) : ''}
          ${row('Fila en la hoja', i.pending ? 'Por subir…' : '#' + i.row)}
        </div>
        <div class="stack">
          ${i.shared && !i.pending && i.estado !== 'Cobrado' ? `<button class="btn" data-a="cobrar" data-k="${esc(i.key)}">Marcar como cobrado</button>` : ''}
          ${i.shared && !i.pending && i.estado === 'Cobrado' ? `<button class="btn secondary" data-a="descobrar" data-k="${esc(i.key)}">Volver a pendiente</button>` : ''}
          <button class="btn danger" data-a="delete" data-k="${esc(i.key)}">Eliminar movimiento</button>
        </div>
      </div>`, 'detail');
  }

  async function setEstado(key, estado) {
    const i = findItem(key); if (!i || i.pending) return;
    const raw = S.items.find((x) => x.row === i.row);
    const prev = raw.estado;
    raw.estado = estado; save(); render();
    try {
      await api('update', { row: i.row, descripcion: i.descripcion, monto: i.monto, estado });
      toast(estado === 'Cobrado' ? 'Marcado como cobrado ✓' : 'Vuelve a pendiente');
      sync();
    } catch (e) {
      raw.estado = prev; save(); render();
      toast(e.message);
    }
  }
  async function deleteItem(key) {
    const i = findItem(key); if (!i) return;
    if (!confirm(`¿Eliminar "${i.descripcion || i.categoria}" por ${fmt(i.monto)}? También se borra de tu hoja.`)) return;
    if (i.pending) {
      S.queue = S.queue.filter((op) => 'q:' + op.uid !== key); save();
      closeSheet(); render(); toast('Eliminado'); return;
    }
    try {
      await api('delete', { row: i.row, descripcion: i.descripcion, monto: i.monto });
      S.items = S.items.filter((x) => x.row !== i.row); save();
      closeSheet(); render(); toast('Eliminado de tu hoja');
      sync();
    } catch (e) { toast(e.message); }
  }

  // ---------------------------------------------------------------- toast
  let toastT;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg; t.classList.add('show');
    clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2400);
  }

  // ---------------------------------------------------------------- acciones
  const actions = {
    tab: (el) => { S.view = el.dataset.v; S.openPerson = null; render(); window.scrollTo(0, 0); },
    add: () => { if (S.cfg) openAdd(); },
    close: () => closeSheet(),
    sync: () => sync({ quiet: false }),
    'sync-loud': () => sync({ quiet: false }),
    month: (el) => { const d = new Date(S.ym.y, S.ym.m - 1 + Number(el.dataset.d), 1); S.ym = { y: d.getFullYear(), m: d.getMonth() + 1 }; render(); },
    monthnow: () => { S.ym = { y: now.getFullYear(), m: now.getMonth() + 1 }; render(); },
    pickmonth: (el) => { S.ym = { y: Number(el.dataset.y), m: Number(el.dataset.m) }; render(); },
    morecats: () => { S.showAllCats = !S.showAllCats; render(); },
    filtro: (el) => { S.filtro = el.dataset.f; render(); },
    person: (el) => { S.openPerson = S.openPerson === el.dataset.k ? null : el.dataset.k; render(); },
    detail: (el) => openDetail(el.dataset.k),
    cobrar: (el) => { closeSheet(); setEstado(el.dataset.k, 'Cobrado'); },
    descobrar: (el) => { closeSheet(); setEstado(el.dataset.k, 'Pendiente'); },
    delete: (el) => deleteItem(el.dataset.k),
    // agregar
    tipo: (el) => { A.tipo = el.dataset.t; A.categoria = null; A.compartido = false; updAll(); },
    key: (el) => {
      const k = el.dataset.k;
      if (k === 'del') A.monto = A.monto.slice(0, -1);
      else if ((A.monto + k).length <= 11) A.monto = (A.monto + k).replace(/^0+/, '');
      updAmount(true); updSave();
    },
    fecha: (el) => { A.fecha = el.dataset.f; updDates(); },
    cat: (el) => { A.categoria = el.dataset.c; updCats(); updSave(); },
    sug: (el) => {
      const i = findItem(el.dataset.k); if (!i) return;
      A.descripcion = i.descripcion; $('#a-desc').value = i.descripcion;
      A.categoria = i.categoria;
      if (!Number(A.monto)) A.monto = String(i.monto);
      if (i.shared && A.tipo === 'Gasto') { A.compartido = true; A.conQuien = i.conQuien; }
      $('#a-desc').blur();
      updAmount(true); updCats(); updSugs(); updShared(); updSave();
      const on = $('#a-cats .cat.on'); if (on) on.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
    },
    shared: () => { A.compartido = !A.compartido; updShared(); updSave(); },
    who: (el) => { A.conQuien = el.dataset.n; const w = $('#a-who'); if (w) w.value = A.conQuien; updWhoChips(); updOwe(); updSave(); },
    parte: (el) => { A.parte = el.dataset.p; updShared(); if (A.parte === 'otro') setTimeout(() => { const p = $('#a-parte'); if (p) p.focus(); }, 30); },
    estado: (el) => { A.estado = el.dataset.e; updShared(); },
    save: () => saveAdd(),
    // setup
    connect: async () => {
      const url = $('#cfg-url').value.trim(), token = $('#cfg-token').value.trim();
      if (!/^https:\/\/script\.google(usercontent)?\.com\/.+/.test(url)) { toast('La URL debe ser de script.google.com'); return; }
      if (!token) { toast('Falta la clave secreta'); return; }
      const btn = $('#connect'); btn.disabled = true; btn.textContent = 'Conectando…';
      const prev = S.cfg;
      S.cfg = { url, token };
      try {
        await api('ping');
        store.set('fin.cfg', S.cfg);
        S.items = []; S.lastSync = null; S.error = null; save();
        S.view = 'resumen'; render(); toast('¡Conectado a tu hoja! ✓'); sync();
      } catch (e) {
        S.cfg = prev; btn.disabled = false; btn.textContent = 'Conectar';
        toast(e.message === 'Sin conexión' ? 'No se pudo conectar. Revisa la URL.' : e.message);
      }
    },
    demo: () => { S.cfg = { demo: true }; store.set('fin.cfg', S.cfg); S.items = []; S.queue = []; save(); render(); sync(); },
    reconfig: () => {
      if (S.queue.length && S.cfg && !S.cfg.demo && !confirm('Tienes movimientos por subir. Si cambias la conexión se enviarán a la nueva hoja. ¿Continuar?')) return;
      const prefill = S.cfg && !S.cfg.demo ? S.cfg : {};
      $('#view').innerHTML = viewSetup(prefill) + `<button class="btn danger" data-a="cancelcfg" style="margin-top:6px">Cancelar</button>`;
      $('#tabbar').innerHTML = '';
    },
    cancelcfg: () => render(),
    logout: () => {
      const demo = S.cfg && S.cfg.demo;
      if (!demo && S.queue.length && !confirm(`Hay ${S.queue.length} movimiento(s) sin subir que se perderán. ¿Desconectar igual?`)) return;
      if (!demo && !S.queue.length && !confirm('¿Desconectar este teléfono de tu hoja? Tus datos en la hoja no se tocan.')) return;
      S.cfg = null; S.items = []; S.queue = []; S.lastSync = null; S.error = null;
      store.del('fin.cfg'); store.del('fin.demo'); save(); render();
    },
  };

  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-a]');
    if (!el || el.disabled) return;
    const fn = actions[el.dataset.a];
    if (fn) { e.preventDefault(); fn(el, e); }
  });
  document.addEventListener('input', (e) => {
    if (e.target.id === 'q') { S.q = e.target.value; render(); }
  });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && S.cfg) sync(); });
  window.addEventListener('online', () => { if (S.cfg) sync(); });

  // ---------------------------------------------------------------- demo
  const Demo = {
    data() {
      let d = store.get('fin.demo', null);
      if (!d) { d = this.seed(); store.set('fin.demo', d); }
      return d;
    },
    seed() {
      const rows = [];
      const add = (y, m, day, tipo, cat, desc, monto, extra = {}) => rows.push({ fecha: `${y}-${pad(m)}-${pad(day)}`, anio: y, mes: m, tipo, categoria: cat, descripcion: desc, monto, conQuien: '', miParte: null, meDeben: null, estado: '', ...extra });
      let seed = 7; const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
      for (let k = 5; k >= 0; k--) {
        const dt = new Date(now.getFullYear(), now.getMonth() - k, 1);
        const y = dt.getFullYear(), m = dt.getMonth() + 1;
        const maxDay = k === 0 ? now.getDate() : 28;
        const d = (x) => Math.min(maxDay, x);
        add(y, m, d(1), 'Ingreso', 'Sueldo', 'Sueldo mensual', 1800000);
        if (rnd() > 0.5) add(y, m, d(15), 'Ingreso', 'Freelance / Trabajos extra', 'Proyecto freelance', Math.round(100 + rnd() * 300) * 1000);
        add(y, m, d(3), 'Gasto', 'Vivienda', 'Arriendo', 450000);
        add(y, m, d(5), 'Gasto', 'Servicios básicos (luz, agua, internet)', 'Cuenta de luz', Math.round(25 + rnd() * 15) * 1000);
        add(y, m, d(8), 'Gasto', 'Servicios básicos (luz, agua, internet)', 'Internet hogar', 24990);
        add(y, m, d(10), 'Gasto', 'Transporte', 'Transporte público', Math.round(30 + rnd() * 20) * 1000);
        add(y, m, d(6), 'Gasto', 'Alimentación', 'Supermercado', Math.round(120 + rnd() * 60) * 1000);
        add(y, m, d(12), 'Gasto', 'Transporte', 'Combustible', Math.round(35 + rnd() * 15) * 1000);
        add(y, m, d(14), 'Gasto', 'Ocio y entretenimiento', 'Cine', Math.round(8 + rnd() * 8) * 1000);
        add(y, m, d(18), 'Gasto', 'Alimentación', 'Almuerzo', Math.round(5 + rnd() * 6) * 1000);
        add(y, m, d(20), 'Gasto', 'Salud', 'Farmacia', Math.round(8 + rnd() * 20) * 1000);
        add(y, m, d(22), 'Gasto', 'Ahorro e inversión', 'Ahorro mensual', 150000);
        add(y, m, d(25), 'Gasto', 'Ocio y entretenimiento', 'Streaming', 9990, { conQuien: 'Ana', miParte: 5000, meDeben: 4990, estado: k === 0 ? 'Pendiente' : 'Cobrado' });
        if (k <= 1) add(y, m, d(4), 'Gasto', 'Alimentación', 'Cena compartida', 42000, { conQuien: 'Pedro', miParte: 21000, meDeben: 21000, estado: 'Pendiente' });
        if (k === 0) add(y, m, d(2), 'Gasto', 'Regalos', 'Regalo cumpleaños', 30000, { conQuien: 'Ana', miParte: 15000, meDeben: 15000, estado: 'Pendiente' });
      }
      return rows.map((r, i) => ({ ...r, row: i + 2 }));
    },
    async handle(action, p) {
      await new Promise((r) => setTimeout(r, 250));
      const d = this.data();
      if (action === 'ping') return { ok: true };
      if (action === 'list') return { ok: true, items: d, categorias: DEFAULT_CATS };
      if (action === 'add') {
        const it = p.item; const [y, m] = it.fecha.split('-').map(Number);
        const shared = !!it.conQuien;
        d.push({ ...it, anio: y, mes: m, conQuien: it.conQuien || '', miParte: shared ? it.miParte : null, meDeben: shared ? it.monto - it.miParte : null, estado: it.estado || '', row: d.length + 2 });
        store.set('fin.demo', d); return { ok: true };
      }
      const idx = d.findIndex((x) => x.row === p.row);
      if (idx < 0) throw new Error('No encontrado');
      if (action === 'update') { d[idx].estado = p.estado; }
      if (action === 'delete') { d.splice(idx, 1); d.forEach((x, i) => (x.row = i + 2)); }
      store.set('fin.demo', d); return { ok: true };
    },
  };

  // ---------------------------------------------------------------- inicio
  render();
  if (S.cfg) sync();
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
})();
