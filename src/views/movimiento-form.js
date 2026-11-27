// Captura, detalle y edición de movimientos.
import { CATEGORIAS, categoria, FORMAS_PAGO, PAGADORES } from '../data/catalogo.js';
import { categoriasDisponibles } from '../core/regimen.js';
import { calcular } from '../core/motor.js';
import { leerFoto, guardarFoto, borrarFoto } from '../data/fotos.js';
import { agregarMovimiento, editarMovimiento, borrarMovimiento, guardarRecurrente, nuevoId } from '../data/acciones.js';
import { getEstado, getFoto, aplicar } from '../data/store.js';
import { icon } from '../ui/icons.js';
import { $, $$, esc, money, hoyISO, toast, fechaLarga, nombreMes } from '../ui/dom.js';
import { confirmar } from '../ui/confirmar.js';
import { desgloseHTML, detalleTexto, chipsFiscales } from './comun.js';
import { cruceDeUmbral } from '../core/presupuestos.js';
import { ym } from '../core/motor.js';
import '../styles/views/movimiento-form.css';

const dlg = () => $('#dlg');
const TIPOS = { entrada: ['Entrada', 'arrow-down-left'], salida: ['Salida', 'arrow-up-right'], transferencia: ['Transferencia', 'swap'] };

function cerrar() { dlg().oncancel = null; dlg().close(); }

