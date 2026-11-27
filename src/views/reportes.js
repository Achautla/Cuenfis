import { imprimir } from '../native.js';
import { getEstado, getFoto } from '../data/store.js';
import { reporteContador } from '../core/reporte.js';
import { rangoMes, ym } from '../core/motor.js';
import { icon } from '../ui/icons.js';
import { $, esc, money, pct, nombreMes, fechaCorta, toast, descargar } from '../ui/dom.js';
import '../styles/views/reportes.css';

let tipo = 'mes', clave = null;

const rango = (t, k) => (t === 'mes' ? rangoMes(k) : [`${k}-01-01`, `${k}-12-31`]);
const si = (b) => (b ? 'Sí' : 'No');

function tabla(cols, filas, totales) {
  return `<div class="table-wrap"><table class="rep-t"><thead><tr>${cols.map(([t, n]) => `<th class="${n ? 'n' : ''}">${esc(t)}</th>`).join('')}</tr></thead>
    <tbody>${filas.map((f) => `<tr>${f.map((v, i) => `<td class="${cols[i][1] ? 'n num' : ''}">${cols[i][1] && typeof v === 'number' ? money(v) : esc(v)}</td>`).join('')}</tr>`).join('')}</tbody>
    ${totales ? `<tfoot><tr>${totales.map((v, i) => `<td class="${cols[i][1] ? 'n num' : ''}">${typeof v === 'number' ? money(v) : esc(v)}</td>`).join('')}</tr></tfoot>` : ''}</table></div>`;
}

