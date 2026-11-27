// Tablero de noticias: las que publica Cuenfis (tabla noticias) más avisos que la app genera
// de las reglas fiscales del año. Se filtran por tus regímenes y tus temas; la copia vive en el dispositivo.
import * as nube from './nube.js';
import { getFoto } from './store.js';
import { cambios, reglas } from '../core/reglas.js';
import { FUENTES } from '../core/params/fuentes.js';
import { regimenesEn } from '../core/regimen.js';
import { temas } from '../ia/memoria.js';

const COPIA = 'cuenfis:noticias';
const LEIDAS = 'cuenfis:noticias:leidas';
const OCULTAS = 'cuenfis:noticias:ocultas';
const AUTO = 'cuenfis:noticias:automaticas';
const leer = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const guardar = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* sin espacio */ } };

let remotas = leer(COPIA, { filas: [], en: null }).filas;

/** Trae las noticias publicadas más recientes. Sin conexión se queda con la última copia. */
export async function actualizar() {
  if (!nube.disponible) return false;
  try {
    const { data, error } = await nube.sb.from('noticias').select('id, titulo, resumen, enlace, fuente, temas, regimenes, fecha, automatica, oficial').eq('publicada', true).order('fecha', { ascending: false }).limit(60);
    if (error) return false;
    remotas = (data ?? []).filter((n) => !n.enlace || /^https:\/\//.test(n.enlace));
    guardar(COPIA, { filas: remotas, en: new Date().toISOString() });
    return true;
  } catch { return false; }
}

/** Avisos de la propia app: qué reglas fiscales cambiaron este año y si aún son provisionales. */
function delSistema(hoy) {
  const y = +hoy.slice(0, 4);
  const r = reglas(y);
  const out = [];
  if (r.provisional) out.push({ id: `sis-prov-${y}`, titulo: `Las reglas fiscales de ${y} aún no se publican completas`, resumen: `Mientras tanto, Cuenfis calcula con las de ${r.base}. Te avisaremos cuando se actualicen.`, fuente: 'Cuenfis', temas: ['impuestos'], regimenes: [], fecha: `${y}-01-01`, ruta: 'reglas' });
  const c = cambios(y).filter((k) => FUENTES[k]);
  if (c.length && !r.provisional) out.push({ id: `sis-cambios-${y}`, titulo: `${c.length} dato(s) fiscal(es) cambiaron para ${y}`, resumen: `Entre ellos: ${c.slice(0, 4).map((k) => FUENTES[k].titulo).join(', ')}. Revisa de dónde sale cada uno.`, fuente: 'Cuenfis', temas: ['impuestos'], regimenes: [], fecha: `${y}-01-01`, ruta: 'reglas' });
  return out;
}

/** Noticias para este usuario, de la más reciente a la más antigua. */
export function paraMi() {
  const foto = getFoto();
  const regs = regimenesEn(foto.perfil, foto.hoy);
  const ts = temas();
  const ya = new Set(leer(LEIDAS, []));
  const fuera = new Set(leer(OCULTAS, []));
  const auto = automaticasActivas();
  return [...remotas, ...delSistema(foto.hoy)]
    .filter((n) => !fuera.has(n.id) && (auto || !n.automatica))
    .filter((n) => (!n.regimenes?.length || n.regimenes.some((r) => regs.includes(r))) && (!n.temas?.length || n.temas.some((t) => ts.includes(t))))
    .sort((a, b) => b.fecha.localeCompare(a.fecha))
    .map((n) => ({ ...n, leida: ya.has(n.id) }));
}

export const sinLeer = () => paraMi().filter((n) => !n.leida);
export function marcarLeidas(ids) { guardar(LEIDAS, [...new Set([...leer(LEIDAS, []), ...ids])].slice(-300)); }

/** Ocultar en este dispositivo: una noticia, o todas las de resumen automático. */
export const ocultas = () => leer(OCULTAS, []);
export function ocultar(id) { guardar(OCULTAS, [...new Set([...ocultas(), id])].slice(-300)); }
export function mostrarOcultas() { guardar(OCULTAS, []); }
export const automaticasActivas = () => leer(AUTO, true) !== false;
export function fijarAutomaticas(v) { guardar(AUTO, !!v); }
/** ¿Cuántas ocultas siguen en la lista actual? (para ofrecer "mostrar de nuevo") */
export const cuantasOcultas = () => { const f = new Set(ocultas()); return remotas.filter((n) => f.has(n.id)).length; };
