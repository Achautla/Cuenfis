// Asistente Cuenfis: platica con tus datos, registra movimientos en tus palabras y te guía en la declaración.
import { getEstado } from '../data/store.js';
import { categoria } from '../data/catalogo.js';
import { regimenesEn } from '../core/regimen.js';
import * as conv from '../ia/conversacion.js';
import { ETIQUETAS } from '../ia/herramientas.js';
import { iaActiva, decidir, textoPuntos } from '../ia/consentimiento.js';
import { abrirFormulario } from './movimiento-form.js';
import { leerFoto } from '../data/fotos.js';
import { confirmar } from '../ui/confirmar.js';
import { markdown } from '../ui/markdown.js';
import { icon } from '../ui/icons.js';
import { $, esc, money, fechaCorta, hoyISO } from '../ui/dom.js';
import { aparecer } from '../ui/animaciones.js';
import * as mem from '../ia/memoria.js';
import '../styles/views/asistente.css';

let mainRef = null;
let quitar = null;
let borrador = '';
let vistos = 0; // bloques ya mostrados, para animar solo los nuevos
let pintado = false;

const FORMAS = { efectivo: 'Efectivo', tarjeta: 'Tarjeta', transferencia: 'Transferencia' };

function sugerencias(modo) {
  const resico = regimenesEn(getEstado().perfil, hoyISO()).includes('resico');
  if (modo === 'declaracion') return resico
    ? ['Guíame paso a paso con el ISR de este mes', 'Guíame paso a paso con el IVA de este mes', '¿Qué pongo en «IVA acreditable del periodo»?', '¿Qué pongo en «Tasa aplicable»?']
    : ['¿Cómo va mi declaración anual?', '¿Qué deducciones me faltan?', '¿Cuál es el tope de deducciones?'];
  return ['¿Cuánto gasté este mes?', 'Ayer pagué 350 de gasolina con tarjeta', '📷 Toma foto a una factura con QR', '¿Cómo voy de ahorro este año?', resico ? '¿Cuánto voy a pagar al SAT?' : '¿En qué se me va el dinero?'];
}

function barraUso(uso) {
  if (!uso) return '';
  const p = Math.min(100, Math.round((uso.mensajes / uso.limite) * 100));
  const nivel = p >= 90 ? 'alto' : p >= 70 ? 'medio' : '';
  return `<div class="ia-uso ${nivel}" role="group" aria-label="Uso del asistente este mes">
    <div class="ia-uso-txt"><span>${uso.demo ? 'Demostración: ' : ''}<b class="num">${uso.mensajes}</b> de <span class="num">${uso.limite}</span> mensajes este mes</span><span class="num">${p}%</span></div>
    <div class="ia-uso-bar"><span style="width:${p}%"></span></div>
  </div>`;
}

function guardada(id) { return getEstado().movimientos.some((m) => m.id === id); }

function tarjetaPropuesta(x, i) {
  const d = x.datos;
  const ok = x.estado === 'guardada' || (x.id && guardada(x.id));
  const fuera = x.estado === 'descartada';
  const cat = d.categoria ? categoria(d.categoria).nombre : '—';
  return `<div class="ia-prop ${ok ? 'ok' : ''} ${fuera ? 'fuera' : ''}" data-i="${i}">
    ${x.id && x.id.startsWith('ft') ? `<span class="ia-prop-foto">${icon('receipt')}Con foto${d.cfdi ? ' · factura' : ''}</span>` : d.cfdi ? `<span class="ia-prop-foto">${icon('receipt')}Factura</span>` : ''}
    <div class="ia-prop-top"><span class="ia-prop-tipo ${d.tipo}">${icon(d.tipo === 'entrada' ? 'trending' : 'wallet')}${d.tipo === 'entrada' ? 'Entrada' : 'Salida'}</span>
      <b class="num">${money(d.monto)}</b></div>
    <dl><div><dt>Categoría</dt><dd>${esc(cat)}</dd></div><div><dt>Fecha</dt><dd>${esc(fechaCorta(d.fecha))}</dd></div>
      <div><dt>Forma de pago</dt><dd>${esc(FORMAS[d.forma_pago] ?? d.forma_pago ?? '—')}</dd></div>${d.nota ? `<div><dt>Nota</dt><dd>${esc(d.nota)}</dd></div>` : ''}</dl>
    ${ok ? `<p class="ia-prop-est">${icon('check')}Guardado en tus movimientos</p>`
      : fuera ? `<p class="ia-prop-est muted">Descartado</p>`
      : `<div class="row"><button type="button" class="btn sm primary" data-revisar>${icon('edit')}Revisar y guardar</button><button type="button" class="btn sm ghost" data-descartar>Descartar</button></div>`}
  </div>`;
}

