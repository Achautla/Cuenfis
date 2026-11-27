import { AVISO_PRIVACIDAD, TERMINOS, ELIMINAR_CUENTA, VERSION_LEGAL, RESPONSABLE, DESCARGO, LICENCIAS, faltanDatos } from '../legal/textos.js';
import { version } from '../../package.json';
import { icon } from '../ui/icons.js';
import { esc } from '../ui/dom.js';
import '../styles/views/legal.css';

const DOCS = {
  privacidad: { t: 'Aviso de privacidad', s: AVISO_PRIVACIDAD },
  terminos: { t: 'Términos y condiciones', s: TERMINOS },
  'eliminar-cuenta': { t: 'Eliminar tu cuenta y tus datos', s: ELIMINAR_CUENTA },
};

const volver = '<p style="text-align:center"><button class="link-btn" id="volver">Regresar</button></p>';
const enlazarVolver = (main) => { main.querySelector('#volver').onclick = () => (history.length > 1 ? history.back() : (location.hash = '#/inicio')); };

/** Información legal: todo en un solo lugar (responsable, documentos, descargo, licencias). */
function hub(main) {
  main.innerHTML = `<section class="view legal">
    <div class="page-head"><div><h1>Información legal</h1><p class="sub">Cuenfis ${esc(version)} · documentos versión ${VERSION_LEGAL}</p></div></div>
    ${faltanDatos ? `<div class="notice warn">${icon('alert')}<span><b>Faltan los datos del responsable.</b>Completa nombre, domicilio y correo en <code>src/legal/textos.js</code> antes de publicar en tiendas.</span></div>` : ''}
    <div class="card legal-doc">
      <h2>Responsable</h2>
      <p>${esc(RESPONSABLE.nombre)}<br />${esc(RESPONSABLE.domicilio)}<br />Correo de privacidad y soporte: <b>${esc(RESPONSABLE.correo)}</b></p>
      <h2>Documentos</h2>
      <ul class="legal-links">
        <li><a href="#/privacidad">${icon('lock')}Aviso de privacidad</a></li>
        <li><a href="#/terminos">${icon('file')}Términos y condiciones</a></li>
        <li><a href="#/eliminar-cuenta">${icon('trash')}Cómo eliminar tu cuenta y tus datos</a></li>
      </ul>
      <h2>Estimaciones, no asesoría</h2>
      <p>${esc(DESCARGO)}</p>
      <h2>Software de terceros</h2>
      <ul>${LICENCIAS.map(([n, l, u]) => `<li><b>${esc(n)}</b> · ${esc(l)} · ${esc(u)}</li>`).join('')}</ul>
    </div>
    ${volver}
  </section>`;
  enlazarVolver(main);
}

export function render(main, cual = 'privacidad') {
  if (cual === 'legal') return hub(main);
  const d = DOCS[cual];
  main.innerHTML = `<section class="view legal">
    <div class="page-head"><div><h1>${d.t}</h1><p class="sub">Versión ${VERSION_LEGAL}</p></div><span class="spacer"></span>
      <a class="btn sm" href="#/legal">${icon('book')}Información legal</a></div>
    <article class="card legal-doc">${d.s.map(([h, html]) => `<h2>${h}</h2>${html}`).join('')}</article>
    ${volver}
  </section>`;
  enlazarVolver(main);
}
export const privacidad = { render: (m) => render(m, 'privacidad') };
export const terminos = { render: (m) => render(m, 'terminos') };
export const eliminar = { render: (m) => render(m, 'eliminar-cuenta') };
export const informacion = { render: (m) => render(m, 'legal') };
