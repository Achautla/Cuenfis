import { getFoto } from '../data/store.js';
import { cobroResico, compararRegimenes } from '../core/simulador.js';
import { params, isrTarifa, subsidioEmpleoMensual, isrRetenidoNomina } from '../core/fiscal.js';
import { vigente } from '../core/regimen.js';
import { ym } from '../core/motor.js';
import { PAGADORES } from '../data/catalogo.js';
import { icon } from '../ui/icons.js';
import { $, esc, money, pct, nombreMes } from '../ui/dom.js';
import { leyenda, chipFuente } from '../ui/fuente.js';
import '../styles/views/simulador.css';

// Estado de la pantalla (se conserva al cambiar de sección)
const st = { tab: null, monto: 20000, pagador: 'pf', sumarMes: true, sueldo: 15000, ingreso: 30000, gastos: 3000, pagadorC: 'pf' };

const L = (a, b, cls = '') => `<div class="ln ${cls}"><span>${a}</span><span class="num">${b}</span></div>`;

function cobro(foto) {
  const k = ym(foto.hoy);
  const mes = foto.meses[k];
  const r = cobroResico({ subtotal: st.monto, pagador: st.pagador, tasaIva: foto.perfil.frontera ? 0.08 : 0.16,
    yaCobradoMes: st.sumarMes ? mes?.total ?? 0 : 0, isrRetMes: st.sumarMes ? mes?.isrRet ?? 0 : 0, anio: +k.slice(0, 4) });
  return `<div class="sim-grid">
    <form class="card sim-in" id="fCobro">
      <label class="field"><span>¿Cuánto vas a cobrar, sin IVA?</span><div class="amount-wrap"><span>$</span><input id="simMonto" name="monto" type="number" min="0" step="0.01" inputmode="decimal" value="${st.monto}" /></div></label>
      <p class="field-label">¿Quién te va a pagar?</p>
      <div class="seg full" id="simPag">${Object.entries(PAGADORES).map(([k2, t]) => `<button type="button" data-p="${k2}" aria-pressed="${st.pagador === k2}">${t}</button>`).join('')}</div>
      <label class="check" style="margin-top:14px"><input type="checkbox" id="simMes" ${st.sumarMes ? 'checked' : ''} /><span>Sumar lo que ya cobré en ${esc(nombreMes(k).toLowerCase())}<small>${mes?.total ? `Llevas ${money(mes.total)} sin IVA. La tasa RESICO se aplica a todo el mes.` : 'Aún no registras cobros este mes.'}</small></span></label>
    </form>
    <div class="card sim-out">
      <p class="k-lbl">Te queda</p>
      <p class="sim-big num">${money(r.teQueda)}</p>
      <p class="small muted">de cada ${money(r.subtotal)} que facturas. Aparta ${money(r.apartar)} para el SAT.</p>
      <div class="breakdown" style="margin-top:14px">
        ${L('Factura: subtotal', money(r.subtotal))}
        ${L('IVA que cobras', '+' + money(r.iva))}
        ${r.isrRet ? L('ISR que te retiene la empresa', '−' + money(r.isrRet)) : ''}
        ${r.ivaRet ? L('IVA que te retiene la empresa', '−' + money(r.ivaRet)) : ''}
        ${L('Te llega a la cuenta', money(r.recibido), 'total')}
        ${L(`ISR por pagar (tasa del mes ${pct(r.tasa, 1)})`, '−' + money(r.isrPorPagar))}
        ${L('IVA por pagar', '−' + money(r.ivaPorPagar))}
        ${L('Aparta para el SAT', money(r.apartar), 'sat')}
        ${L('Es tuyo', money(r.teQueda), 'mine')}
      </div>
      ${r.cambiaTasa ? `<div class="notice warn" style="margin-top:12px">${icon('alert')}<span>Este cobro sube tu tasa del mes a ${pct(r.tasa, 1)}. El aumento aplica a todo lo cobrado en el mes y ya está incluido arriba.</span></div>` : ''}
      <p class="small muted" style="margin-top:10px">Si gastas en tu actividad con factura, el IVA de esos gastos baja lo que apartas.</p>
      <div class="row">${chipFuente('resico.mensual', +foto.hoy.slice(0, 4))}${st.pagador === 'pm' ? chipFuente('resico.retencionIsrPM', +foto.hoy.slice(0, 4)) : ''}</div>
    </div></div>`;
}