function burbujas(vista) {
  let out = '';
  for (let i = 0; i < vista.length; i++) {
    const x = vista[i];
    if (x.rol === 'usuario' && x.foto) out += `<div class="ia-msg yo"><figure class="ia-foto" data-foto="${esc(x.foto)}"><figcaption>${icon('receipt')}Foto de ticket</figcaption></figure></div>`;
    else if (x.rol === 'usuario') out += `<div class="ia-msg yo"><p>${esc(x.texto)}</p></div>`;
    else if (x.rol === 'asistente') out += `<div class="ia-msg ella"><span class="ia-av">${icon('sparkle')}</span><div class="ia-md">${markdown(x.md)}</div></div>`;
    else if (x.rol === 'herramienta') {
      // pasos consecutivos van juntos
      const pasos = [x.nombre];
      while (vista[i + 1]?.rol === 'herramienta') pasos.push(vista[++i].nombre);
      out += `<div class="ia-pasos">${[...new Set(pasos)].map((n) => `<span class="ia-paso">${icon('check')}${esc(ETIQUETAS[n] ?? n)}</span>`).join('')}</div>`;
    } else if (x.rol === 'propuesta') out += tarjetaPropuesta(x, i);
    else if (x.rol === 'recuerdo') out += `<div class="ia-prop ia-rec ${x.estado === 'guardado' ? 'ok' : x.estado === 'descartado' ? 'fuera' : ''}" data-rec="${i}">
      <span class="ia-prop-foto">${icon('book')}Para recordar</span><p>${esc(x.texto)}</p>
      ${x.estado === 'guardado' ? `<p class="ia-prop-est">${icon('check')}Guardado en tu memoria</p>` : x.estado === 'descartado' ? '<p class="ia-prop-est muted">No se guardó</p>'
        : `<div class="row"><button type="button" class="btn sm primary" data-rec-si>${icon('check')}Recordarlo</button><button type="button" class="btn sm ghost" data-rec-no>No, gracias</button></div>`}</div>`;
  }
  return out;
}

function pintarInactivo(main) {
  main.innerHTML = `<section class="view asistente">
    <div class="page-head"><div><h1>Asistente</h1><p class="sub">Pregunta sobre tu dinero y tus impuestos en tus palabras.</p></div></div>
    <div class="card ia-intro">
      <span class="ia-intro-ico">${icon('sparkle')}</span>
      <h2>Activa tu asistente Cuenfis</h2>
      <p>Responde con tus propios datos: cuánto gastaste, cuánto vas a pagar al SAT, qué poner en cada casilla. También registra gastos que le dictes, siempre con tu confirmación.</p>
      ${textoPuntos()}
      <p class="small muted">Usa un servicio de inteligencia artificial (Anthropic) como encargado, solo cuando preguntas. Detalles en el <a href="#/privacidad">aviso de privacidad</a>.</p>
      <button type="button" class="btn primary" id="iaActivar">${icon('sparkle')}Activar asistente</button>
    </div>
  </section>`;
  $('#iaActivar', main).onclick = async () => { await decidir(true); };
}

