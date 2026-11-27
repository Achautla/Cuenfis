import { getEstado, getFoto, aplicar } from '../data/store.js';
import { CATEGORIAS, PAGADORES, REGIMENES } from '../data/catalogo.js';
import { resumenClientes, recibidoDeFactura } from '../core/agenda.js';
import { periodo, rangoMes, ym } from '../core/motor.js';
import { vigente, categoriaDeCobro, regimenesEn } from '../core/regimen.js';
import { guardarFactura, cobrarFactura, cancelarFactura, nuevoId } from '../data/acciones.js';
import { icon } from '../ui/icons.js';
import { $, esc, money, fechaLarga, fechaCorta, toast } from '../ui/dom.js';
import { confirmar } from '../ui/confirmar.js';
import '../styles/views/clientes.css';

let filtro = 'pendiente';

function chip(f, hoy) {
  if (f.estado === 'cobrada') return '<span class="chip ok">Cobrada</span>';
  if (f.estado === 'cancelada') return '<span class="chip">Cancelada</span>';
  if (f.vence && f.vence < hoy) return '<span class="chip warn">Vencida</span>';
  return '<span class="chip info">Por cobrar</span>';
}

function abrirCobro(f, main) {
  const estado = getEstado();
  const foto = getFoto();
  const d = $('#dlg');
  const cuentas = estado.cuentas.filter((c) => !['credito', 'prestamo'].includes(c.tipo)).sort((a, b) => (b.tipo === 'debito') - (a.tipo === 'debito'));
  const esperado = recibidoDeFactura(f);
  d.onclick = null;
  d.innerHTML = `<form id="fCobro"><div class="dlg-head"><h2>Registrar cobro</h2><button type="button" class="btn ghost icon" data-x aria-label="Cerrar">${icon('x')}</button></div>
    <div class="dlg-body">
      <p class="muted" style="margin-bottom:12px">${esc(f.cliente)}${f.folio ? ` · folio ${esc(f.folio)}` : ''} · subtotal ${money(f.subtotal)}</p>
      <div class="cols-2"><label class="field"><span>Fecha en que te pagaron</span><input name="fecha" type="date" required value="${foto.hoy}" min="${esc(f.fecha)}" max="${foto.hoy}" /></label>
      <label class="field"><span>Cuenta</span><select name="cuenta">${cuentas.map((c) => `<option value="${esc(c.id)}">${esc(c.nombre)}</option>`).join('')}</select></label></div>
      <label class="field"><span>Monto que llegó</span><input name="monto" type="number" step="0.01" min="0.01" required value="${esperado}" /><span class="hint">Esperado: ${money(esperado)}${f.pagador === 'pm' ? ', ya sin las retenciones de la empresa' : ''}.</span></label>
      <div id="cobroCat" class="small muted"></div>
    </div>
    <div class="dlg-foot"><button type="button" class="btn ghost" data-x>Cancelar</button><button class="btn in">${icon('check')}Registrar cobro</button></div></form>`;
  const form = $('#fCobro', d);
  const pintar = () => {
    const c = categoriaDeCobro(foto.perfil, form.fecha.value, CATEGORIAS);
    $('#cobroCat', d).innerHTML = c ? `Se registra como <b>${esc(c.nombre)}</b> en la fecha del cobro${c.reg === 'resico' ? ' y entra a la declaración de ese mes' : ''}.` : `<span class="neg">En esa fecha no tienes un régimen con actividad. Revisa tus regímenes en Ajustes.</span>`;
  };
  pintar();
  form.fecha.oninput = pintar;
  d.onclick = (ev) => { if (ev.target.closest('[data-x]')) { d.onclick = null; d.close(); } };
  form.onsubmit = (ev) => {
    ev.preventDefault();
    const fd = new FormData(form);
    const cat = categoriaDeCobro(foto.perfil, fd.get('fecha'), CATEGORIAS);
    if (fd.get('fecha') < f.fecha) { toast('La fecha de cobro no puede ser antes de la emisión de la factura', icon('alert')); return; }
    if (!(Number(fd.get('monto')) > 0)) { toast('Escribe un monto mayor a cero', icon('alert')); return; }
    if (!cat) { toast('En esa fecha no tienes un régimen con actividad', icon('alert')); return; }
    aplicar((s) => cobrarFactura(s, f.id, { fecha: fd.get('fecha'), cuenta: fd.get('cuenta'), monto: Number(fd.get('monto')), categoria: cat.id }));
    d.onclick = null; d.close();
    toast(cat.reg === 'resico' ? 'Cobro registrado. Ya cuenta para tu declaración del mes.' : 'Cobro registrado', icon('check-circle'));
  };
  d.showModal();
}

