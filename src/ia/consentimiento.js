// Consentimiento para el asistente con IA: se pregunta una sola vez al entrar, y se puede cambiar en Ajustes.
import { getEstado, aplicar } from '../data/store.js';
import * as nube from '../data/nube.js';
import { VERSION_LEGAL } from '../legal/textos.js';
import { icon } from '../ui/icons.js';

export const iaPrefs = () => getEstado().preferencias?.ia ?? null;
export const iaActiva = () => !!iaPrefs()?.consentido;

/** Guarda la decisión en el dispositivo y, con sesión, en la nube (registro con fecha y versión). */
export async function decidir(consentido) {
  aplicar((s) => ({ ...s, preferencias: { ...s.preferencias, ia: { consentido, preguntado: true, en: new Date().toISOString(), version: VERSION_LEGAL } } }));
  await sincronizarConsentimiento();
}

/** Lleva la decisión local a la nube. Si falla, se reintenta en la siguiente pregunta. */
export async function sincronizarConsentimiento() {
  if (!nube.disponible || !nube.getUsuario()) return;
  const p = iaPrefs();
  if (!p?.preguntado) return;
  try { if (p.consentido) await nube.consentirAsistente(p.version ?? VERSION_LEGAL); else await nube.retirarAsistente(); } catch { /* reintento después */ }
}

export const PUNTOS = [
  ['lock', 'Tus movimientos se quedan en tu dispositivo. Al asistente solo le llegan los números que necesita para responder cada pregunta.'],
  ['shield', 'No guardamos tus conversaciones en el servidor; solo contamos cuántos mensajes usas al mes.'],
  ['file', 'Las cifras fiscales las calcula Cuenfis con las reglas oficiales; el asistente las explica y cita la fuente. Siguen siendo estimaciones.'],
  ['check', 'Nunca guarda nada por ti: si te propone un movimiento, tú lo revisas y decides.'],
];

const lista = () => `<ul class="ia-puntos">${PUNTOS.map(([i, t]) => `<li>${icon(i)}<span>${t}</span></li>`).join('')}</ul>`;
export const textoPuntos = lista;

/** Pregunta una vez, al abrir la app, si quiere activar el asistente. */
export function preguntarSiHaceFalta() {
  const e = getEstado();
  if (!e.perfil || iaPrefs()?.preguntado || document.getElementById('dlgIa')) return;
  const d = document.createElement('dialog');
  d.id = 'dlgIa';
  d.className = 'conf ia-dlg';
  d.innerHTML = `<form method="dialog"><div class="conf-body">
      <span class="conf-ico ia">${icon('sparkle')}</span>
      <h2>Nuevo: tu asistente Cuenfis</h2>
      <p>Pregúntale en tus palabras cuánto gastaste, cuánto vas a pagar al SAT o pídele que registre un gasto. Responde con tus propios datos.</p>
      ${lista()}
      <p class="small muted">Usa un servicio de inteligencia artificial (Anthropic) como encargado, solo cuando tú preguntas. Puedes desactivarlo en <i>Ajustes</i> cuando quieras. Más detalles en el <a href="#/privacidad">aviso de privacidad</a>.</p>
    </div>
    <div class="conf-foot">
      <button type="button" class="btn ghost" data-no>Ahora no</button>
      <button type="button" class="btn primary" data-si>${icon('sparkle')}Activar asistente</button>
    </div></form>`;
  document.body.append(d);
  const cerrar = async (si) => { d.close(); d.remove(); await decidir(si); if (si) location.hash = '#/asistente'; };
  d.querySelector('[data-si]').onclick = () => cerrar(true);
  d.querySelector('[data-no]').onclick = () => cerrar(false);
  d.querySelector('a').onclick = () => { d.close(); d.remove(); }; // vuelve a preguntar después de leer el aviso
  d.addEventListener('cancel', (ev) => ev.preventDefault()); // que elija una opción
  d.showModal();
}
