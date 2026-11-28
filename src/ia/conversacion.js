// Conversación con el asistente. La historia se guarda solo en este dispositivo.
// Con sesión y el servidor activo habla con la IA real; si no, usa el modo demostración.
import * as nube from '../data/nube.js';
import { ejecutar, contexto } from './herramientas.js';
import { responderDemo } from './demo.js';
import { sincronizarConsentimiento } from './consentimiento.js';
import { leerQrCfdi, ligaVerificacion } from './cfdi.js';
import { guardarFoto, limpiarHuerfanas } from '../data/fotos.js';
import { getEstado } from '../data/store.js';
import { money } from '../ui/dom.js';

const CLAVE = 'cuenfis:asistente';
const MAX_API = 30; // mensajes que se mandan al servidor (los más recientes)
const MAX_VUELTAS = 6; // herramientas encadenadas por pregunta

let st = cargar();
let fotoPendiente = null; // foto sin QR que espera los datos del usuario
let fotoActual = null; // id de la foto en curso: el movimiento que se guarde llevará ese mismo id
const subs = new Set();
export const alCambiar = (fn) => (subs.add(fn), () => subs.delete(fn));
const avisar = () => { guardar(); subs.forEach((f) => f(st)); };

function cargar() {
  try { const s = JSON.parse(localStorage.getItem(CLAVE)); if (s?.vista) return { ...vacio(), ...s, ocupado: false }; } catch { /* */ }
  return vacio();
}
function vacio() { return { vista: [], api: [], uso: null, modo: 'chat', demo: null, ocupado: false, error: null }; }
function guardar() {
  try { localStorage.setItem(CLAVE, JSON.stringify({ ...st, vista: st.vista.slice(-80), api: recortar(st.api, MAX_API * 2), ocupado: false, error: null })); } catch { /* sin espacio */ }
}

export const estado = () => st;
export function fijarModo(modo) { st = { ...st, modo }; avisar(); }
export function borrar() { st = { ...vacio(), uso: st.uso, modo: st.modo }; avisar(); limpiarFotos(); }

/** Fotos que siguen en uso: las de movimientos guardados y las de propuestas aún pendientes. */
export function limpiarFotos() {
  const pendientes = st.vista.filter((x) => x.foto || (x.rol === 'propuesta' && x.estado === 'pendiente')).map((x) => x.foto ?? x.id).filter(Boolean);
  return limpiarHuerfanas(getEstado().movimientos.map((m) => m.id), pendientes).catch(() => {});
}
export function marcarPropuesta(i, cambios) { st.vista[i] = { ...st.vista[i], ...cambios }; avisar(); }

/** Los últimos mensajes, empezando siempre en una pregunta del usuario (nunca en resultados de herramientas sueltos). */
const esPregunta = (m) => m.role === 'user' && (typeof m.content === 'string' || (Array.isArray(m.content) && m.content.some((b) => b.type === 'text' || b.type === 'image')));
export function recortar(api, max = MAX_API) {
  const out = api.slice(-max);
  while (out.length && !esPregunta(out[0])) out.shift();
  return out.length ? out : api.slice(-1);
}

const agregar = (x) => { st = { ...st, vista: [...st.vista, x] }; avisar(); };