function pintar(main) {
  const st = conv.estado();
  const vacio = !st.vista.length;
  main.innerHTML = `<section class="view asistente activo">
    <div class="page-head"><div><h1>Asistente</h1><p class="sub">${st.modo === 'declaracion' ? 'Te guía casilla por casilla con tus datos.' : 'Pregunta sobre tu dinero y tus impuestos.'}</p></div>
      <span class="spacer"></span><div class="row"><button type="button" class="btn ghost sm" id="iaPrefs">${icon('settings')}Memoria y estilo</button>${vacio ? '' : `<button type="button" class="btn ghost sm" id="iaBorrar">${icon('trash')}Nueva conversación</button>`}</div></div>
    <div class="seg ia-modo" role="group" aria-label="Modo del asistente">
      <button type="button" data-m="chat" aria-pressed="${st.modo === 'chat'}">${icon('sparkle')}Platicar</button>
      <button type="button" data-m="declaracion" aria-pressed="${st.modo === 'declaracion'}">${icon('file')}Mi declaración</button>
    </div>
    ${barraUso(st.uso)}
    ${st.demo ? `<div class="notice ia-demo">${icon('info')}<span><b>Modo demostración:</b> respuestas simuladas con tus datos para que pruebes cómo funciona. La IA real se activa con tu sesión iniciada cuando el servidor esté listo.</span></div>` : ''}
    <div class="ia-chat" id="iaChat" aria-live="polite">
      ${vacio ? `<div class="ia-vacio"><span class="ia-intro-ico">${icon('sparkle')}</span><p><b>¿En qué te ayudo?</b></p><p class="small muted">Toca una idea o escribe tu pregunta.</p></div>` : burbujas(st.vista)}
      ${st.ocupado ? `<div class="ia-msg ella pensando"><span class="ia-av">${icon('sparkle')}</span><span class="ia-puntos-carga" aria-label="Pensando"><i></i><i></i><i></i></span></div>` : ''}
      ${st.error ? `<div class="notice warn">${icon('alert')}<span>${esc(st.error)}</span></div>` : ''}
    </div>
    <div class="ia-sug">${sugerencias(st.modo).map((s) => `<button type="button" class="chip" data-s="${esc(s)}">${s.startsWith('📷') ? icon('camera') + esc(s.slice(3)) : esc(s)}</button>`).join('')}</div>
    <form class="ia-caja" id="iaForm">
      <label class="sr-only" for="iaTexto">Tu pregunta</label>
      <label class="btn ghost icon ia-cam" aria-label="Foto de ticket o factura" title="Foto de ticket o factura">${icon('camera')}<input type="file" id="iaFoto" accept="image/*" capture="environment" hidden ${st.ocupado ? 'disabled' : ''} /></label>
      <textarea id="iaTexto" rows="1" maxlength="2000" placeholder="Escribe tu pregunta…" ${st.ocupado ? 'disabled' : ''}>${esc(borrador)}</textarea>
      <button type="submit" class="btn primary icon" aria-label="Enviar" ${st.ocupado ? 'disabled' : ''}>${icon('upload')}</button>
    </form>
    <p class="disclaimer">El asistente puede equivocarse. Las cifras fiscales son estimaciones calculadas por Cuenfis; confírmalas con el SAT o con un contador.</p>
  </section>`;

  const chat = $('#iaChat', main);
  // Solo lo nuevo se anima: los mensajes que ya estaban no vuelven a aparecer
  const nuevos = [...chat.querySelectorAll(':scope > .ia-msg, :scope > .ia-pasos, :scope > .ia-prop')].slice(vistos);
  if (pintado) nuevos.forEach((el) => aparecer(el, el.classList.contains('yo') ? 'derecha' : 'abajo'));
  vistos = chat.querySelectorAll(':scope > .ia-msg:not(.pensando), :scope > .ia-pasos, :scope > .ia-prop').length;
  pintado = true;
  chat.scrollTop = chat.scrollHeight;
  // En el celular la página entera es la conversación: baja hasta lo más reciente
  if (!vacio && matchMedia('(max-width: 899px)').matches) window.scrollTo(0, document.documentElement.scrollHeight);
  const f = $('#iaForm', main);
  const ta = f.querySelector('textarea');
  const crecer = () => { ta.style.height = 'auto'; ta.style.height = `${Math.min(140, ta.scrollHeight)}px`; };
  crecer();
  ta.oninput = () => { borrador = ta.value; crecer(); };
  ta.onkeydown = (ev) => { if (ev.key === 'Enter' && !ev.shiftKey) { ev.preventDefault(); f.requestSubmit(); } };
  f.onsubmit = (ev) => { ev.preventDefault(); const t = ta.value; borrador = ''; conv.preguntar(t); };
  if (!st.ocupado && document.activeElement === document.body) ta.focus({ preventScroll: true });

  $('#iaFoto', main).onchange = (ev) => { const file = ev.target.files?.[0]; ev.target.value = ''; if (file) conv.enviarFoto(file); };
  main.querySelectorAll('[data-foto]').forEach(async (fig) => {
    const blob = await leerFoto(fig.dataset.foto);
    if (!blob || !fig.isConnected) { fig.classList.add('sin'); return; }
    const img = new Image();
    img.alt = 'Foto del ticket';
    img.src = URL.createObjectURL(blob);
    img.onload = () => URL.revokeObjectURL(img.src);
    fig.prepend(img);
  });
  main.querySelectorAll('[data-s]').forEach((b) => (b.onclick = () => (b.dataset.s.startsWith('📷') ? $('#iaFoto', main).click() : conv.preguntar(b.dataset.s))));
  main.querySelectorAll('[data-m]').forEach((b) => (b.onclick = () => conv.fijarModo(b.dataset.m)));
  $('#iaBorrar', main)?.addEventListener('click', async () => {
    const ok = await confirmar({ titulo: '¿Empezar una conversación nueva?', texto: 'Se borra esta conversación de tu dispositivo. Tus movimientos no cambian.', accion: 'Borrar conversación' });
    if (ok) conv.borrar();
  });
  $('#iaPrefs', main).onclick = abrirPreferencias;
  main.querySelectorAll('[data-rec]').forEach((el) => {
    const i = +el.dataset.rec;
    el.querySelector('[data-rec-si]')?.addEventListener('click', () => {
      try { mem.recordar(conv.estado().vista[i].texto); conv.marcarPropuesta(i, { estado: 'guardado' }); }
      catch (e) { conv.marcarPropuesta(i, { estado: 'descartado' }); import('../ui/dom.js').then(({ toast }) => toast(e.message, icon('alert'))); }
    });
    el.querySelector('[data-rec-no]')?.addEventListener('click', () => conv.marcarPropuesta(i, { estado: 'descartado' }));
  });
  main.querySelectorAll('.ia-prop:not(.ia-rec)').forEach((el) => {
    const i = +el.dataset.i;
    const x = conv.estado().vista[i];
    el.querySelector('[data-revisar]')?.addEventListener('click', () => {
      const d = x.datos;
      const id = x.id ?? `ia${Date.now().toString(36)}`;
      conv.marcarPropuesta(i, { id });
      abrirFormulario({ tipo: d.tipo, preset: { id, monto: d.monto, fecha: d.fecha, categoria: d.categoria, nota: d.nota ?? '', formaPago: d.forma_pago ?? 'transferencia', ...(d.cfdi ? { cfdi: true, uuid: d.uuid ?? '' } : {}) } });
    });
    el.querySelector('[data-descartar]')?.addEventListener('click', () => { conv.marcarPropuesta(i, { estado: 'descartada' }); conv.limpiarFotos(); });
  });
}

