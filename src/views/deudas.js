import { getFoto, aplicar } from '../data/store.js';
import { estadoTarjeta, estadoPrestamo } from '../core/deudas.js';
import { icon } from '../ui/icons.js';
import { $, esc, money, pct, fechaLarga, toast } from '../ui/dom.js';
import { abrirFormulario } from './movimiento-form.js';
import '../styles/views/deudas.css';

const editarCuenta = (id, cambios) => aplicar((s) => ({ ...s, cuentas: s.cuentas.map((c) => (c.id === id ? { ...c, ...cambios } : c)) }));
const num = (v) => (v === '' || v == null ? undefined : Number(v));

function tarjeta(foto, c) {
  const t = estadoTarjeta(foto, c);
  const nivelUso = t.uso == null ? '' : t.uso > 0.7 ? 'alto' : t.uso > 0.3 ? 'medio' : 'ok';
  const urgente = t.configurada && !t.cubierto && t.diasParaPagar <= 5;
  return `<article class="card deuda" data-cta="${esc(c.id)}">
    <div class="card-head"><span class="d-ico">${icon('credit-card')}</span><div><h2>${esc(c.nombre)}</h2><span class="small muted">Tarjeta de crédito</span></div><span class="spacer"></span>
      <button class="btn sm primary" data-pagar="${esc(c.id)}" data-monto="${t.pagoSinIntereses ?? ''}">${icon('swap')}Pagar</button></div>
    <div class="d-saldo"><div><span>Debes hoy</span><b class="num">${money(t.saldo)}</b></div>
      ${t.limite ? `<div><span>Disponible</span><b class="num">${money(t.disponible)}</b></div>` : ''}</div>
    ${t.limite ? `<div class="d-uso ${nivelUso}"><span class="d-track"><i style="--w:${Math.min(100, Math.max(0, t.uso) * 100)}%"></i></span><span class="small">Usas el ${pct(Math.max(0, t.uso))} de tu línea de ${money(t.limite)}</span></div>
      ${t.uso > 0.3 ? `<p class="small muted">Usar menos del 30% de tu línea ayuda a tu historial en Buró de Crédito.</p>` : ''}` : ''}
    ${t.configurada ? `
      <div class="d-pagos ${urgente ? 'urgente' : ''}">
        <div class="main"><span>Pago para no generar intereses</span><b class="num">${money(t.pagoSinIntereses)}</b>
          <small>${t.cubierto ? `${icon('check')} Ya cubriste el saldo del corte del ${esc(fechaLarga(t.ultimoCorte))}` : `Antes del ${esc(fechaLarga(t.limitePago))} · ${t.diasParaPagar < 0 ? 'vencido' : t.diasParaPagar === 0 ? 'vence hoy' : `faltan ${t.diasParaPagar} días`}`}</small></div>
        <div><span>Pago mínimo</span><b class="num">${money(t.pagoMinimo)}</b><small>Estimado: 1.5% del saldo o 1.25% del límite</small></div>
        <div><span>Si solo pagas el mínimo</span><b class="num ${t.interesSiMinimo ? 'neg' : ''}">${money(t.interesSiMinimo)}</b><small>${t.tasa ? `Interés del siguiente mes con tasa ${pct(t.tasa, 0)} anual + IVA` : 'Captura la tasa anual para estimarlo'}</small></div>
      </div>
      <p class="small muted">Saldo al corte (${esc(fechaLarga(t.ultimoCorte))}): ${money(t.saldoCorte)}${t.pagosDespues ? ` · pagos desde el corte: ${money(t.pagosDespues)}` : ''} · próximo corte: ${esc(fechaLarga(t.proximoCorte))}</p>`
    : `<div class="notice">${icon('info')}<span><b>Captura tu día de corte.</b>Con él calculamos cuánto pagar para no generar intereses y cuándo vence.</span></div>`}
    <details class="more" ${t.configurada ? '' : 'open'}><summary>Datos de la tarjeta</summary>
      <form class="d-form cols-4" data-form="${esc(c.id)}">
        <label class="field"><span>Límite de crédito</span><input name="limite" type="number" min="0" step="100" value="${esc(c.limite ?? '')}" /></label>
        <label class="field"><span>Día de corte</span><input name="diaCorte" type="number" min="1" max="31" value="${esc(c.diaCorte ?? '')}" /></label>
        <label class="field"><span>Día límite de pago</span><input name="diaPago" type="number" min="1" max="31" value="${esc(c.diaPago ?? '')}" /><span class="hint">Vacío: 20 días después del corte</span></label>
        <label class="field"><span>Tasa anual (%)</span><input name="tasa" type="number" min="0" max="200" step="0.1" value="${esc(c.tasaAnual != null ? +(c.tasaAnual * 100).toFixed(2) : '')}" /><span class="hint">Viene en tu estado de cuenta</span></label>
        <button class="btn">${icon('check')}Guardar datos</button>
      </form></details>
  </article>`;
}