/** Abre el formulario. `mov` existente = edición. */
export function abrirFormulario({ tipo = 'entrada', mov = null, preset = null } = {}) {
  const estado = getEstado();
  const perfil = estado.perfil;
  const draft = mov ? structuredClone(mov) : {
    id: nuevoId(), tipo, fecha: hoyISO(), monto: '', cuenta: estado.cuentas.find((c) => c.tipo === 'debito')?.id ?? estado.cuentas[0]?.id,
    formaPago: 'transferencia', pagador: 'pf', tasaIva: perfil?.frontera ? 0.08 : 0.16, cfdi: false, ...(preset ?? {}),
  };
  let repetir = '';
  let confirmarNegativo = false;

  const d = dlg();
  d.innerHTML = `<form id="movForm" novalidate>
    <div class="dlg-head"><h2>${mov ? 'Editar movimiento' : 'Registrar movimiento'}</h2>
      <button type="button" class="btn ghost icon" data-x aria-label="Cerrar">${icon('x')}</button></div>
    <div class="dlg-body">
      <div class="seg full" role="group" aria-label="Tipo" id="fTipo">${Object.entries(TIPOS).map(([k, [t, i]]) =>
        `<button type="button" data-t="${k}" aria-pressed="${draft.tipo === k}">${icon(i)}${t}</button>`).join('')}</div>
      <label class="field amount-field"><span id="lblMonto">Monto</span>
        <div class="amount-wrap"><span>$</span><input name="monto" type="number" inputmode="decimal" step="0.01" min="0.01" required value="${esc(draft.monto)}" placeholder="0.00" /></div>
        <span class="hint" id="hintMonto"></span></label>
      <div class="cols-2">
        <label class="field"><span>Fecha</span><input name="fecha" type="date" required value="${esc(draft.fecha)}" /></label>
        <label class="field"><span id="lblCuenta">Cuenta</span><select name="cuenta">${estado.cuentas.map((c) => `<option value="${esc(c.id)}">${esc(c.nombre)}</option>`).join('')}</select></label>
      </div>
      <div id="zonaCat"></div>
      <div id="zonaExtra"></div>
      ${mov ? '' : `<label class="field" id="zonaRep"><span>Repetir</span><select name="repetir"><option value="">Solo esta vez</option><option value="mensual">Cada mes, el mismo día</option><option value="quincenal">Cada quincena (15 y fin de mes)</option><option value="semanal">Cada semana</option></select>
        <span class="hint">Para renta, nómina o suscripciones. Te pediremos confirmarlo cada vez, con el monto real.</span></label>`}
      <div id="preview" aria-live="polite"></div>
    </div>
    <div class="dlg-foot">
      ${mov ? `<button type="button" class="btn danger" data-del>${icon('trash')}Borrar</button><span class="spacer"></span>` : ''}
      <button type="button" class="btn ghost" data-x>Cancelar</button>
      <button type="submit" class="btn primary" id="btnGuardar">${icon('check')}Guardar</button>
    </div></form>`;
  const f = $('#movForm', d);
  f.cuenta.value = draft.cuenta;

  const leer = () => {
    const fd = new FormData(f);
    draft.monto = fd.get('monto') === '' ? '' : Number(fd.get('monto'));
    draft.fecha = fd.get('fecha') || hoyISO();
    draft.cuenta = fd.get('cuenta');
    repetir = fd.get('repetir') ?? '';
    for (const k of ['cuentaDestino', 'formaPago', 'contraparte', 'nota', 'uuid']) if (fd.has(k)) draft[k] = fd.get(k);
    if (fd.has('tasaIva')) { const v = fd.get('tasaIva'); draft.tasaIva = v === 'exento' ? 'exento' : Number(v); }
    draft.cfdi = fd.has('cfdi') ? true : (f.querySelector('[name=cfdi]') ? false : draft.cfdi);
    for (const k of ['sueldoBruto', 'isrRetenidoNomina']) if (fd.has(k)) draft[k] = fd.get(k) === '' ? undefined : Number(fd.get(k));
    if (f.querySelector('[name=aj_subtotal]')) {
      const aj = {};
      for (const k of ['subtotal', 'iva', 'isrRet', 'ivaRet']) { const v = fd.get('aj_' + k); if (v !== '' && v != null) aj[k] = Number(v); }
      draft.ajuste = Object.keys(aj).length ? aj : undefined;
    } else draft.ajuste = undefined; // "Mi factura dice otra cosa" solo aplica a cobros con factura
  };

  const pintarCategorias = () => {
    const z = $('#zonaCat', d);
    if (draft.tipo === 'transferencia') { z.innerHTML = ''; draft.categoria = undefined; return; }
    const cats = categoriasDisponibles(perfil, draft.fecha, draft.tipo, CATEGORIAS, mov?.categoria);
    if (!cats.some((c) => c.id === draft.categoria)) draft.categoria = cats[0]?.id;
    z.innerHTML = `<p class="field-label">Categoría</p><div class="catgrid" role="radiogroup" aria-label="Categoría">${cats.map((c) =>
      `<button type="button" role="radio" aria-checked="${c.id === draft.categoria}" data-c="${c.id}"><span class="avatar" style="background:${c.color}">${icon(c.icono)}</span><span>${esc(c.nombre)}</span></button>`).join('')}</div>`;
  };

  const pintarExtra = () => {
    const z = $('#zonaExtra', d);
    const cat = draft.categoria ? categoria(draft.categoria) : null;
    let h = '';
    if (cat?.tip) h += `<div class="notice">${icon('info')}<span>${esc(cat.tip)}</span></div>`;
    if (draft.tipo === 'transferencia') {
      h += `<label class="field"><span>Cuenta destino</span><select name="cuentaDestino">${getEstado().cuentas.filter((c) => c.id !== draft.cuenta).map((c) => `<option value="${esc(c.id)}" ${c.id === draft.cuentaDestino ? 'selected' : ''}>${esc(c.nombre)}</option>`).join('')}</select>
        <span class="hint">Mover dinero entre tus cuentas o pagar tu tarjeta no cuenta como gasto ni como ingreso.</span></label>`;
    } else {
      const esIngresoFiscal = draft.tipo === 'entrada' && cat?.clase === 'ingreso' && cat.reg !== 'sueldos';
      const conIva = esIngresoFiscal || (draft.tipo === 'salida' && ['actividad', 'deduccion'].includes(cat?.clase));
      if (esIngresoFiscal) {
        h += `<p class="field-label">¿Quién te pagó?</p><div class="seg full" id="fPagador">${Object.entries(PAGADORES).map(([k, t]) =>
          `<button type="button" data-p="${k}" aria-pressed="${draft.pagador === k}">${t}</button>`).join('')}</div>
          <p class="hint" style="margin:6px 0 14px">${draft.pagador === 'pm' ? 'Una empresa (persona moral) te retiene 1.25% de ISR y 2/3 del IVA. Captura lo que llegó a tu cuenta.' : 'Captura lo que llegó a tu cuenta, con IVA incluido.'}</p>`;
      }
      h += `<div class="cols-2"><label class="field"><span>Forma de pago</span><select name="formaPago">${Object.entries(FORMAS_PAGO).map(([k, t]) => `<option value="${k}" ${draft.formaPago === k ? 'selected' : ''}>${t}</option>`).join('')}</select></label>`;
      if (conIva) h += `<label class="field"><span>IVA</span><select name="tasaIva">${[[0.16, '16%'], [0.08, '8% (frontera)'], [0, '0%'], ['exento', 'Exento']].map(([v, t]) => `<option value="${v}" ${String(draft.tasaIva) === String(v) ? 'selected' : ''}>${t}</option>`).join('')}</select></label>`;
      h += '</div>';
      if (conIva || (cat?.clase === 'ingreso')) {
        h += `<label class="check"><input type="checkbox" name="cfdi" ${draft.cfdi ? 'checked' : ''}/> <span>Tiene factura (CFDI)${cat?.reg === 'sueldos' ? ' o recibo de nómina' : ''}<small>${draft.tipo === 'salida' ? 'A tu RFC. Sin ella no se deduce ni se acredita el IVA.' : 'Guárdala: el SAT la cruza con tu declaración.'}</small></span></label>`;
        if (draft.cfdi) h += `<label class="field"><span>Folio fiscal (UUID), opcional</span><input name="uuid" maxlength="36" value="${esc(draft.uuid ?? '')}" placeholder="XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX" /></label>`;
      }
      if (cat?.reg === 'sueldos') {
        h += `<details class="more" ${draft.sueldoBruto ? 'open' : ''}><summary>Datos de tu recibo de nómina (recomendado)</summary>
          <div class="cols-2"><label class="field"><span>Sueldo bruto del periodo</span><input name="sueldoBruto" type="number" step="0.01" min="0" value="${esc(draft.sueldoBruto ?? '')}" /></label>
          <label class="field"><span>ISR retenido</span><input name="isrRetenidoNomina" type="number" step="0.01" min="0" value="${esc(draft.isrRetenidoNomina ?? '')}" /></label></div>
          <p class="hint">Si los dejas vacíos, la app los estima desde lo que te depositaron.</p></details>`;
      }
      h += `<div class="cols-2"><label class="field"><span>${draft.tipo === 'entrada' ? 'Cliente o quién te pagó' : 'Proveedor o comercio'} (opcional)</span><input name="contraparte" maxlength="80" value="${esc(draft.contraparte ?? '')}" /></label>
        <label class="field"><span>Nota (opcional)</span><input name="nota" maxlength="80" value="${esc(draft.nota ?? '')}" /></label></div>`;
      if (esIngresoFiscal) {
        const aj = draft.ajuste ?? {};
        h += `<details class="more" ${draft.ajuste ? 'open' : ''}><summary>Mi factura dice otra cosa</summary><p class="hint" style="margin-bottom:10px">Escribe solo lo que cambie. Lo demás se calcula.</p>
          <div class="cols-2">${[['subtotal', 'Subtotal'], ['iva', 'IVA'], ['isrRet', 'ISR retenido'], ['ivaRet', 'IVA retenido']].map(([k, t]) =>
            `<label class="field"><span>${t}</span><input name="aj_${k}" type="number" step="0.01" min="0" value="${esc(aj[k] ?? '')}" /></label>`).join('')}</div></details>`;
      }
    }
    z.innerHTML = h;
  };

  const pintarPreview = () => {
    const p = $('#preview', d);
    $('#lblMonto', d).textContent = draft.tipo === 'entrada' ? 'Monto que llegó a tu cuenta' : draft.tipo === 'salida' ? 'Monto que pagaste' : 'Monto que moviste';
    $('#lblCuenta', d).textContent = draft.tipo === 'transferencia' ? 'Cuenta origen' : 'Cuenta';
    if (!(draft.monto > 0) || draft.tipo === 'transferencia') { p.innerHTML = ''; return; }
    const e = getEstado();
    const sim = calcular({ ...e, movimientos: [...e.movimientos.filter((m) => m.id !== draft.id), draft] }, hoyISO());
    const m = sim.movs.find((x) => x.id === draft.id);
    const avisos = m.d.motivos.map((t) => `<div class="notice warn">${icon('alert')}<span>${esc(t)}</span></div>`).join('');
    const neg = sim.cuentas.find((c) => c.id === draft.cuenta);
    const negHTML = draft.tipo !== 'entrada' && neg && !neg.esDeuda && neg.saldo < 0
      ? `<div class="notice warn">${icon('alert')}<span><b>${esc(neg.nombre)} quedaría en ${money(neg.saldo)}.</b>${confirmarNegativo ? 'Toca Guardar otra vez para confirmar.' : 'Revisa el monto o la cuenta.'}</span></div>` : '';
    const des = desgloseHTML(m);
    p.innerHTML = `${des ? `<p class="field-label">Así queda</p>${des}` : ''}${avisos}${negHTML}`;
  };

  const todo = () => { pintarCategorias(); pintarExtra(); pintarPreview(); };
  todo();

  // Candado: no perder lo capturado por un toque accidental en Cancelar, la X o la tecla Esc
  let sucio = false;
  const intentarCerrar = async () => {
    if (sucio && !(await confirmar({ titulo: mov ? '¿Descartar los cambios?' : '¿Descartar este movimiento?', accion: 'Descartar', texto: 'Lo que capturaste no se guardará.' }))) return;
    cerrar();
  };
  d.oncancel = (ev) => { ev.preventDefault(); intentarCerrar(); };

  f.addEventListener('click', (ev) => {
    if (ev.target.closest('[data-t], [data-c], [data-p]')) sucio = true;
    const t = ev.target.closest('[data-t]'); if (t) { leer(); draft.tipo = t.dataset.t; $$('#fTipo button', d).forEach((b) => b.setAttribute('aria-pressed', b === t)); todo(); return; }
    const c = ev.target.closest('[data-c]'); if (c) { leer(); draft.categoria = c.dataset.c; $$('.catgrid [data-c]', d).forEach((b) => b.setAttribute('aria-checked', b === c)); pintarExtra(); pintarPreview(); return; }
    const pg = ev.target.closest('[data-p]'); if (pg) { leer(); draft.pagador = pg.dataset.p; pintarExtra(); pintarPreview(); return; }
    if (ev.target.closest('[data-x]')) intentarCerrar();
    if (ev.target.closest('[data-del]')) borrar();
  });
  const borrar = async () => {
    const e = getEstado();
    const fac = (e.facturas ?? []).find((x) => x.movId === mov.id);
    const dec = e.declaraciones?.[mov.fecha.slice(0, 7)];
    const efectos = [`${categoria(mov.categoria).nombre ?? 'Transferencia'} por ${money(mov.monto)} del ${fechaLarga(mov.fecha)}.`];
    if (fac) efectos.push(`Es el cobro de la factura de ${fac.cliente}: volverá a quedar "por cobrar".`);
    if (dec && dec.estado !== 'pendiente' && categoria(mov.categoria).reg) efectos.push(`La declaración de ${nombreMes(mov.fecha.slice(0, 7))} ya está marcada como ${dec.estado}: cambiarían sus números y quizá debas presentar una complementaria.`);
    if (mov.recurrente) efectos.push('Viene de un recurrente; esa fecha no volverá a pedirse.');
    efectos.push('Se recalculan tus saldos, impuestos y presupuestos.');
    if (!(await confirmar({ titulo: '¿Borrar este movimiento?', accion: 'Borrar movimiento', efectos }))) return;
    aplicar((s) => borrarMovimiento(s, draft.id)); borrarFoto(draft.id); cerrar(); toast('Movimiento borrado', icon('trash'));
  };
  f.addEventListener('change', () => { sucio = true; });
  f.addEventListener('input', (ev) => {
    sucio = true;
    const n = ev.target.name; leer();
    if (n === 'fecha') { pintarCategorias(); pintarExtra(); }
    if (n === 'cfdi' || n === 'cuenta') pintarExtra();
    confirmarNegativo = false; pintarPreview();
  });
  f.addEventListener('submit', async (ev) => {
    ev.preventDefault(); leer();
    if (!(draft.monto > 0)) { $('#hintMonto', d).textContent = 'Escribe un monto mayor a cero.'; f.monto.focus(); return; }
    if (draft.tipo === 'transferencia' && !draft.cuentaDestino) { toast('Agrega otra cuenta en Ajustes para transferir'); return; }
    const sim = calcular({ ...getEstado(), movimientos: [...getEstado().movimientos.filter((m) => m.id !== draft.id), draft] }, hoyISO());
    const c = sim.cuentas.find((x) => x.id === draft.cuenta);
    if (draft.tipo !== 'entrada' && c && !c.esDeuda && c.saldo < 0 && !confirmarNegativo) { confirmarNegativo = true; pintarPreview(); return; }
    const limpio = Object.fromEntries(Object.entries(draft).filter(([, v]) => v !== undefined && v !== ''));
    // Candado: cambiar un mes ya declarado
    const decls = getEstado().declaraciones ?? {};
    const fiscal = (x) => x && (categoria(x.categoria).reg || categoria(x.categoria).clase === 'actividad');
    const mesesDecl = [...new Set([mov && fiscal(mov) ? mov.fecha.slice(0, 7) : null, fiscal(draft) ? draft.fecha.slice(0, 7) : null])]
      .filter((k) => k && decls[k]?.estado && decls[k].estado !== 'pendiente');
    if (mesesDecl.length && !(await confirmar({ titulo: `¿${mov ? 'Cambiar' : 'Agregar'} un movimiento de un mes ya declarado?`, accion: 'Guardar de todos modos', peligro: false,
      efectos: [`${mesesDecl.map(nombreMes).join(' y ')} ya está marcado como ${mesesDecl.map((k) => decls[k].estado).join(' / ')}.`, 'Sus cálculos cambiarán y el SAT ya tiene los números anteriores: quizá debas presentar una declaración complementaria.'] }))) return;
    const antes = getFoto();
    // Al editar, los campos que se vaciaron (ajuste, sueldo bruto, nota...) se quitan del movimiento
    const quitados = Object.fromEntries(Object.keys(mov ?? {}).filter((k) => !(k in limpio) && !['id', 'historial'].includes(k)).map((k) => [k, undefined]));
    if (mov) aplicar((s) => editarMovimiento(s, mov.id, { ...quitados, ...limpio }));
    else aplicar((s) => agregarMovimiento(s, limpio));
    if (!mov && repetir) {
      const { id, fecha, historial, uuid, ...plantilla } = limpio;
      aplicar((s) => guardarRecurrente(s, { nombre: limpio.nota || limpio.contraparte || (limpio.categoria ? categoria(limpio.categoria).nombre : 'Transferencia'),
        frecuencia: repetir, dia: +fecha.slice(8, 10), desde: fecha, hechas: [fecha], plantilla }));
    }
    cerrar();
    if (!mov && repetir) { toast('Guardado. Lo verás en Recurrentes para confirmarlo cada vez.', icon('clock')); return; }
    avisoAlGuardar(antes, getFoto(), draft, !!mov);
  });

  if (!d.open) d.showModal();
  setTimeout(() => f.monto.focus(), 50);
}