export function render(main) {
  const estado = getEstado();
  const foto = getFoto();
  const res = resumenClientes(estado, foto.hoy);
  const facturas = [...(estado.facturas ?? [])].map((f) => ({ estado: 'pendiente', ...f })).sort((a, b) => b.fecha.localeCompare(a.fecha));
  const [a, b] = rangoMes(ym(foto.hoy));
  const cobradoMes = facturas.filter((f) => f.estado === 'cobrada' && f.cobradaEl >= a && f.cobradaEl <= b).reduce((s, f) => s + (foto.movs.find((m) => m.id === f.movId)?.monto ?? 0), 0);
  const conResico = vigente(foto.perfil, 'resico', foto.hoy);
  const regsAct = regimenesEn(foto.perfil, foto.hoy).filter((r) => REGIMENES[r]?.actividad);
  const vista = facturas.filter((f) => filtro === 'todas' || (filtro === 'pendiente' ? f.estado === 'pendiente' : f.estado === filtro));
  const clientes = [...new Set(facturas.map((f) => f.cliente))];
  const tasaDef = foto.perfil.frontera ? 0.08 : 0.16;

  main.innerHTML = `<section class="view clientes">
    <div class="page-head"><div><h1>Clientes y cobros</h1><p class="sub">Tus facturas emitidas y lo que te deben.</p></div></div>
    <div class="card c-sum">
      <div><span>Por cobrar</span><b class="num">${money(res.porCobrar)}</b><small>Lo que llegará a tu cuenta</small></div>
      <div><span>Vencido</span><b class="num ${res.vencido ? 'neg' : ''}">${money(res.vencido)}</b><small>Pasó su fecha de pago</small></div>
      <div><span>Cobrado este mes</span><b class="num pos">${money(cobradoMes)}</b><small>De facturas registradas aquí</small></div>
    </div>
    <div class="notice">${icon('info')}<span>${conResico
      ? '<b>En RESICO solo cuenta lo que cobraste.</b>Una factura emitida pero no pagada no entra a tu declaración; entra el mes en que te pagan. Por eso aquí no se suma a impuestos hasta que registras el cobro.'
      : `<b>Tu ingreso se registra al cobrar.</b>${regsAct.length ? `En ${esc(regsAct.map((r) => REGIMENES[r].corto).join(' y '))} las personas físicas acumulan lo efectivamente cobrado.` : 'Hoy no tienes un régimen con actividad vigente: puedes consultar tu historial, pero para nuevos cobros agrega tu régimen en Ajustes.'}`}</span></div>

    ${res.clientes.length ? `<div class="card"><div class="card-head"><h2>Por cliente</h2></div>
      <ul class="cli-list">${res.clientes.map((c) => `<li><span><b>${esc(c.cliente)}</b><span class="small muted">${c.facturas.length} factura(s) · facturado ${money(c.facturado)} · cobrado ${money(c.cobrado)}</span></span>
        <span class="cl-pend"><b class="num ${c.vencido ? 'neg' : ''}">${money(c.pendiente)}</b><span class="small muted">${c.vencido ? `${money(c.vencido)} vencido` : 'pendiente'}</span></span></li>`).join('')}</ul></div>` : ''}

    <div class="card">
      <div class="card-head"><h2>Facturas</h2><span class="spacer"></span>
        <div class="seg" role="group" aria-label="Filtrar">${[['pendiente', 'Por cobrar'], ['cobrada', 'Cobradas'], ['todas', 'Todas']].map(([k, t]) => `<button data-fil="${k}" aria-pressed="${filtro === k}">${t}</button>`).join('')}</div></div>
      ${vista.length ? `<ul class="fac-list">${vista.map((f) => `<li data-id="${esc(f.id)}">
        <span class="fl-main"><b>${esc(f.cliente)}</b><span class="small muted">${f.folio ? `Folio ${esc(f.folio)} · ` : ''}${esc(f.concepto || PAGADORES[f.pagador] || '')}</span>
          <span class="small muted">Emitida ${esc(fechaCorta(f.fecha))}${f.estado === 'cobrada' ? ` · cobrada ${esc(fechaCorta(f.cobradaEl))}` : f.vence ? ` · vence ${esc(fechaCorta(f.vence))}` : ''}</span></span>
        <span class="fl-amt"><b class="num">${money(recibidoDeFactura(f))}</b><span class="small muted num">Subtotal ${money(f.subtotal)}</span>${chip(f, foto.hoy)}</span>
        ${f.estado === 'pendiente' ? `<span class="row fl-acc"><button class="btn sm in" data-cobrar>${icon('check')}Cobrar</button><button class="btn sm ghost" data-cancelar>Cancelar factura</button></span>` : ''}
      </li>`).join('')}</ul>` : `<div class="empty">${icon('receipt')}<p>${filtro === 'pendiente' ? 'Nadie te debe. Registra abajo las facturas que emitas.' : 'Sin facturas aquí.'}</p></div>`}
    </div>

    <form class="card" id="fFac">
      <div class="card-head"><h2>Registrar factura emitida</h2></div>
      <div class="c-form">
        <label class="field"><span>Cliente</span><input name="cliente" required maxlength="80" list="dlClientes" /><datalist id="dlClientes">${clientes.map((c) => `<option value="${esc(c)}">`).join('')}</datalist></label>
        <label class="field"><span>Concepto</span><input name="concepto" maxlength="80" placeholder="Diseño de logotipo" /></label>
        <label class="field"><span>Subtotal (sin IVA)</span><input name="subtotal" type="number" min="0.01" step="0.01" required /></label>
        <label class="field"><span>IVA</span><select name="tasaIva">${[[0.16, '16%'], [0.08, '8% (frontera)'], [0, '0%'], ['exento', 'Exento']].map(([v, t]) => `<option value="${v}" ${v === tasaDef ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
        <label class="field"><span>¿A quién le facturaste?</span><select name="pagador">${Object.entries(PAGADORES).map(([k, t]) => `<option value="${k}">${t}</option>`).join('')}</select></label>
        <label class="field"><span>Folio (opcional)</span><input name="folio" maxlength="40" /></label>
        <label class="field"><span>Fecha de emisión</span><input name="fecha" type="date" required value="${foto.hoy}" /></label>
        <label class="field"><span>Fecha de pago acordada</span><input name="vence" type="date" /></label>
      </div>
      <p class="small muted" id="facPrev" aria-live="polite"></p>
      <button class="btn primary">${icon('plus')}Registrar factura</button>
    </form>
    <p class="disclaimer">Cálculos estimados con reglas fiscales 2026. Esta pantalla no emite CFDI: regístralos aquí después de emitirlos en el portal del SAT o con tu proveedor.</p>
  </section>`;

  main.querySelectorAll('[data-fil]').forEach((b) => (b.onclick = () => { filtro = b.dataset.fil; render(main); }));
  main.querySelectorAll('.fac-list li').forEach((li) => {
    const f = facturas.find((x) => x.id === li.dataset.id);
    li.querySelector('[data-cobrar]')?.addEventListener('click', () => abrirCobro(f, main));
    li.querySelector('[data-cancelar]')?.addEventListener('click', async () => {
      if (!(await confirmar({ titulo: `¿Cancelar la factura de ${f.cliente}?`, accion: 'Cancelar factura', efectos: [`Por ${money(recibidoDeFactura(f))}${f.folio ? `, folio ${f.folio}` : ''}.`, 'Deja de contar como por cobrar y no se puede volver a cobrar aquí.', 'Esto no la cancela ante el SAT: hazlo también en el portal.'] }))) return;
      aplicar((s) => cancelarFactura(s, f.id)); toast('Factura cancelada. Recuerda cancelarla también ante el SAT.', icon('info')); });
  });
  const form = $('#fFac', main);
  const leer = () => { const d = new FormData(form); const t = d.get('tasaIva'); return { cliente: d.get('cliente').trim(), concepto: d.get('concepto').trim(), subtotal: Number(d.get('subtotal')), tasaIva: t === 'exento' ? 'exento' : Number(t), pagador: d.get('pagador'), folio: d.get('folio').trim() || undefined, fecha: d.get('fecha'), vence: d.get('vence') || undefined }; };
  const prev = () => { const f = leer(); $('#facPrev', main).textContent = f.subtotal > 0 && f.fecha ? `Te llegarán ${money(recibidoDeFactura(f))}${f.pagador === 'pm' ? ' (la empresa te retiene 1.25% de ISR y 2/3 del IVA)' : ''}.` : ''; };
  form.addEventListener('input', prev);
  form.onsubmit = (ev) => {
    ev.preventDefault();
    const f = leer();
    if (!(f.subtotal > 0)) { toast('Escribe un subtotal mayor a cero', icon('alert')); return; }
    if (f.vence && f.vence < f.fecha) { toast('La fecha de pago no puede ser antes de la emisión', icon('alert')); return; }
    aplicar((s) => guardarFactura(s, { id: nuevoId(), ...f }));
    filtro = 'pendiente';
    toast('Factura registrada como por cobrar', icon('receipt'));
  };
}
