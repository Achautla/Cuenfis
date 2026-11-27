// Piezas de interfaz que comparten varias pantallas.
import { categoria, FORMAS_PAGO, PAGADORES, REGIMENES } from '../data/catalogo.js';
import { icon } from '../ui/icons.js';
import { esc, money, fechaLarga, pct } from '../ui/dom.js';

export function chipsFiscales(m) {
  const d = m.d, c = [];
  if (m.tipo === 'transferencia') return '<span class="chip">Transferencia</span>';
  if (d.clase === 'impuestos') return '<span class="chip sat">Pago al SAT</span>';
  if (d.fiscal && d.regimen && d.regimen !== 'sueldos') c.push(m.cfdi ? '<span class="chip ok">CFDI</span>' : '<span class="chip warn">Sin CFDI</span>');
  if (d.clase === 'deduccion') c.push(d.deducible ? '<span class="chip ok">Deducible</span>' : '<span class="chip warn">No deducible</span>');
  if (d.clase === 'actividad') c.push(d.ivaAcreditable ? '<span class="chip ok">IVA acreditable</span>' : '<span class="chip warn">IVA no acreditable</span>');
  if (m.tipo === 'entrada' && d.regimen && !d.fiscal) c.push('<span class="chip warn">Fuera de régimen</span>');
  if (d.estimado) c.push('<span class="chip info">Bruto estimado</span>');
  return c.join('');
}

export function itemMovimiento(m, foto) {
  const cat = m.tipo === 'transferencia' ? { nombre: 'Transferencia', icono: 'swap', color: '#475569' } : categoria(m.categoria);
  const cta = foto.cuentas.find((c) => c.id === m.cuenta)?.nombre ?? '';
  const dest = m.tipo === 'transferencia' ? ` → ${esc(foto.cuentas.find((c) => c.id === m.cuentaDestino)?.nombre ?? '')}` : '';
  const signo = m.tipo === 'entrada' ? '+' : m.tipo === 'salida' ? '−' : '';
  const cls = m.tipo === 'entrada' ? 'pos' : m.tipo === 'salida' ? '' : 'muted';
  const sub = m.tipo === 'entrada' && m.delSat ? `<small>Tuyo ${money(m.propio)}</small>` : m.d.ivaAcreditable ? `<small>Costo real ${money(m.gastoReal)}</small>` : '';
  return `<li><button class="mitem" data-mov="${esc(m.id)}">
    <span class="avatar" style="background:${cat.color}">${icon(cat.icono)}</span>
    <span><span class="t" style="display:block">${esc(m.nota || m.contraparte || cat.nombre)}</span>
      <span class="s">${esc(cat.nombre)} · ${esc(cta)}${dest} ${chipsFiscales(m)}</span></span>
    <span class="a"><span class="num ${cls}">${signo}${money(m.monto)}</span>${sub}</span>
  </button></li>`;
}

export function listaAgrupada(movs, foto, vacio) {
  if (!movs.length) return `<div class="empty">${icon('list')}<p>${esc(vacio)}</p></div>`;
  let html = '', dia = '';
  for (const m of movs) {
    if (m.fecha !== dia) { dia = m.fecha; html += `<li class="day">${esc(fechaLarga(dia))}</li>`; }
    html += itemMovimiento(m, foto);
  }
  return `<ul class="mlist">${html}</ul>`;
}

/** Desglose de un movimiento: subtotal, IVA, retenciones, lo que llegó, lo tuyo y lo del SAT. */
export function desgloseHTML(m) {
  const d = m.d, L = (a, b, cls = '') => `<div class="ln ${cls}"><span>${a}</span><span class="num">${b}</span></div>`;
  if (m.tipo === 'entrada' && d.regimen === 'sueldos') {
    return `<div class="breakdown">
      ${L('Sueldo bruto' + (d.estimado ? ' (estimado)' : ''), money(d.bruto))}
      ${L('ISR que te retuvo tu patrón', '−' + money(d.isrRet))}
      ${L('Llegó a tu cuenta', money(m.monto), 'total')}
      ${L('Es tuyo', money(m.propio), 'mine')}
      ${d.estimado ? '<div class="cap">El bruto se estimó desde el neto sin contar IMSS ni otras deducciones. Captura los datos de tu recibo de nómina para que la anual sea exacta.</div>' : ''}
    </div>`;
  }
  if (m.tipo === 'entrada' && d.regimen) {
    const t = d.subtotal ? d.iva / d.subtotal : 0;
    const calcula = d.fiscal && d.regimen === 'resico';
    return `<div class="breakdown">
      ${L('Subtotal (tu ingreso)', money(d.subtotal))}
      ${L(`IVA trasladado (${pct(t)})`, '+' + money(d.iva))}
      ${d.isrRet ? L('ISR que te retuvo la empresa (1.25%)', '−' + money(d.isrRet)) : ''}
      ${d.ivaRet ? L('IVA que te retuvo la empresa (2/3)', '−' + money(d.ivaRet)) : ''}
      ${L('Llegó a tu cuenta', money(m.monto), 'total')}
      ${calcula ? L(`ISR del mes por pagar (tasa ${pct(m.tasaMes ?? 0, 2)})`, '−' + money(m.isrPend)) : ''}
      ${calcula ? L('IVA por entregar al SAT', '−' + money(m.ivaPend)) : ''}
      ${L('Es tuyo', money(m.propio), 'mine')}
      ${calcula ? L('Es del SAT (aparta este dinero)', money(m.delSat), 'sat') : ''}
      ${calcula ? '<div class="cap">El ISR depende del total que cobres en el mes; puede cambiar si cobras más. El IVA de tus gastos con factura baja lo que entregas.</div>' : ''}
    </div>`;
  }
  if (m.tipo === 'salida' && d.iva) {
    return `<div class="breakdown">
      ${L('Subtotal', money(d.subtotal))}${L('IVA', money(d.iva))}${L('Pagaste', money(m.monto), 'total')}
      ${d.ivaAcreditable ? L('IVA que recuperas en tu declaración', '−' + money(d.ivaAcreditable), 'sat') : ''}
      ${L('Costo real para ti', money(m.gastoReal), 'mine')}
    </div>`;
  }
  return '';
}

export function detalleTexto(m) {
  const filas = [];
  if (m.formaPago) filas.push(['Forma de pago', FORMAS_PAGO[m.formaPago]]);
  if (m.pagador && m.d.regimen && m.d.regimen !== 'sueldos') filas.push(['Quién pagó', PAGADORES[m.pagador]]);
  if (m.d.regimen) filas.push(['Régimen', REGIMENES[m.d.regimen].corto]);
  if (m.uuid) filas.push(['Folio fiscal (UUID)', m.uuid]);
  if (m.contraparte) filas.push(['Cliente o proveedor', m.contraparte]);
  return filas;
}
