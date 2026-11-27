// Reglas fiscales publicadas en la nube (tabla pública de solo lectura `reglas_fiscales`).
// Permiten corregir o adelantar las reglas de un año sin publicar una versión nueva de la app.
// Si no hay internet o la tabla no existe, se usan las reglas incluidas en la app.
import { registrarRemotas } from '../core/reglas.js';
import { recalcular } from './store.js';
import * as nube from './nube.js';

const CLAVE = 'cuenfis:reglas';
let ultimo = { aceptadas: [], rechazadas: [], en: null, origen: 'incluidas' };
export const estadoReglas = () => ultimo;

function aplicarFilas(filas, origen, en) {
  const r = registrarRemotas(filas);
  ultimo = { ...r, en, origen: r.aceptadas.length ? origen : 'incluidas' };
  if (r.rechazadas.length) console.warn('Reglas fiscales rechazadas', r.rechazadas);
  return r;
}

/** Usa la última copia guardada en el dispositivo (funciona sin conexión). */
export function cargarCopia() {
  try {
    const c = JSON.parse(localStorage.getItem(CLAVE) ?? 'null');
    if (c?.filas) aplicarFilas(c.filas, 'copia', c.en);
  } catch { /* copia dañada: se ignora */ }
}

/** Pide las reglas a la nube; si cambian, recalcula las pantallas. */
export async function actualizar() {
  if (!nube.disponible || !nube.sb) return ultimo;
  try {
    const { data, error } = await nube.sb.from('reglas_fiscales').select('anio, revision, datos').eq('publicada', true);
    if (error || !Array.isArray(data)) return ultimo;
    const en = new Date().toISOString();
    let antes = null;
    try { antes = JSON.stringify(JSON.parse(localStorage.getItem(CLAVE) ?? 'null')?.filas ?? null); } catch { /* sin copia */ }
    aplicarFilas(data, 'nube', en);
    try { localStorage.setItem(CLAVE, JSON.stringify({ filas: data, en })); } catch { /* sin espacio */ }
    if (JSON.stringify(data) !== antes) recalcular();
  } catch { /* sin conexión */ }
  return ultimo;
}
