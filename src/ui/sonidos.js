// Sonidos de la app: cortos, suaves y generados en el momento (Web Audio), sin archivos ni licencias.
// - Se pueden apagar y cambiar de estilo en Ajustes (preferencia de este dispositivo).
// - En Android respetan el modo silencio, vibración y No molestar del teléfono.
// - Nunca suenan con la app en segundo plano.
import { nativo } from '../native.js';
import { registerPlugin } from '@capacitor/core';

const PREF = 'cuenfis:sonido';
const Sonido = nativo ? registerPlugin('Sonido') : null;

/** Estilos: cada uno define el timbre. Las melodías son las mismas, en notas de una escala pentatónica (siempre suenan bien juntas). */
export const ESTILOS = {
  gota: { nombre: 'Gota', texto: 'Tonos redondos y cortos, como una gota de agua.' },
  cristal: { nombre: 'Cristal', texto: 'Campanita brillante con un eco breve.' },
  madera: { nombre: 'Madera', texto: 'Marimba suave, seca y cálida.' },
};

/** Qué suena y cuándo. Notas en Hz (Do5 = 523.25). t = inicio en segundos. */
const DO4 = 261.63, RE4 = 293.66, SOL4 = 392, LA4 = 440, DO5 = 523.25, RE5 = 587.33, MI5 = 659.25, SOL5 = 783.99, LA5 = 880, DO6 = 1046.5;
export const EVENTOS = {
  sesion: { nombre: 'Iniciar sesión', notas: [[DO5, 0], [MI5, 0.09], [SOL5, 0.18], [DO6, 0.27]] }, // arpegio que sube: "bienvenido"
  entrada: { nombre: 'Registrar una entrada', notas: [[SOL5, 0], [DO6, 0.08]] }, // dos notas que suben
  salida: { nombre: 'Registrar una salida', notas: [[MI5, 0], [DO5, 0.08]] }, // dos notas que bajan, sin alarma
  transferencia: { nombre: 'Registrar una transferencia', notas: [[RE5, 0], [RE5, 0.1]] }, // dos iguales: el dinero solo se movió
  cambio: { nombre: 'Guardar un cambio', notas: [[LA5, 0]] }, // un toque corto
  borrar: { nombre: 'Borrar', notas: [[SOL4, 0], [RE4, 0.1]] }, // baja, grave y suave
  aviso: { nombre: 'Aviso o límite', notas: [[LA4, 0], [LA4, 0.16]] }, // dos toques graves: "atención", nunca estridente
  logro: { nombre: 'Meta cumplida', notas: [[DO5, 0], [MI5, 0.08], [SOL5, 0.16], [DO6, 0.24], [SOL5, 0.36], [DO6, 0.44]] },
};

const DEF = { activo: true, estilo: 'gota', volumen: 0.5 };
export function preferencias() {
  try { const p = JSON.parse(localStorage.getItem(PREF) ?? 'null'); return { ...DEF, ...(p ?? {}), estilo: ESTILOS[p?.estilo] ? p.estilo : DEF.estilo }; } catch { return { ...DEF }; }
}
export function guardar(cambios) {
  const p = { ...preferencias(), ...cambios };
  p.volumen = Math.min(1, Math.max(0, Number(p.volumen) || 0));
  try { localStorage.setItem(PREF, JSON.stringify(p)); } catch { /* sin espacio */ }
  return p;
}

let ctx = null;
const contexto = () => {
  const AC = globalThis.AudioContext ?? globalThis.webkitAudioContext;
  if (!AC) return null;
  ctx ??= new AC();
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
};

// Modo del teléfono (Android): se pregunta como mucho cada 3 segundos
let silencio = { en: 0, valor: false };
async function enSilencio() {
  if (!Sonido) return false;
  if (Date.now() - silencio.en < 3000) return silencio.valor;
  try { const r = await Sonido.estado(); silencio = { en: Date.now(), valor: !!r?.silencio }; }
  catch { silencio = { en: Date.now(), valor: false }; }
  return silencio.valor;
}

/** Una nota con el timbre del estilo. Volumen bajo a propósito: es retroalimentación, no música. */
function nota(ac, destino, f, t0, estilo) {
  const g = ac.createGain();
  g.connect(destino);
  const parciales = estilo === 'cristal' ? [[1, 1], [2.76, 0.25], [5.4, 0.08]] : estilo === 'madera' ? [[1, 1], [4, 0.12]] : [[1, 1], [2, 0.06]];
  const dur = estilo === 'cristal' ? 0.9 : estilo === 'madera' ? 0.28 : 0.42;
  const ataque = estilo === 'madera' ? 0.004 : 0.012;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(1, t0 + ataque);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  for (const [mult, amp] of parciales) {
    const o = ac.createOscillator();
    const a = ac.createGain();
    o.type = estilo === 'madera' && mult === 1 ? 'triangle' : 'sine';
    o.frequency.setValueAtTime(f * mult, t0);
    a.gain.value = amp;
    o.connect(a).connect(g);
    o.start(t0);
    o.stop(t0 + dur + 0.05);
  }
}

/** Toca el sonido de un evento. Nunca lanza errores: si no se puede, no suena. */
export async function sonar(evento, { forzar = false, estilo: est } = {}) {
  try {
    const p = preferencias();
    const ev = EVENTOS[evento];
    if (!ev || (!p.activo && !forzar) || p.volumen <= 0) return false;
    if (typeof document !== 'undefined' && document.hidden) return false;
    if (await enSilencio()) return false;
    const ac = contexto();
    if (!ac) return false;
    const salida = ac.createGain();
    salida.gain.value = 0.18 * p.volumen; // tope bajo: nunca más fuerte que una notificación
    // Un filtro suave quita lo metálico en bocinas de teléfono
    const filtro = ac.createBiquadFilter();
    filtro.type = 'lowpass';
    filtro.frequency.value = 5200;
    salida.connect(filtro).connect(ac.destination);
    const t = ac.currentTime + 0.02;
    for (const [f, dt] of ev.notas) nota(ac, salida, f, t + dt, est ?? p.estilo);
    return true;
  } catch { return false; }
}

/** Sonido según el tipo de movimiento guardado. */
export const sonarMovimiento = (tipo, edicion) => sonar(edicion ? 'cambio' : tipo === 'entrada' ? 'entrada' : tipo === 'salida' ? 'salida' : 'transferencia');
