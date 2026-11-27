// Conversación con el asistente. La historia se guarda solo en este dispositivo.
// Con sesión y el servidor activo habla con la IA real; si no, usa el modo demostración.
import * as nube from '../data/nube.js';
import { ejecutar, contexto } from './herramientas.js';
import { responderDemo } from './demo.js';
import { sincronizarConsentimiento } from './consentimiento.js';

const CLAVE = 'cuenfis:asistente';
const MAX_API = 30; // mensajes que se mandan al servidor (los más recientes)
const MAX_VUELTAS = 6; // herramientas encadenadas por pregunta

let st = cargar();
const subs = new Set();
export const alCambiar = (fn) => (subs.add(fn), () => subs.delete(fn));
const avisar = () => { guardar(); subs.forEach((f) => f(st)); };

function cargar() {
  try { const s = JSON.parse(localStorage.getItem(CLAVE)); if (s?.vista) return { ...vacio(), ...s, ocupado: false }; } catch { /* */ }
  return vacio();
}
function vacio() { return { vista: [], api: [], uso: null, modo: 'chat', demo: null, ocupado: false, error: null }; }
function guardar() {
  try { localStorage.setItem(CLAVE, JSON.stringify({ ...st, vista: st.vista.slice(-80), api: st.api.slice(-MAX_API * 2), ocupado: false, error: null })); } catch { /* sin espacio */ }
}

export const estado = () => st;
export function fijarModo(modo) { st = { ...st, modo }; avisar(); }
export function borrar() { st = { ...vacio(), uso: st.uso, modo: st.modo }; avisar(); }
export function marcarPropuesta(i, cambios) { st.vista[i] = { ...st.vista[i], ...cambios }; avisar(); }

const agregar = (x) => { st = { ...st, vista: [...st.vista, x] }; avisar(); };

function alEvento(e) {
  if (e.t === 'herramienta') agregar({ rol: 'herramienta', nombre: e.nombre });
  else if (e.t === 'texto' && e.md.trim()) agregar({ rol: 'asistente', md: e.md });
  else if (e.t === 'propuesta') agregar({ rol: 'propuesta', datos: e.datos, estado: 'pendiente' });
  else if (e.t === 'uso') st = { ...st, uso: e.uso };
}

/** ¿Hay servidor y sesión para la IA real? */
export const puedeReal = () => !!(nube.disponible && nube.getUsuario());

class ErrorServidor extends Error { constructor(codigo, mensaje, extra) { super(mensaje); this.codigo = codigo; Object.assign(this, extra); } }

async function llamar(cuerpo) {
  const { data } = await nube.sb.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new ErrorServidor('sin_sesion', 'Inicia sesión para usar el asistente.');
  let r;
  try {
    r = await fetch(`${nube.URL_SB}/functions/v1/asistente`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, apikey: nube.KEY_SB, 'Content-Type': 'application/json' },
      body: JSON.stringify(cuerpo),
    });
  } catch { throw new ErrorServidor('red', 'Sin conexión con el asistente.'); }
  const j = await r.json().catch(() => ({}));
  if (r.status === 404) throw new ErrorServidor('no_activo', 'El asistente aún no está activado en el servidor.');
  if (!r.ok) throw new ErrorServidor(j.error ?? 'error', j.mensaje ?? 'El asistente no está disponible por ahora.', { uso: j.uso });
  return j;
}

/** Pregunta real: manda la conversación, ejecuta aquí las herramientas que pida y repite hasta terminar. */
async function preguntarReal(texto) {
  let api = [...st.api, { role: 'user', content: texto }];
  for (let i = 0; i < MAX_VUELTAS; i++) {
    const enviar = api.slice(-MAX_API);
    while (enviar.length && enviar[0].role !== 'user') enviar.shift(); // debe empezar con el usuario
    const r = await llamar({ modo: st.modo, mensajes: enviar, contexto: contexto() });
    alEvento({ t: 'uso', uso: r.uso });
    api = [...api, { role: 'assistant', content: r.contenido }]; // sin cambios: así lo pide la API
    for (const b of r.contenido) if (b.type === 'text') alEvento({ t: 'texto', md: b.text });
    if (r.parada === 'refusal') { alEvento({ t: 'texto', md: 'No puedo ayudarte con eso. Pregúntame sobre tus finanzas o tus impuestos.' }); break; }
    if (r.parada !== 'tool_use') break;
    const resultados = [];
    for (const b of r.contenido.filter((x) => x.type === 'tool_use')) {
      alEvento({ t: 'herramienta', nombre: b.name });
      const salida = ejecutar(b.name, b.input);
      if (b.name === 'proponer_movimiento' && !salida.error) alEvento({ t: 'propuesta', datos: b.input });
      resultados.push({ type: 'tool_result', tool_use_id: b.id, content: JSON.stringify(salida), ...(salida.error ? { is_error: true } : {}) });
    }
    api = [...api, { role: 'user', content: resultados }];
  }
  st = { ...st, api };
}

async function demo(texto) {
  st = { ...st, demo: true };
  await responderDemo(texto, alEvento);
  const u = st.uso?.demo ? st.uso : { mensajes: 0, limite: 300, demo: true };
  alEvento({ t: 'uso', uso: { ...u, mensajes: u.mensajes + 1 } });
}

/** Si el servidor no tiene registrado el consentimiento (por ejemplo, se dio sin sesión), lo sube y reintenta una vez. */
async function conReintento(texto) {
  try { await preguntarReal(texto); }
  catch (e) {
    if (e.codigo !== 'sin_consentimiento') throw e;
    await sincronizarConsentimiento();
    await preguntarReal(texto);
  }
}

/** Envía una pregunta del usuario. */
export async function preguntar(texto) {
  const limpio = String(texto ?? '').trim().slice(0, 2000);
  if (!limpio || st.ocupado) return;
  st = { ...st, ocupado: true, error: null };
  agregar({ rol: 'usuario', texto: limpio });
  try {
    if (puedeReal() && st.demo !== true) {
      try { await conReintento(limpio); st = { ...st, demo: false }; }
      catch (e) {
        if (e.codigo !== 'no_activo') throw e;
        await demo(limpio); // el servidor aún no está activado: seguimos en demostración
      }
    } else await demo(limpio);
  } catch (e) {
    st = { ...st, error: e.message, ...(e.uso ? { uso: e.uso } : {}) };
  } finally {
    st = { ...st, ocupado: false };
    avisar();
  }
}

/** Al iniciar sesión o activar el servidor, vuelve a intentar con la IA real. */
export function reintentarReal() { st = { ...st, demo: null }; avisar(); }
