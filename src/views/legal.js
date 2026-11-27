import { AVISO_PRIVACIDAD, TERMINOS, VERSION_LEGAL } from '../legal/textos.js';
import { icon } from '../ui/icons.js';
import '../styles/views/legal.css';

const DOCS = {
  privacidad: { t: 'Aviso de privacidad', s: AVISO_PRIVACIDAD },
  terminos: { t: 'Términos y condiciones', s: TERMINOS },
};

export function render(main, cual = 'privacidad') {
  const d = DOCS[cual];
  main.innerHTML = `<section class="view legal">
    <div class="page-head"><div><h1>${d.t}</h1><p class="sub">Versión ${VERSION_LEGAL}</p></div><span class="spacer"></span>
      <a class="btn sm" href="#/${cual === 'privacidad' ? 'terminos' : 'privacidad'}">${icon('file')}${cual === 'privacidad' ? 'Términos y condiciones' : 'Aviso de privacidad'}</a></div>
    <article class="card legal-doc">${d.s.map(([h, html]) => `<h2>${h}</h2>${html}`).join('')}</article>
    <p style="text-align:center"><button class="link-btn" id="volver">Regresar</button></p>
  </section>`;
  main.querySelector('#volver').onclick = () => (history.length > 1 ? history.back() : (location.hash = '#/inicio'));
}
export const privacidad = { render: (m) => render(m, 'privacidad') };
export const terminos = { render: (m) => render(m, 'terminos') };