function alEvento(e) {
  if (e.t === 'herramienta') agregar({ rol: 'herramienta', nombre: e.nombre });
  else if (e.t === 'texto' && e.md.trim()) agregar({ rol: 'asistente', md: e.md });
  else if (e.t === 'propuesta') agregar({ rol: 'propuesta', datos: e.datos, estado: 'pendiente', ...(fotoActual || fotoPendiente ? { id: fotoActual || fotoPendiente } : {}) }), (fotoPendiente = null);
  else if (e.t === 'recuerdo') agregar({ rol: 'recuerdo', texto: e.texto, estado: 'pendiente' });
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
async function preguntarReal(texto, contenido = texto) {
  let api = [...st.api, { role: 'user', content: contenido }];
  for (let i = 0; i < MAX_VUELTAS; i++) {
    const enviar = recortar(api);
    const r = await llamar({ modo: st.modo, mensajes: enviar, contexto: contexto() });
    alEvento({ t: 'uso', uso: r.uso });
    api = [...api, { role: 'assistant', content: r.contenido }]; // sin cambios: así lo pide la API
    for (const b of r.contenido) if (b.type === 'text') alEvento({ t: 'texto', md: b.text });
    if (r.parada !== 'tool_use') {
      // Respuesta cortada (por ejemplo, max_tokens) a media llamada de herramienta: no dejar un tool_use sin resultado
      const ult = api.at(-1);
      if (Array.isArray(ult.content) && ult.content.some((b) => b.type === 'tool_use')) {
        const limpio = ult.content.filter((b) => b.type !== 'tool_use');
        api = [...api.slice(0, -1), ...(limpio.length ? [{ ...ult, content: limpio }] : [{ role: 'assistant', content: [{ type: 'text', text: '(respuesta incompleta)' }] }])];
      }
    }
    if (r.parada === 'refusal') { alEvento({ t: 'texto', md: 'No puedo ayudarte con eso. Pregúntame sobre tus finanzas o tus impuestos.' }); break; }
    if (r.parada !== 'tool_use') break;
    const resultados = [];
    for (const b of r.contenido.filter((x) => x.type === 'tool_use')) {
      alEvento({ t: 'herramienta', nombre: b.name });
      const salida = ejecutar(b.name, b.input);
      if (b.name === 'proponer_movimiento' && !salida.error) alEvento({ t: 'propuesta', datos: b.input });
      if (b.name === 'proponer_recuerdo' && !salida.error) alEvento({ t: 'recuerdo', texto: b.input.texto });
      resultados.push({ type: 'tool_result', tool_use_id: b.id, content: JSON.stringify(salida), ...(salida.error ? { is_error: true } : {}) });
    }
    api = [...api, { role: 'user', content: resultados }];
  }
  // La foto solo se manda una vez: en la historia queda una nota para no pagarla en cada pregunta
  st = { ...st, api: api.map((m) => (Array.isArray(m.content) && m.content.some((b) => b.type === 'image')
    ? { ...m, content: m.content.map((b) => (b.type === 'image' ? { type: 'text', text: '[Foto de ticket enviada antes]' } : b)) } : m)) };
}

async function demo(texto) {
  st = { ...st, demo: true };
  await responderDemo(texto, alEvento);
  const u = st.uso?.demo ? st.uso : { mensajes: 0, limite: 300, demo: true };
  alEvento({ t: 'uso', uso: { ...u, mensajes: u.mensajes + 1 } });
}

/** Si el servidor no tiene registrado el consentimiento (por ejemplo, se dio sin sesión), lo sube y reintenta una vez. */
async function conReintento(texto, contenido) {
  try { await preguntarReal(texto, contenido); }
  catch (e) {
    if (e.codigo !== 'sin_consentimiento') throw e;
    await sincronizarConsentimiento();
    await preguntarReal(texto, contenido);
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

/** Propuesta hecha en el dispositivo con el QR de una factura: no usa la IA ni cuenta mensajes. */
function propuestaCfdi(c) {
  const rfc = (getEstado().perfil?.rfc ?? '').toUpperCase();
  const tipo = rfc && c.rfcEmisor === rfc ? 'entrada' : 'salida';
  const cats = ejecutar('listar_categorias', { tipo }).categorias.map((x) => x.id);
  const categoria = tipo === 'entrada' ? (cats.find((x) => x === 'cobro_resico') ?? cats[0]) : (cats.includes('otro_gasto') ? 'otro_gasto' : cats.at(-1));
  return { tipo, monto: c.total, fecha: contexto().hoy, categoria, nota: `Factura de ${tipo === 'entrada' ? c.rfcReceptor || 'cliente' : c.rfcEmisor}`, forma_pago: 'tarjeta', cfdi: true, uuid: c.uuid };
}

/** Recibe la foto de un ticket o factura: la guarda en el dispositivo, lee el QR y, si hace falta, se la pasa a la IA. */
export async function enviarFoto(file) {
  if (st.ocupado || !file) return;
  st = { ...st, ocupado: true, error: null };
  avisar();
  try {
    const { prepararFoto, aBase64 } = await import('./imagen.js'); // el lector de QR se carga solo cuando hace falta
    const f = await prepararFoto(file);
    const id = `ft${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    await guardarFoto(id, f.blob).catch(() => {}); // si el dispositivo no deja guardar, seguimos sin foto
    fotoActual = id;
    agregar({ rol: 'usuario', texto: 'Foto de ticket', foto: id });
    const c = f.qr ? leerQrCfdi(f.qr) : null;
    if (c) {
      alEvento({ t: 'herramienta', nombre: 'leer_qr_cfdi' });
      alEvento({ t: 'texto', md: `Leí el código QR de la factura:\n\n| Dato | Valor |\n| --- | --- |\n| Total | ${money(c.total)} |\n| RFC de quien factura | ${c.rfcEmisor} |\n| Folio fiscal | ${c.uuid.slice(0, 8)}… |\n\nEl QR no trae la fecha ni el concepto: revisa la fecha y la categoría antes de guardar. [Verificar en el SAT](${ligaVerificacion(c)})` });
      alEvento({ t: 'propuesta', datos: propuestaCfdi(c) });
    } else if (puedeReal() && st.demo !== true) {
      const data = await aBase64(f.blob);
      const pedido = 'Lee este ticket y prepara el movimiento con proponer_movimiento. Si no se lee el total o la fecha, dímelo.';
      try {
        await conReintento(pedido, [{ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data } }, { type: 'text', text: pedido }]);
        st = { ...st, demo: false };
      } catch (e) {
        if (e.codigo !== 'no_activo') throw e;
        st = { ...st, demo: true };
        sinIaFoto();
      }
    } else sinIaFoto();
  } catch (e) {
    st = { ...st, error: e.message, ...(e.uso ? { uso: e.uso } : {}) };
  } finally {
    fotoActual = null;
    st = { ...st, ocupado: false };
    avisar();
  }
}

function sinIaFoto() {
  fotoPendiente = fotoActual;
  alEvento({ t: 'texto', md: 'Guardé la foto en tu dispositivo, pero no encontré el código QR de una factura. **En modo demostración no leo tickets sin QR**: con la IA activa leeré el total, la fecha y el comercio y te prepararé el movimiento.\n\nMientras tanto, dime el monto y en qué fue (por ejemplo, "pagué 230 en el súper con tarjeta") y te lo preparo con la foto.' });
}