/** Detalle de un movimiento con su desglose y su historial. */
export function abrirDetalle(id) {
  const foto = getFoto();
  const m = foto.movs.find((x) => x.id === id);
  if (!m) return;
  const cat = m.tipo === 'transferencia' ? { nombre: 'Transferencia', icono: 'swap', color: '#475569' } : categoria(m.categoria);
  const d = dlg();
  const filas = detalleTexto(m).map(([k, v]) => `<div class="ln"><span>${esc(k)}</span><span>${esc(v)}</span></div>`).join('');
  const hist = (m.historial ?? []).map((h) => `<li>${esc(h.accion === 'creado' ? 'Creado' : 'Editado')} el ${esc(fechaLarga(h.en.slice(0, 10)))}${h.antes && Object.keys(h.antes).length ? ` <span class="muted">(antes: ${esc(Object.entries(h.antes).map(([k, v]) => `${k} ${typeof v === 'object' ? JSON.stringify(v) : v}`).join(', '))})</span>` : ''}</li>`).join('');
  d.innerHTML = `<div class="dlg-head"><span class="avatar" style="background:${cat.color}">${icon(cat.icono)}</span><h2>${esc(m.nota || m.contraparte || cat.nombre)}</h2>
      <button type="button" class="btn ghost icon" data-x aria-label="Cerrar">${icon('x')}</button></div>
    <div class="dlg-body detail">
      <p class="detail-amount num ${m.tipo === 'entrada' ? 'pos' : ''}">${m.tipo === 'entrada' ? '+' : m.tipo === 'salida' ? '−' : ''}${money(m.monto)}</p>
      <p class="muted">${esc(cat.nombre)} · ${esc(fechaLarga(m.fecha))}</p>
      <div class="row" style="margin:8px 0 16px">${chipsFiscales(m)}</div>
      ${desgloseHTML(m)}
      ${m.d.motivos.map((t) => `<div class="notice warn" style="margin-top:10px">${icon('alert')}<span>${esc(t)}</span></div>`).join('')}
      ${filas ? `<div class="breakdown" style="margin-top:12px">${filas}</div>` : ''}
      <figure class="mov-foto" id="movFoto" hidden><figcaption class="small muted">Foto del ticket, guardada solo en este dispositivo.</figcaption></figure>
      ${hist ? `<details class="more"><summary>Historial de cambios</summary><ul class="hist">${hist}</ul></details>` : ''}
    </div>
    <div class="dlg-foot"><label class="btn ghost" id="movFotoBtn">${icon('camera')}<span>Agregar foto</span><input type="file" accept="image/*" capture="environment" hidden /></label><span class="spacer"></span>${m.categoria === 'impuestos' ? '<span class="small muted">Se edita desde Mi declaración.</span>' : `<button class="btn primary" data-edit>${icon('edit')}Editar</button>`}</div>`;
  d.onclick = (ev) => {
    if (ev.target.closest('[data-x]')) { d.onclick = null; cerrar(); }
    if (ev.target.closest('[data-edit]')) { d.onclick = null; abrirFormulario({ mov: getEstado().movimientos.find((x) => x.id === id) }); }
  };
  const fig = d.querySelector('#movFoto'), btnFoto = d.querySelector('#movFotoBtn');
  const pintarFoto = async () => {
    const blob = await leerFoto(id);
    if (!fig.isConnected) return;
    fig.querySelector('img')?.remove();
    fig.hidden = !blob;
    btnFoto.querySelector('span').textContent = blob ? 'Cambiar foto' : 'Agregar foto';
    if (blob) { const img = new Image(); img.alt = 'Foto del ticket'; img.src = URL.createObjectURL(blob); img.onload = () => URL.revokeObjectURL(img.src); fig.prepend(img); }
  };
  btnFoto.querySelector('input').onchange = async (ev) => {
    const file = ev.target.files?.[0]; ev.target.value = '';
    if (!file) return;
    try { const { prepararFoto } = await import('../ia/imagen.js'); const f = await prepararFoto(file); await guardarFoto(id, f.blob); await pintarFoto(); toast('Foto guardada en este dispositivo', icon('check-circle')); }
    catch (e) { toast(e.message || 'No se pudo guardar la foto', icon('alert')); }
  };
  pintarFoto();
  if (!d.open) d.showModal();
}

