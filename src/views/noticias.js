// Tablero de noticias: lo que cambia y te afecta, según tu régimen y los temas que elegiste.
import * as noticias from '../data/noticias.js';
import * as notif from '../ui/notificaciones.js';
import { TEMAS } from '../ia/memoria.js';
import { icon } from '../ui/icons.js';
import { $, esc, fechaLarga, toast } from '../ui/dom.js';
import '../styles/views/noticias.css';

let filtro = 'todas';

export function render(main) {
  const todas = noticias.paraMi();
  const lista = filtro === 'todas' ? todas : todas.filter((n) => n.temas?.includes(filtro));
  const temasPresentes = [...new Set(todas.flatMap((n) => n.temas ?? []))].filter((t) => TEMAS[t]);
  const sop = notif.soportadas(), on = notif.noticiasActivas();

  main.innerHTML = `<section class="view noticias">
    <div class="page-head"><div><h1>Noticias</h1><p class="sub">Lo que cambia y te afecta, según tu régimen y tus temas.</p></div><span class="spacer"></span>
      ${todas.some((n) => !n.leida) ? `<button type="button" class="btn ghost sm" id="notLeidas">${icon('check')}Marcar todo como leído</button>` : ''}</div>
    ${temasPresentes.length > 1 ? `<div class="not-filtros" role="group" aria-label="Filtrar por tema">${[['todas', 'Todas'], ...temasPresentes.map((t) => [t, TEMAS[t]])].map(([k, t]) => `<button type="button" class="chip" data-f="${k}" aria-pressed="${filtro === k}">${esc(t)}</button>`).join('')}</div>` : ''}
    ${lista.length ? `<div class="not-lista">${lista.map((n) => `<article class="card not ${n.leida ? '' : 'nueva'}" data-id="${esc(n.id)}">
        <div class="not-meta">${n.leida ? '' : '<span class="not-punto" aria-label="Nueva"></span>'}<span>${esc(n.fuente ?? 'Cuenfis')}</span><span>·</span><time datetime="${esc(n.fecha)}">${esc(fechaLarga(n.fecha))}</time></div>
        <h2>${esc(n.titulo)}</h2>
        <p>${esc(n.resumen)}</p>
        <div class="row">${(n.temas ?? []).filter((t) => TEMAS[t]).map((t) => `<span class="not-tema">${esc(TEMAS[t])}</span>`).join('')}<span class="spacer"></span>
          ${n.ruta ? `<a class="btn sm" href="#/${esc(n.ruta)}">Ver en Cuenfis</a>` : ''}${n.enlace ? `<a class="btn sm ghost" href="${esc(n.enlace)}" target="_blank" rel="noopener noreferrer">Leer la fuente</a>` : ''}</div>
      </article>`).join('')}</div>`
      : `<div class="card empty">${icon('book')}<p>No hay noticias para ti por ahora. Cuando haya cambios que te afecten, aparecerán aquí.</p><button type="button" class="btn" id="notTemas">Elegir mis temas</button></div>`}
    <div class="card not-push">
      <span class="av-ico">${icon('bell')}</span>
      <span><b>Avisarme de noticias nuevas</b><span class="small muted">${!sop ? 'Este navegador no permite avisos.' : on ? 'Activo: te avisamos en este dispositivo al abrir la app, sin repetir.' : 'Opcional. Solo noticias de tus temas, como máximo dos a la vez.'}</span></span>
      ${sop ? `<button type="button" class="btn sm ${on ? '' : 'primary'}" id="notPush">${on ? 'Desactivar' : 'Activar'}</button>` : ''}
    </div>
    <p class="disclaimer">Resúmenes informativos, no asesoría. Revisa siempre la fuente oficial. Cambia tus temas en Asistente → Memoria y estilo.</p>
  </section>`;

  main.querySelectorAll('[data-f]').forEach((b) => (b.onclick = () => { filtro = b.dataset.f; render(main); }));
  $('#notLeidas', main)?.addEventListener('click', () => { noticias.marcarLeidas(todas.map((n) => n.id)); render(main); window.dispatchEvent(new Event('cuenfis:noticias')); });
  $('#notTemas', main)?.addEventListener('click', () => { location.hash = '#/asistente'; setTimeout(() => document.getElementById('iaPrefs')?.click(), 200); });
  main.querySelectorAll('.not a').forEach((a) => a.addEventListener('click', () => { noticias.marcarLeidas([a.closest('.not').dataset.id]); window.dispatchEvent(new Event('cuenfis:noticias')); }));
  $('#notPush', main)?.addEventListener('click', async () => {
    const r = await notif.activarNoticias(!on);
    toast(r === 'granted' ? 'Te avisaremos de noticias nuevas' : r === 'off' ? 'Avisos de noticias desactivados' : 'No se activaron los avisos. Puedes intentarlo después.', icon('bell'));
    render(main);
  });
  // Lo que ya viste en pantalla cuenta como leído la próxima vez
  setTimeout(() => noticias.marcarLeidas(lista.slice(0, 6).map((n) => n.id)), 4000);
}