function prestamo(c) {
  const p = estadoPrestamo(c);
  return `<article class="card deuda" data-cta="${esc(c.id)}">
    <div class="card-head"><span class="d-ico">${icon('landmark')}</span><div><h2>${esc(c.nombre)}</h2><span class="small muted">Préstamo</span></div><span class="spacer"></span>
      <button class="btn sm primary" data-pagar="${esc(c.id)}" data-monto="${c.pagoMensual ?? ''}">${icon('swap')}Abonar</button></div>
    <div class="d-saldo"><div><span>Debes hoy</span><b class="num">${money(c.saldo)}</b></div>
      ${p.configurado && !p.nuncaSeLiquida ? `<div><span>Terminas en</span><b class="num">${p.meses} ${p.meses === 1 ? 'mes' : 'meses'}</b></div>` : ''}</div>
    ${p.nuncaSeLiquida ? `<div class="notice warn">${icon('alert')}<span><b>Con ${money(p.pagoMensual)} al mes no terminas de pagar.</b>El interés mensual es de ${money(p.interesMensual)}: tu pago apenas lo cubre. Abona más a capital.</span></div>`
      : p.configurado ? `<p class="small muted">Con pagos de ${money(p.pagoMensual)} pagarás ${money(p.interesesTotales)} de intereses en total (estimado, sin comisiones ni seguros).</p>`
      : `<div class="notice">${icon('info')}<span>Captura tu pago mensual y la tasa para saber en cuánto tiempo terminas y cuánto pagas de intereses.</span></div>`}
    <details class="more" ${p.configurado ? '' : 'open'}><summary>Datos del préstamo</summary>
      <form class="d-form cols-4" data-form="${esc(c.id)}">
        <label class="field"><span>Pago mensual</span><input name="pagoMensual" type="number" min="0" step="10" value="${esc(c.pagoMensual ?? '')}" /></label>
        <label class="field"><span>Tasa anual (%)</span><input name="tasa" type="number" min="0" max="200" step="0.1" value="${esc(c.tasaAnual != null ? +(c.tasaAnual * 100).toFixed(2) : '')}" /></label>
        <button class="btn">${icon('check')}Guardar datos</button>
      </form></details>
  </article>`;
}

export function render(main) {
  const foto = getFoto();
  const tdc = foto.cuentas.filter((c) => c.tipo === 'credito');
  const pres = foto.cuentas.filter((c) => c.tipo === 'prestamo');
  const total = [...tdc, ...pres].reduce((s, c) => s + Math.max(0, c.saldo), 0);
  const porPagar = tdc.reduce((s, c) => s + (estadoTarjeta(foto, c).pagoSinIntereses ?? 0), 0);

  main.innerHTML = `<section class="view deudas">
    <div class="page-head"><div><h1>Tarjetas y deudas</h1><p class="sub">Cuánto pagar, cuándo y cuánto te cuesta no hacerlo.</p></div></div>
    ${tdc.length || pres.length ? `<div class="card d-sum">
      <div><span>Deuda total</span><b class="num">${money(total)}</b></div>
      ${tdc.length ? `<div><span>Para no generar intereses este periodo</span><b class="num">${money(porPagar)}</b></div>` : ''}
    </div>
    ${tdc.map((c) => tarjeta(foto, c)).join('')}${pres.map(prestamo).join('')}
    <div class="notice">${icon('book')}<span><b>Paga el total, no el mínimo.</b>Si pagas completo el saldo al corte antes de la fecha límite, la tarjeta no te cobra intereses. Pagar transfiriendo desde tu débito no es un gasto: el gasto ya lo registraste al comprar.</span></div>`
    : `<div class="card empty">${icon('credit-card')}<p>No tienes tarjetas de crédito ni préstamos registrados.</p><a class="btn" href="#/ajustes">${icon('plus')}Agregar en Ajustes</a></div>`}
    <p class="disclaimer">Estimaciones con las reglas generales de Banxico. Tu banco puede calcular distinto: confirma con tu estado de cuenta.</p>
  </section>`;

  main.querySelectorAll('[data-form]').forEach((f) => (f.onsubmit = (ev) => {
    ev.preventDefault();
    const fd = new FormData(f), c = {};
    for (const k of ['limite', 'diaCorte', 'diaPago', 'pagoMensual']) if (fd.has(k)) c[k] = num(fd.get(k));
    if (fd.has('tasa')) c.tasaAnual = fd.get('tasa') === '' ? undefined : Number(fd.get('tasa')) / 100;
    for (const k of ['diaCorte', 'diaPago']) if (c[k] != null && !(c[k] >= 1 && c[k] <= 31)) { toast('El día debe estar entre 1 y 31', icon('alert')); return; }
    editarCuenta(f.dataset.form, c);
    toast('Datos guardados', icon('check-circle'));
  }));
  main.querySelectorAll('[data-pagar]').forEach((b) => (b.onclick = () => {
    const origen = foto.cuentas.find((c) => c.tipo === 'debito') ?? foto.cuentas.find((c) => !c.esDeuda);
    if (!origen) { toast('Agrega una cuenta de débito o efectivo para pagar', icon('alert')); return; }
    abrirFormulario({ tipo: 'transferencia', preset: { cuenta: origen.id, cuentaDestino: b.dataset.pagar, monto: Number(b.dataset.monto) || '', nota: 'Pago de tarjeta' } });
  }));
}