/** Memoria y estilo: lo que el asistente sabe de ti, siempre a la vista y editable. */
function abrirPreferencias() {
  let d = document.getElementById('dlgIaPrefs');
  if (!d) { d = document.createElement('dialog'); d.id = 'dlgIaPrefs'; d.className = 'ia-prefs'; document.body.append(d); }
  const pintarDlg = () => {
    const rs = mem.recuerdos();
    const ts = mem.temas();
    d.innerHTML = `<div class="dlg-head"><h2>Memoria y estilo</h2><button type="button" class="btn ghost icon" data-x aria-label="Cerrar">${icon('x')}</button></div>
      <div class="dlg-body">
        <fieldset class="ia-pf"><legend>¿Cómo quieres que te responda?</legend>
          <div class="seg full" role="group">${Object.entries(mem.ESTILOS).map(([k, t]) => `<button type="button" data-estilo="${k}" aria-pressed="${mem.estilo() === k}">${t}</button>`).join('')}</div></fieldset>
        <fieldset class="ia-pf"><legend>Temas de tus noticias</legend>
          <div class="ia-temas">${Object.entries(mem.TEMAS).map(([k, t]) => `<label class="chip-check"><input type="checkbox" value="${k}" ${ts.includes(k) ? 'checked' : ''} /><span>${t}</span></label>`).join('')}</div></fieldset>
        <fieldset class="ia-pf"><legend>Lo que el asistente recuerda de ti (${rs.length} de ${mem.MAX_RECUERDOS})</legend>
          ${rs.length ? `<ul class="ia-mem">${rs.map((r) => `<li><span>${esc(r.texto)}</span><button type="button" class="btn ghost icon sm" data-olvidar="${r.id}" aria-label="Olvidar: ${esc(r.texto)}">${icon('trash')}</button></li>`).join('')}</ul>`
            : '<p class="small muted">Aún nada. Dile, por ejemplo, «recuerda que estoy ahorrando para un auto».</p>'}
          <form class="ia-mem-add" id="memAdd"><label class="sr-only" for="memTxt">Algo para recordar</label><input id="memTxt" maxlength="${mem.MAX_TEXTO}" placeholder="Agregar algo para recordar" autocomplete="off" /><button class="btn sm">${icon('plus')}Agregar</button></form>
          <p class="small muted">Se guarda con tus datos y viaja solo cuando preguntas. Nunca guardamos RFC, CURP, cuentas, tarjetas ni contraseñas.</p>
        </fieldset>
      </div>
      <div class="dlg-foot">${rs.length ? `<button type="button" class="btn danger" data-olvidar-todo>Olvidar todo</button><span class="spacer"></span>` : ''}<button type="button" class="btn primary" data-x>Listo</button></div>`;
  };
  pintarDlg();
  d.onclick = async (ev) => {
    if (ev.target === d || ev.target.closest('[data-x]')) { d.close(); return; }
    const e = ev.target.closest('[data-estilo]');
    if (e) { mem.fijarEstilo(e.dataset.estilo); pintarDlg(); return; }
    const o = ev.target.closest('[data-olvidar]');
    if (o) { const r = mem.recuerdos().find((x) => x.id === o.dataset.olvidar); if (await confirmar({ titulo: '¿Olvidar este recuerdo?', texto: r?.texto ?? '', accion: 'Olvidar' })) { mem.olvidar(o.dataset.olvidar); pintarDlg(); } return; }
    if (ev.target.closest('[data-olvidar-todo]')) { if (await confirmar({ titulo: '¿Olvidar todo lo que recuerda el asistente?', efectos: [`Se borran ${mem.recuerdos().length} recuerdo(s).`, 'Tus movimientos y tu conversación no cambian.'], accion: 'Olvidar todo' })) { mem.olvidarTodo(); pintarDlg(); } }
  };
  d.onchange = (ev) => { if (ev.target.matches('.ia-temas input')) mem.fijarTemas([...d.querySelectorAll('.ia-temas input:checked')].map((x) => x.value)); };
  d.onsubmit = (ev) => {
    ev.preventDefault();
    try { mem.recordar(d.querySelector('#memTxt').value); pintarDlg(); d.querySelector('#memTxt').focus(); }
    catch (err) { import('../ui/dom.js').then(({ toast }) => toast(err.message, icon('alert'))); }
  };
  if (!d.open) d.showModal();
}

export function render(main) {
  if (mainRef !== main || !main.querySelector('.asistente')) { vistos = 0; pintado = false; }
  mainRef = main;
  quitar?.();
  quitar = null;
  if (!iaActiva()) { pintarInactivo(main); return; }
  // Si se guardó una propuesta, que quede marcada
  conv.estado().vista.forEach((x, i) => { if (x.rol === 'propuesta' && x.id && x.estado === 'pendiente' && guardada(x.id)) conv.marcarPropuesta(i, { estado: 'guardada' }); });
  pintar(main);
  const desuscribir = conv.alCambiar(() => { if (location.hash.startsWith('#/asistente') && mainRef?.isConnected) pintar(mainRef); else desuscribir(); });
  quitar = desuscribir;
}
