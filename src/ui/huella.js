// Entrar con huella (solo en la app de Android). Si está activo y hay sesión guardada, la app se abre
// bloqueada y pide la huella (o el PIN del teléfono). La huella nunca sale del teléfono: la revisa Android.
import { nativo } from '../native.js';
import * as nube from '../data/nube.js';
import { icon } from './icons.js';
import { esc } from './dom.js';
import { sonar } from './sonidos.js';
import { ojitos } from './contrasena.js';

const PREF = 'cuenfis:huella';
const VOLVER_A_PEDIR = 2 * 60 * 1000; // al volver a la app después de 2 minutos fuera

const leer = () => { try { return localStorage.getItem(PREF) === '1'; } catch { return false; } };
const fijar = (v) => { try { v ? localStorage.setItem(PREF, '1') : localStorage.removeItem(PREF); } catch { /* */ } };
const haySesion = () => { try { return !!localStorage.getItem('cuenfis:auth'); } catch { return false; } };
const sesionGuardada = () => { try { const s = JSON.parse(localStorage.getItem('cuenfis:auth')); return { id: s?.user?.id ?? null, email: s?.user?.email ?? '' }; } catch { return { id: null, email: '' }; } };

// Ojo: el plugin de Capacitor es un Proxy que responde a cualquier método, incluido "then".
// Si una promesa se resuelve con él, JavaScript lo toma por promesa, llama a NativeBiometric.then()
// (que no existe) y la espera nunca termina. Por eso se guarda el módulo y el plugin se toma de ahí.
let modulo = null;
// Ojo también: una función async NO puede devolver el plugin (eso es resolver una promesa con él).
// bio() devuelve el módulo y quien la llama toma .NativeBiometric después del await.
function bio() {
  if (!nativo) return Promise.resolve(null);
  modulo ??= import('@capgo/capacitor-native-biometric').catch(() => null);
  return modulo;
}

/** ¿Este teléfono tiene huella (o rostro) configurada? */
export async function disponible() {
  const b = (await bio())?.NativeBiometric;
  if (!b) return false;
  try { return (await b.isAvailable({ useFallback: true })).isAvailable; } catch { return false; }
}

export const activa = () => nativo && leer();

async function verificar(motivo) {
  const b = (await bio())?.NativeBiometric;
  if (!b) return false;
  try {
    await b.verifyIdentity({ title: 'Entrar a Cuenfis', subtitle: motivo, negativeButtonText: 'Cancelar', useFallback: true, maxAttempts: 5 });
    return true;
  } catch { return false; }
}

/** Activa el inicio con huella después de comprobar que funciona. */
export async function activar() {
  if (!(await disponible())) return 'no_disponible';
  if (!(await verificar('Confirma tu huella para activarla'))) return 'cancelado';
  fijar(true);
  return 'ok';
}
export function desactivar() { fijar(false); }

let fuera = 0;
let bloqueada = false;

/** Muestra el candado si hace falta. */
export function bloquear() {
  if (!activa() || !haySesion() || bloqueada) return;
  bloqueada = true;
  // Lo que estuviera abierto (formularios, diálogos) se cierra: se dibuja encima de todo y dejaría ver los datos
  document.querySelectorAll('dialog[open]').forEach((d) => { try { d.close(); } catch { /* */ } });
  const previo = nube.getUsuario() ? { id: nube.getUsuario().id, email: nube.getUsuario().email ?? '' } : sesionGuardada();
  const email = previo.email;
  const capa = document.createElement('div');
  capa.id = 'candado';
  capa.setAttribute('role', 'dialog');
  capa.setAttribute('aria-modal', 'true');
  capa.setAttribute('aria-label', 'Cuenfis bloqueado');
  capa.innerHTML = `<div class="cd-caja">
    <span class="cd-logo">${icon('lock')}</span>
    <h1>Cuenfis está bloqueado</h1>
    <p>Usa tu huella para entrar.</p>
    <button type="button" class="btn primary cd-huella" id="cdHuella">${icon('fingerprint')}Entrar con huella</button>
    <button type="button" class="link-btn" id="cdPass">Usar mi contraseña</button>
    <form id="cdForm" hidden novalidate>
      <label class="field"><span>Correo</span><input name="email" type="email" autocomplete="email" value="${esc(email)}" readonly required /></label>
      <label class="field"><span>Contraseña</span><input name="p" type="password" autocomplete="current-password" required /></label>
      <p class="small neg" id="cdErr" role="alert"></p>
      <button class="btn primary full">${icon('user')}Entrar</button>
    </form>
  </div>`;
  document.body.append(capa);
  document.documentElement.classList.add('con-candado');
  const resto = [...document.body.children].filter((el) => el !== capa);
  resto.forEach((el) => el.setAttribute('inert', ''));
  ojitos(capa);
  const abrir = () => { capa.remove(); bloqueada = false; document.documentElement.classList.remove('con-candado'); resto.forEach((el) => el.removeAttribute('inert')); };
  const pedir = async () => { if (await verificar('Usa tu huella para entrar')) { abrir(); sonar('sesion'); } };
  capa.querySelector('#cdHuella').onclick = pedir;
  capa.querySelector('#cdPass').onclick = () => { capa.querySelector('#cdForm').hidden = false; capa.querySelector('#cdPass').hidden = true; capa.querySelector('#cdForm input[name="p"]').focus(); };
  capa.querySelector('#cdForm').onsubmit = async (ev) => {
    ev.preventDefault();
    const f = ev.target, err = capa.querySelector('#cdErr');
    err.textContent = '';
    try {
      const u = await nube.entrar(email || f.email.value.trim(), f.p.value);
      // Solo la misma cuenta desbloquea: con otra cuenta se cierra esa sesión y sigue bloqueado
      if (previo.id && u?.id !== previo.id) { await nube.sb?.auth.signOut({ scope: 'local' }).catch(() => {}); err.textContent = 'Esa no es la cuenta de este teléfono.'; return; }
      abrir(); sonar('sesion');
    } catch (e) { err.textContent = e.message || 'No pudimos entrar. Revisa tu contraseña.'; }
  };
  setTimeout(pedir, 300);
}

/** Bloquea al abrir la app y al volver a ella después de un rato. */
export function iniciar() {
  if (!nativo) return;
  bloquear();
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') fuera = Date.now();
    else if (fuera && Date.now() - fuera > VOLVER_A_PEDIR) bloquear();
  });
}
