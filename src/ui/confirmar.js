// Candado de confirmación: "¿Estás seguro?" antes de acciones que borran, reemplazan o cambian datos importantes.
import { icon } from './icons.js';
import { esc } from './dom.js';

let dlg = null;

/**
 * Pide confirmación. Devuelve una promesa con true (confirmó) o false (canceló o cerró).
 * @param {object} o
 * @param {string} o.titulo      Pregunta corta: "¿Borrar este movimiento?"
 * @param {string} [o.texto]     Qué pasará, en palabras simples
 * @param {string[]} [o.efectos] Lista de consecuencias concretas
 * @param {string} [o.accion]    Texto del botón: "Borrar movimiento" (nunca "Aceptar")
 * @param {boolean} [o.peligro]  Botón rojo para acciones destructivas
 * @param {string} [o.escribir]  Palabra que hay que escribir para habilitar el botón (para lo irreversible)
 * @param {string} [o.alternativa] Segunda opción (resuelve 'alt'); útil para elegir entre dos caminos
 */
export function confirmar({ titulo, texto = '', efectos = [], accion = 'Confirmar', peligro = true, escribir = '', alternativa = '' }) {
  if (!dlg) { dlg = document.createElement('dialog'); dlg.id = 'dlgConf'; dlg.className = 'conf'; document.body.append(dlg); }
  return new Promise((resolve) => {
    dlg.innerHTML = `<form method="dialog">
      <div class="conf-body">
        <span class="conf-ico ${peligro ? 'danger' : ''}">${icon(peligro ? 'alert' : 'info')}</span>
        <h2>${esc(titulo)}</h2>
        ${texto ? `<p>${esc(texto)}</p>` : ''}
        ${efectos.length ? `<ul>${efectos.map((e) => `<li>${esc(e)}</li>`).join('')}</ul>` : ''}
        ${escribir ? `<label class="field"><span>Para confirmar, escribe <b>${esc(escribir)}</b></span><input name="palabra" autocomplete="off" autocapitalize="characters" /></label>` : ''}
      </div>
      <div class="conf-foot">
        <button type="button" class="btn ghost" value="no" data-no>Cancelar</button>
        ${alternativa ? `<button type="button" class="btn" data-alt>${esc(alternativa)}</button>` : ''}
        <button type="submit" class="btn ${peligro ? 'danger-solid' : 'primary'}" value="si" ${escribir ? 'disabled' : ''}>${esc(accion)}</button>
      </div></form>`;
    const f = dlg.querySelector('form');
    const ok = f.querySelector('[value="si"]');
    let respuesta = false;
    if (escribir) f.palabra.addEventListener('input', () => { ok.disabled = f.palabra.value.trim().toUpperCase() !== escribir.toUpperCase(); });
    f.querySelector('[data-no]').onclick = () => dlg.close();
    const alt = f.querySelector('[data-alt]');
    if (alt) alt.onclick = () => { respuesta = 'alt'; dlg.close(); };
    f.onsubmit = (ev) => { ev.preventDefault(); if (ok.disabled) return; respuesta = true; dlg.close(); };
    dlg.addEventListener('close', () => resolve(respuesta), { once: true });
    dlg.showModal();
    // El foco empieza en Cancelar: un Enter accidental no confirma
    (escribir ? f.palabra : f.querySelector('[data-no]')).focus();
  });
}