async function excel(r, nombre) {
  const { default: writeExcelFile } = await import('write-excel-file/universal');
  const H = (t) => ({ value: t, fontWeight: 'bold', backgroundColor: '#E8EEF6' });
  const N = (v) => ({ value: Number(v) || 0, type: Number, format: '#,##0.00' });
  const T = (v) => ({ value: String(v ?? '') });
  const hoja = (sheet, cols, filas, widths) => ({ sheet, data: [cols.map(H), ...filas], columns: widths.map((width) => ({ width })) });
  const hojas = [
    hoja('Resumen', ['Concepto', 'Monto'], [
      [T('Contribuyente'), T(r.perfil.nombre)], [T('RFC'), T(r.perfil.rfc)], [T('Periodo'), T(`${r.desde} a ${r.hasta}`)], [T('Regímenes'), T(r.regimenes.join(', '))],
      [T('Entradas'), N(r.resumen.entradas)], [T('Salidas'), N(r.resumen.salidas)], [T('Ingresos propios (sin IVA ni impuestos)'), N(r.resumen.propios)],
      [T('Gastos reales'), N(r.resumen.gastos)], [T('Impuestos retenidos'), N(r.resumen.retenido)],
      [T('Ingresos: subtotal'), N(r.totales.ingresos.subtotal)], [T('Ingresos: IVA trasladado'), N(r.totales.ingresos.iva)], [T('ISR retenido'), N(r.totales.ingresos.isrRet)], [T('IVA retenido'), N(r.totales.ingresos.ivaRet)],
      [T('IVA acreditable'), N(r.totales.gastosActividad.ivaAcreditable)], [T('Deducciones personales que cumplen requisitos'), N(r.totales.deducciones.deducible)],
      [T('Cálculos estimados por Cuenfis con reglas fiscales vigentes. Revisar contra CFDI y portal del SAT.'), T('')],
    ], [48, 22]),
  ];
  if (r.secciones.ingresos) hojas.push(hoja('Ingresos', ['Fecha', 'Régimen', 'Cliente', 'Concepto', 'UUID', 'CFDI', 'Subtotal', 'IVA', 'ISR retenido', 'IVA retenido', 'Recibido', 'Cuenta'],
    r.ingresos.map((i) => [T(i.fecha), T(i.regimen), T(i.cliente), T(i.concepto), T(i.uuid), T(si(i.cfdi)), N(i.subtotal), N(i.iva), N(i.isrRet), N(i.ivaRet), N(i.recibido), T(i.cuenta)]), [11, 14, 22, 22, 38, 6, 13, 12, 12, 12, 13, 16]));
  if (r.secciones.resico) hojas.push(hoja('RESICO mensual', ['Mes', 'Ingresos cobrados', 'Tasa', 'ISR determinado', 'ISR retenido', 'ISR a cargo', 'IVA trasladado', 'IVA retenido', 'IVA acreditable', 'Saldo a favor aplicado', 'IVA a cargo', 'Total a pagar', 'Estado', 'No. de operación', 'Línea de captura'],
    r.meses.map((m) => [T(m.clave), N(m.ingresos), { value: m.tasa, type: Number, format: '0.00%' }, N(m.isrDet), N(m.isrRet), N(m.isrCargo), N(m.ivaTrasladado), N(m.ivaRet), N(m.ivaAcred), N(m.favorAplicado), N(m.ivaCargo), N(m.totalPagar), T(m.estado), T(m.numOperacion), T(m.lineaCaptura)]), [9, 15, 8, 13, 12, 12, 13, 12, 13, 13, 12, 13, 11, 18, 22]));
  if (r.secciones.actividad && r.gastosActividad.length) hojas.push(hoja('Gastos de actividad', ['Fecha', 'Proveedor', 'Concepto', 'UUID', 'CFDI', 'Forma de pago', 'Total', 'Subtotal', 'IVA', 'IVA acreditable', 'Observación'],
    r.gastosActividad.map((g) => [T(g.fecha), T(g.proveedor), T(g.concepto), T(g.uuid), T(si(g.cfdi)), T(g.formaPago), N(g.total), N(g.subtotal), N(g.iva), N(g.ivaAcreditable), T(g.motivo)]), [11, 20, 22, 38, 6, 14, 12, 12, 11, 13, 40]));
  if (r.secciones.deducciones) hojas.push(hoja('Deducciones personales', ['Fecha', 'Tipo', 'Proveedor', 'Concepto', 'UUID', 'CFDI', 'Forma de pago', 'Monto', '¿Cumple requisitos?', 'Observación'],
    r.deducciones.map((d) => [T(d.fecha), T(d.tipo), T(d.proveedor), T(d.concepto), T(d.uuid), T(si(d.cfdi)), T(d.formaPago), N(d.monto), T(si(d.deducible)), T(d.motivo)]), [11, 18, 20, 22, 38, 6, 14, 12, 12, 40]));
  if (r.secciones.porCobrar) hojas.push(hoja('Por cobrar', ['Cliente', 'Folio', 'Concepto', 'Emitida', 'Vence', 'Subtotal', 'Lo que llegará', 'Vencida'],
    r.porCobrar.map((f) => [T(f.cliente), T(f.folio), T(f.concepto), T(f.fecha), T(f.vence), N(f.subtotal), N(f.esperado), T(si(f.vencida))]), [22, 10, 24, 11, 11, 13, 14, 8]));
  const blob = await writeExcelFile(hojas, { fontFamily: 'Calibri', fontSize: 11 }).toBlob();
  descargar(nombre + '.xlsx', blob, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
}

export function render(main) {
  const estado = getEstado(), foto = getFoto();
  const hoyK = ym(foto.hoy), anio = foto.hoy.slice(0, 4);
  const meses = [];
  for (let i = 0, [y, m] = hoyK.split('-').map(Number); i < 24; i++) { meses.push(`${y}-${String(m).padStart(2, '0')}`); m -= 1; if (!m) { m = 12; y -= 1; } }
  const anios = [...new Set([+anio, +anio - 1, +anio - 2])];
  if (!clave || (tipo === 'mes' ? !meses.includes(clave) : !anios.includes(+clave))) clave = tipo === 'mes' ? (meses[1] ?? hoyK) : String(+foto.hoy.slice(5, 7) <= 4 ? +anio - 1 : +anio);
  const [desde, hasta] = rango(tipo, clave);
  const r = reporteContador(estado, foto, desde, hasta);
  const titulo = tipo === 'mes' ? nombreMes(clave) : `Ejercicio ${clave}`;
  const nombreArchivo = `cuenfis-contador-${clave}`;
  const t = r.totales;

  main.innerHTML = `<section class="view reportes">
    <div class="page-head no-print"><div><h1>Reportes para tu contador</h1><p class="sub">Todo lo del periodo en un PDF o un Excel, solo con lo que aplica a tu régimen.</p></div></div>
    <div class="card toolbar no-print">
      <div class="seg" role="group" aria-label="Periodo">${[['mes', 'Mes'], ['anio', 'Año']].map(([k, x]) => `<button data-tipo="${k}" aria-pressed="${tipo === k}">${x}</button>`).join('')}</div>
      <label class="field inline"><span>${tipo === 'mes' ? 'Mes' : 'Año'}</span><select id="selPer">${(tipo === 'mes' ? meses : anios).map((k) => `<option value="${k}" ${String(k) === clave ? 'selected' : ''}>${tipo === 'mes' ? esc(nombreMes(k)) : k}</option>`).join('')}</select></label>
      <span class="spacer"></span>
      <button class="btn" id="xls">${icon('download')}Excel</button>
      <button class="btn primary" id="pdf">${icon('printer')}PDF</button>
    </div>

    <article class="card rep" id="reporte">
      <header class="rep-head"><div><p class="rep-k">Reporte para contador · Cuenfis</p><h2>${esc(titulo)}</h2>
        <p class="small muted">${esc(r.perfil.nombre)}${r.perfil.rfc ? ` · RFC ${esc(r.perfil.rfc)}` : ''} · del ${esc(fechaCorta(desde))} al ${esc(fechaCorta(hasta))}</p>
        <p class="small muted">${r.regimenes.length ? `Regímenes: ${esc(r.regimenes.join(', '))}` : 'Sin régimen fiscal en el periodo'}</p></div></header>

      <h3>Resumen</h3>
      <div class="rep-sum">
        <div><span>Ingresos propios</span><b class="num">${money(r.resumen.propios)}</b></div>
        <div><span>Gastos reales</span><b class="num">${money(r.resumen.gastos)}</b></div>
        <div><span>Impuestos retenidos</span><b class="num">${money(r.resumen.retenido)}</b></div>
        ${r.secciones.resico ? `<div><span>RESICO a pagar</span><b class="num">${money(t.meses.totalPagar)}</b></div>` : ''}
      </div>

      ${r.secciones.ingresos ? `<h3>Ingresos (${r.ingresos.length})</h3>${tabla([['Fecha'], ['Régimen'], ['Cliente'], ['CFDI'], ['Subtotal', 1], ['IVA', 1], ['ISR ret.', 1], ['IVA ret.', 1], ['Recibido', 1]],
        r.ingresos.map((i) => [fechaCorta(i.fecha), i.regimen, i.cliente || '—', i.cfdi ? (i.uuid ? i.uuid.slice(0, 8) + '…' : 'Sí') : 'No', i.subtotal, i.iva, i.isrRet, i.ivaRet, i.recibido]),
        ['Total', '', '', '', t.ingresos.subtotal, t.ingresos.iva, t.ingresos.isrRet, t.ingresos.ivaRet, t.ingresos.recibido])}
        ${r.ingresos.some((i) => i.estimado) ? '<p class="small muted">Algunos sueldos brutos son estimados desde el depósito: compáralos con tus recibos de nómina.</p>' : ''}` : ''}

      ${r.secciones.resico ? `<h3>RESICO: declaraciones mensuales</h3>${tabla([['Mes'], ['Ingresos', 1], ['Tasa'], ['ISR a cargo', 1], ['IVA a cargo', 1], ['Total', 1], ['Estado'], ['No. operación']],
        r.meses.map((m) => [nombreMes(m.clave), m.ingresos, pct(m.tasa, 2), m.isrCargo, m.ivaCargo, m.totalPagar, m.estado, m.numOperacion || '—']),
        ['Total', r.meses.reduce((s, m) => s + m.ingresos, 0), '', t.meses.isrCargo, t.meses.ivaCargo, t.meses.totalPagar, '', ''])}` : ''}

      ${r.gastosActividad.length ? `<h3>Gastos de la actividad (${r.gastosActividad.length})</h3>${tabla([['Fecha'], ['Proveedor'], ['CFDI'], ['Pago'], ['Total', 1], ['IVA', 1], ['IVA acreditable', 1]],
        r.gastosActividad.map((g) => [fechaCorta(g.fecha), g.proveedor || g.concepto || '—', si(g.cfdi), g.formaPago, g.total, g.iva, g.ivaAcreditable]),
        ['Total', '', '', '', t.gastosActividad.total, t.gastosActividad.iva, t.gastosActividad.ivaAcreditable])}` : ''}

      ${r.secciones.deducciones ? `<h3>Deducciones personales (${r.deducciones.length})</h3>${tabla([['Fecha'], ['Tipo'], ['Proveedor'], ['CFDI'], ['Pago'], ['Monto', 1], ['¿Cumple?']],
        r.deducciones.map((d) => [fechaCorta(d.fecha), d.tipo, d.proveedor || d.concepto || '—', si(d.cfdi), d.formaPago, d.monto, d.deducible ? 'Sí' : 'No']),
        ['Total', '', '', '', '', t.deducciones.total, `${money(t.deducciones.deducible)} cumplen`])}
        <p class="small muted">Los topes anuales de deducciones se aplican en la declaración anual.</p>` : ''}

      ${r.secciones.porCobrar ? `<h3>Facturas por cobrar al cierre</h3>${tabla([['Cliente'], ['Folio'], ['Emitida'], ['Vence'], ['Lo que llegará', 1]],
        r.porCobrar.map((f) => [f.cliente, f.folio || '—', fechaCorta(f.fecha), f.vence ? fechaCorta(f.vence) : '—', f.esperado]), ['Total', '', '', '', t.porCobrar])}
        <p class="small muted">No forman parte de los ingresos del periodo hasta que se cobran.</p>` : ''}

      ${!r.secciones.ingresos && !r.secciones.deducciones && !r.gastosActividad.length ? `<div class="empty">${icon('file')}<p>No hay movimientos fiscales en este periodo.</p></div>` : ''}
      <p class="disclaimer">Generado por Cuenfis. Cálculos estimados con reglas fiscales 2026; revisar contra CFDI, constancias y el portal del SAT. No sustituye la asesoría de un contador.</p>
    </article>
  </section>`;

  main.querySelectorAll('[data-tipo]').forEach((b) => (b.onclick = () => { tipo = b.dataset.tipo; clave = null; render(main); }));
  $('#selPer', main).onchange = (e) => { clave = e.target.value; render(main); };
  $('#pdf', main).onclick = () => imprimir(nombreArchivo).catch(() => toast('No se pudo abrir la impresión. Inténtalo de nuevo.', icon('alert')));
  $('#xls', main).onclick = async () => { try { await excel(r, nombreArchivo); } catch { toast('No pudimos crear el Excel. Intenta de nuevo.', icon('alert')); } };
}