// Clic en cualquier movimiento de cualquier pantalla abre su detalle
document.addEventListener('click', (ev) => {
  const b = ev.target.closest('[data-mov]');
  if (b && !b.closest('dialog')) abrirDetalle(b.dataset.mov);
});
// Cerrar al tocar el fondo
document.addEventListener('click', (ev) => {
  const d = dlg();
  if (ev.target !== d) return;
  // Pasa por el mismo candado que Esc: si hay algo capturado, pregunta antes de descartar
  if (d.oncancel) d.oncancel(new Event('cancel', { cancelable: true }));
  else cerrar();
});

/** Impuestos al momento y alertas de presupuesto, justo después de guardar. */
function avisoAlGuardar(antes, despues, draft, edicion) {
  const m = despues.movs.find((x) => x.id === draft.id);
  if (m?.tipo === 'entrada' && m.d.fiscal && m.d.regimen === 'resico' && m.delSat > 0) {
    toast(`Guardado. Aparta ${money(m.delSat)} para el SAT: es el ISR y el IVA de este cobro.`, icon('landmark'));
    return;
  }
  if (m?.tipo === 'salida') {
    const cruce = cruceDeUmbral(antes, despues, getEstado().presupuestos, ym(m.fecha), m.categoria);
    if (cruce) {
      toast(cruce.nivel === 'excedido'
        ? `Te pasaste del presupuesto de ${categoria(m.categoria).nombre} por ${money(-cruce.restante)}.`
        : `Llevas el ${Math.round(cruce.uso * 100)}% del presupuesto de ${categoria(m.categoria).nombre}.`, icon('alert'));
      return;
    }
  }
  toast(edicion ? 'Cambios guardados' : 'Movimiento registrado', icon('check-circle'));
}
