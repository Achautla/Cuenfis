// Entrar con huella (solo en la app de Android). Si está activo y hay sesión guardada, la app se abre
// bloqueada y pide la huella (o el PIN del teléfono). La huella nunca sale del teléfono: la revisa Android.
import { nativo } from '../native.js';
import * as nube from '../data/nube.js';
import { icon } from './icons.js';
import { esc } from './dom.js';
import { ojitos } from './contrasena.js';

const PREF = 'cuenfis:huella';
const VOLVER_A_PEDIR = 2 * 60 * 1000; // al volver a la app después de 2 minutos fuera

const leer = () => { try { return localStorage.getItem(PREF) === '1'; } catch { return false; } };
const fijar = (v) => { try { v ? localStorage.setItem(PREF, '1') : localStorage.removeItem(PREF); } catch { /* */ } };
const haySesion = () => { try { return !!localStorage.getItem('cuenfis:auth'); } catch { return false; } };

let plugin = null;
async function bio() {
  if (!nativo) return null;
  plugin ??= import('@capgo/capacitor-native-biometric').then((m) => m.NativeBiometric).catch(() => null);
  return plugin;
}

/** ¿Este teléfono tiene huella (o rostro) configurada? */
export async function disponible() {
  const b = await bio();
  if (!b) return false;
  try { return (await b.isAvailable({ useFallback: true })).isAvailable; } catch { return false; }
}

export const activa = () => nativo && leer();

async function verificar(motivo) {
  const b = await bio();
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
  const email = nube.getUsuario()?.email ?? '';
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
      <label class="field"><span>Correo</span><input name="email" type="email" autocomplete="email" value="${esc(email)}" required /></label>
      <label class="field"><span>Contraseña</span><input name="p" type="password" autocomplete="current-password" required /></label>
      <p class="small neg" id="cdErr" role="alert"></p>
      <button class="btn primary full">${icon('user')}Entrar</button>
    </form>
  </div>`;
  document.body.append(capa);
  document.documentElement.classList.add('con-candado');
  ojitos(capa);
  const abrir = () => { capa.remove(); bloqueada = false; document.documentElement.classList.remove('con-candado'); };
  const pedir = async () => { if (await verificar('Usa tu huella para entrar')) abrir(); };
  capa.querySelector('#cdHuella').onclick = pedir;
  capa.querySelector('#cdPass').onclick = () => { capa.querySelector('#cdForm').hidden = false; capa.querySelector('#cdPass').hidden = true; capa.querySelector('#cdForm input[name="p"]').focus(); };
  capa.querySelector('#cdForm').onsubmit = async (ev) => {
    ev.preventDefault();
    const f = ev.target, err = capa.querySelector('#cdErr');
    err.textContent = '';
    try { await nube.entrar(f.email.value.trim(), f.p.value); abrir(); }
    catch (e) { err.textContent = e.message || 'No pudimos entrar. Revisa tu correo y contraseña.'; }
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
