// "¿De dónde sale?": muestra el documento y el artículo de donde sale un dato fiscal.
import { fuente, leyendaReglas, reglas } from '../core/reglas.js';
import { icon } from './icons.js';
import { esc } from './dom.js';

/** Botón pequeño junto a una cifra. `clave` es la ruta del dato (ver src/core/params/fuentes.js). */
export function chipFuente(clave, anio) {
  if (!fuente(clave, anio)) return '';
  return `<button type="button" class="fuente-chip" data-fuente="${esc(clave)}" data-anio="${esc(String(anio))}" aria-haspopup="dialog">${icon('book')}<span>¿De dónde sale?</span></button>`;
}

/** Aviso de reglas provisionales para un año que aún no tiene reglas publicadas. */
export function avisoProvisional(anio, enlace = true) {
  const r = reglas(anio);
  if (!r.provisional) return '';
  return `<div class="notice warn">${icon('alert')}<span><b>Las reglas fiscales de ${r.anio} aún no se publican.</b>Usamos las de ${r.base} de forma provisional, así que estas cifras pueden cambiar.${enlace ? ' <a href="#/reglas">Ver reglas fiscales</a>' : ''}</span></div>`;
}

/** Leyenda para los avisos de estimación al pie de cada pantalla. */
export const leyenda = (anio) => leyendaReglas(anio);

let dlg = null;

function abrir(clave, anio) {
  const f = fuente(clave, anio);
  if (!f) return;
  if (!dlg) { dlg = document.createElement('dialog'); dlg.className = 'conf fuente-dlg'; dlg.id = 'dlgFuente'; document.body.append(dlg); }
  if (dlg.open) dlg.close();
  dlg.innerHTML = `<div class="conf-body">
      <span class="conf-ico">${icon('book')}</span>
      <h2>${esc(f.titulo)}</h2>
      <dl class="fuente-dl">
        <dt>Documento</dt><dd>${esc(f.documento)}</dd>
        <dt>Artículo</dt><dd>${esc(f.articulo)}</dd>
        ${f.publicacion ? `<dt>Valores del año</dt><dd>${esc(f.publicacion)}</dd>` : ''}
        ${f.rmf ? `<dt>Reglas de aplicación</dt><dd>${esc(f.rmf)}</dd>` : ''}
      </dl>
      ${f.nota ? `<p>${esc(f.nota)}</p>` : ''}
      ${f.provisional ? `<p class="fuente-prov">${icon('alert')}Las reglas de ${f.anio} aún no se publican: se usan las de ${f.base} de forma provisional.</p>` : ''}
      <p class="small muted">Es una estimación y no sustituye la asesoría de un contador. Revisa siempre la versión vigente del documento.</p>
    </div>
    <div class="conf-foot">
      <a class="btn ghost" href="#/reglas" data-cerrar>Todas las reglas</a>
      <a class="btn" href="${esc(f.url)}" target="_blank" rel="noopener noreferrer">Ver documento oficial</a>
      <button type="button" class="btn primary" data-cerrar>Listo</button>
    </div>`;
  dlg.onclick = (ev) => { if (ev.target === dlg || ev.target.closest('[data-cerrar]')) dlg.close(); };
  dlg.showModal();
}

/** Se llama una vez: escucha los botones "¿De dónde sale?" de cualquier pantalla. */
export function activarFuentes() {
  document.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-fuente]');
    if (!b) return;
    ev.preventDefault();
    abrir(b.dataset.fuente, Number(b.dataset.anio));
  });
}
