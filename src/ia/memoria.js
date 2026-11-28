// Memoria y preferencias del asistente. Viven en tus datos (dispositivo y, con cuenta, tu nube cifrada por usuario).
// El asistente solo propone recordar algo; tú decides si se guarda, y puedes borrarlo cuando quieras.
import { getEstado, aplicar } from '../data/store.js';

export const MAX_RECUERDOS = 12;
export const MAX_TEXTO = 200;
export const ESTILOS = { breve: 'Breve y directo', detallado: 'Con más explicación' };
export const TEMAS = { impuestos: 'Impuestos y SAT', ahorro: 'Ahorro y presupuesto', credito: 'Tarjetas y crédito', inversion: 'Inversión y retiro', economia: 'Economía de México' };

const ia = () => getEstado().preferencias?.ia ?? {};
export const recuerdos = () => ia().memoria ?? [];
export const estilo = () => (ESTILOS[ia().estilo] ? ia().estilo : 'breve');
export const temas = () => (Array.isArray(ia().temas) ? ia().temas.filter((t) => TEMAS[t]) : Object.keys(TEMAS));

const cambiar = (fn) => aplicar((s) => ({ ...s, preferencias: { ...s.preferencias, ia: fn({ ...(s.preferencias?.ia ?? {}) }) } }));

// Nada de datos que identifiquen o den acceso: se rechazan antes de guardar
const SENSIBLE = /\b[A-ZÑ&]{3,4}\d{6}[A-Z\d]{3}\b|\b[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z\d]\d\b|\d{13,19}|contrase(ñ|n)a|password|\bnip\b|\bpin\b|\bcvv\b|clave( del)? sat|\bciec\b|e\.?firma|\bclabe\b/i;
// Las tarjetas y CLABE se escriben con espacios o guiones: se revisan también sin ellos
const compacto = (t) => t.replace(/(?<=\d)[\s-](?=\d)/g, '').replace(/(?<=[A-Z\d])-(?=[A-Z\d])/gi, '');

/** Limpia y valida un recuerdo. Devuelve el texto o lanza un error explicable. */
export function limpiarRecuerdo(texto) {
  const t = String(texto ?? '').replace(/\s+/g, ' ').trim().slice(0, MAX_TEXTO);
  if (t.length < 3) throw new Error('Escribe algo más concreto.');
  if (SENSIBLE.test(t) || SENSIBLE.test(compacto(t))) throw new Error('No guardo RFC, CURP, cuentas, tarjetas ni contraseñas.');
  return t;
}

export function recordar(texto) {
  const t = limpiarRecuerdo(texto);
  if (recuerdos().some((r) => r.texto.toLowerCase() === t.toLowerCase())) return;
  cambiar((x) => ({ ...x, memoria: [...(x.memoria ?? []), { id: `rc${Date.now().toString(36)}`, texto: t, en: new Date().toISOString().slice(0, 10) }].slice(-MAX_RECUERDOS) }));
}
export const olvidar = (id) => cambiar((x) => ({ ...x, memoria: (x.memoria ?? []).filter((r) => r.id !== id) }));
export const olvidarTodo = () => cambiar((x) => ({ ...x, memoria: [] }));
export const fijarEstilo = (e) => cambiar((x) => ({ ...x, estilo: ESTILOS[e] ? e : 'breve' }));
export const fijarTemas = (ts) => cambiar((x) => ({ ...x, temas: ts.filter((t) => TEMAS[t]) }));

/** Lo que viaja con cada pregunta: textos cortos, sin fechas ni ids. */
export const paraContexto = () => ({ memoria: recuerdos().map((r) => r.texto), estilo: estilo() });