function sueldo(foto) {
  const p = params(+foto.hoy.slice(0, 4));
  const isr = isrRetenidoNomina(st.sueldo, p);
  const sub = subsidioEmpleoMensual(st.sueldo, p);
  const isrTar = isrTarifa(st.sueldo, p.tarifaMensual);
  return `<div class="sim-grid">
    <form class="card sim-in"><label class="field"><span>Sueldo bruto mensual</span><div class="amount-wrap"><span>$</span><input id="simSueldo" type="number" min="0" step="0.01" inputmode="decimal" value="${st.sueldo}" /></div>
      <span class="hint">El que aparece en tu contrato o recibo, antes de descuentos.</span></label></form>
    <div class="card sim-out"><p class="k-lbl">Te llega aproximadamente</p><p class="sim-big num">${money(st.sueldo - isr)}</p>
      <div class="breakdown" style="margin-top:14px">
        ${L('Sueldo bruto', money(st.sueldo))}
        ${L('ISR según tarifa (art. 96)', '−' + money(isrTar))}
        ${sub ? L('Subsidio para el empleo', '+' + money(Math.min(sub, isrTar))) : ''}
        ${L('ISR que te retienen', '−' + money(isr), 'sat')}
        ${L('Neto antes de IMSS', money(st.sueldo - isr), 'mine')}
      </div>
      <p class="small muted" style="margin-top:10px">Falta restar la cuota del IMSS y otros descuentos de tu nómina (fondo de ahorro, préstamos).</p>
      <div class="row">${chipFuente('tarifaMensual', +foto.hoy.slice(0, 4))}${sub ? chipFuente('subsidioEmpleo', +foto.hoy.slice(0, 4)) : ''}</div></div></div>`;
}

function comparar() {
  const c = compararRegimenes({ ingreso: st.ingreso, gastos: st.gastos, pagador: st.pagadorC });
  const max = Math.max(1, ...c.filas.map((f) => f.teQueda));
  return `<div class="sim-grid">
    <form class="card sim-in">
      <label class="field"><span>Ingreso mensual, sin IVA</span><div class="amount-wrap"><span>$</span><input id="cmpIng" type="number" min="0" step="0.01" inputmode="decimal" value="${st.ingreso}" /></div></label>
      <label class="field"><span>Gastos mensuales de tu actividad con factura, sin IVA</span><input id="cmpGas" type="number" min="0" step="0.01" inputmode="decimal" value="${st.gastos}" /><span class="hint">Equipo, software, renta de oficina. No incluyas gastos personales.</span></label>
    </form>
    <div class="card sim-out"><p class="k-lbl">¿Dónde te queda más?</p>
      <ul class="cmp">${c.filas.map((f) => `<li class="${f.clave === c.mejor ? 'best' : ''} ${f.disponible ? '' : 'off'}">
        <div class="cmp-top"><b>${esc(f.nombre)}</b>${f.clave === c.mejor ? '<span class="chip ok">Te queda más</span>' : ''}<span class="spacer"></span><span class="num">${f.disponible ? money(f.teQueda) : '—'}</span></div>
        <div class="cmp-track"><i style="--w:${f.disponible ? Math.max(0, f.teQueda) / max * 100 : 0}%"></i></div>
        <p class="small muted">ISR ${money(f.isr)} al mes (${pct(f.tasaEfectiva, 1)} efectivo)${f.gastos ? ` · gastos ${money(f.gastos)}` : ''}. ${esc(f.nota)}</p></li>`).join('')}</ul>
      <p class="small muted">Comparación aproximada de ISR. No incluye IMSS, prestaciones ni el IVA, que en RESICO y en actividad empresarial no es tuyo. Antes de cambiar de régimen, habla con un contador.</p>
    </div></div>`;
}

export function render(main) {
  const foto = getFoto();
  const conResico = vigente(foto.perfil, 'resico', foto.hoy);
  const tabs = [conResico ? ['cobro', 'Si cobro…'] : ['sueldo', 'Mi sueldo neto'], ['comparar', 'Comparar regímenes']];
  if (!tabs.some(([k]) => k === st.tab)) st.tab = tabs[0][0];

  main.innerHTML = `<section class="view sim">
    <div class="page-head"><div><h1>Simulador</h1><p class="sub">Haz cuentas antes de cobrar o de cambiar de régimen.</p></div></div>
    <div class="seg" role="group" aria-label="Simulación">${tabs.map(([k, t]) => `<button data-tab="${k}" aria-pressed="${st.tab === k}">${t}</button>`).join('')}</div>
    <div id="simBody">${st.tab === 'cobro' ? cobro(foto) : st.tab === 'sueldo' ? sueldo(foto) : comparar()}</div>
    <p class="disclaimer">Estimaciones con ${esc(leyenda(+getFoto().hoy.slice(0, 4)))}. No sustituyen la asesoría de un contador.</p>
  </section>`;

  main.querySelectorAll('[data-tab]').forEach((b) => (b.onclick = () => { st.tab = b.dataset.tab; render(main); }));
  // Recalcula sin perder el foco del campo que se edita
  const enlazar = (sel, clave, conv = Number) => { const el = $(sel, main); if (!el) return; el.oninput = () => { st[clave] = conv(el.value) || 0; const pos = el.selectionStart; render(main); const n = $(sel, main); n.focus(); try { n.setSelectionRange(pos, pos); } catch { /* number inputs */ } }; };
  enlazar('#simMonto', 'monto'); enlazar('#simSueldo', 'sueldo'); enlazar('#cmpIng', 'ingreso'); enlazar('#cmpGas', 'gastos');
  $('#simMes', main)?.addEventListener('change', (e) => { st.sumarMes = e.target.checked; render(main); });
  main.querySelectorAll('#simPag [data-p]').forEach((b) => (b.onclick = () => { st.pagador = b.dataset.p; render(main); }));
  main.querySelectorAll('form').forEach((f) => (f.onsubmit = (e) => e.preventDefault()));
}
