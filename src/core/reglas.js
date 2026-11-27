// Reglas fiscales por año. El motor pide las reglas del año del periodo que calcula, no las de hoy.
// Si un año aún no tiene reglas publicadas, se usan las del último año anterior y se marcan provisionales.
// Las reglas pueden llegar actualizadas desde la nube (tabla reglas_fiscales) sin publicar una app nueva.
import P2025 from './params/2025.js';
import P2026 from './params/2026.js';
import { FUENTES, fuenteDe } from './params/fuentes.js';

const INCLUIDAS = { 2025: P2025, 2026: P2026 };
let remotas = {};

const anios = () => [...new Set([...Object.keys(INCLUIDAS), ...Object.keys(remotas)])].map(Number).sort((a, b) => a - b);

function delAnio(anio) {
  const inc = INCLUIDAS[anio], rem = remotas[anio];
  if (inc && rem) return (rem.revision ?? 0) > (inc.revision ?? 0) ? rem : inc;
  return rem ?? inc;
}

/** Reglas del año: { anio pedido, base (año de donde salen), provisional, p (parámetros) }. */
export function reglas(anio) {
  const y = Number(anio);
  const exacto = delAnio(y);
  if (exacto) return { anio: y, base: y, provisional: false, p: exacto };
  const lista = anios();
  const base = lista.filter((a) => a <= y).pop() ?? lista[0];
  return { anio: y, base, provisional: true, p: delAnio(base) };
}

export const aniosConReglas = () => anios();

/** Texto corto para los avisos de estimación: "reglas fiscales 2026" o "reglas 2026 (provisionales para 2027)". */
export function leyendaReglas(anio) {
  const r = reglas(anio);
  return r.provisional ? `reglas fiscales ${r.base} (provisionales para ${r.anio}, aún no se publican las de ${r.anio})` : `reglas fiscales ${r.base}`;
}

/** Valor de una ruta "a.b.c" dentro de los parámetros. */
export function valor(p, clave) {
  return clave.split('.').reduce((o, k) => (o == null ? undefined : o[k]), p);
}

/** Fuente de un dato en el año pedido (incluye si es provisional). */
export function fuente(clave, anio) {
  const r = reglas(anio);
  const f = fuenteDe(clave, r.p);
  return f && { ...f, anio: r.anio, base: r.base, provisional: r.provisional };
}

/** Datos que aplican a los regímenes dados (todos si `regs` es null), en el orden del catálogo. */
export function datosPara(regs) {
  return Object.entries(FUENTES).filter(([, f]) => !regs || f.regs.some((r) => regs.includes(r))).map(([k]) => k);
}

/** ¿Qué datos cambiaron respecto al año anterior con reglas? */
export function cambios(anio) {
  const r = reglas(anio);
  const previo = anios().filter((a) => a < r.base).pop();
  if (!previo) return [];
  const p0 = delAnio(previo);
  return Object.keys(FUENTES).filter((k) => JSON.stringify(valor(r.p, k)) !== JSON.stringify(valor(p0, k)));
}

// ---------- Validación de reglas que llegan de la nube ----------

const num = (x) => typeof x === 'number' && Number.isFinite(x);
const tasa = (x) => num(x) && x >= 0 && x < 1;

function tarifaValida(t) {
  if (!Array.isArray(t) || t.length < 5) return false;
  return t.every((f, i) => Array.isArray(f) && f.length === 4 && num(f[0]) && (num(f[1]) || f[1] === null || f[1] === Infinity) && num(f[2]) && tasa(f[3])
    && (i === 0 || (f[0] > t[i - 1][0] && f[2] >= t[i - 1][2] && f[3] >= t[i - 1][3])));
}

/** Revisa que unas reglas tengan la forma y valores razonables. Devuelve la lista de problemas (vacía si están bien). */
export function validar(p) {
  const e = [];
  if (!p || typeof p !== 'object') return ['No es un objeto'];
  if (!Number.isInteger(p.anio) || p.anio < 2020 || p.anio > 2100) e.push('anio');
  if (!(num(p.uma?.diaria) && p.uma.diaria > 50 && p.uma.diaria < 1000)) e.push('uma.diaria');
  const m = p.resico?.mensual;
  if (!(Array.isArray(m) && m.length >= 3 && m.every((f, i) => num(f.hasta) && tasa(f.tasa) && (i === 0 || f.hasta > m[i - 1].hasta)))) e.push('resico.mensual');
  if (!num(p.resico?.limiteAnual) || !tasa(p.resico?.retencionIsrPM)) e.push('resico');
  if (!tasa(p.iva?.general) || !tasa(p.iva?.frontera) || !tasa(p.iva?.retencionPM)) e.push('iva');
  if (!num(p.topeEfectivo) || !num(p.obligacionAnualSueldos) || !Number.isInteger(p.diaLimiteMensual)) e.push('topes');
  const d = p.deducciones;
  if (!(num(d?.umasAnuales) && tasa(d?.porcentajeIngresos) && tasa(d?.afore?.porcentajeIngresos) && num(d?.afore?.umasAnuales)
    && tasa(d?.donativos?.porcentajeIngresos) && num(d?.colegiaturas?.bachillerato))) e.push('deducciones');
  const s = p.subsidioEmpleo;
  if (s && !(tasa(s.porcentajeUmaMensual) && num(s.limiteIngresoMensual) && num(s.diasMes))) e.push('subsidioEmpleo');
  if (!tarifaValida(p.tarifaMensual)) e.push('tarifaMensual');
  if (!tarifaValida(p.tarifaAnual)) e.push('tarifaAnual');
  return e;
}

/** JSON no admite Infinity: el último tramo llega con límite null. */
function normalizar(p) {
  const fix = (t) => t.map((f) => [f[0], f[1] == null ? Infinity : f[1], f[2], f[3]]);
  return { ...p, tarifaMensual: fix(p.tarifaMensual ?? []), tarifaAnual: fix(p.tarifaAnual ?? []) };
}

/**
 * Registra reglas recibidas de la nube. Solo acepta las que pasan la validación.
 * @param {Array<{anio:number, revision:number, datos:object}>} filas
 * @returns {{aceptadas:number[], rechazadas:{anio:number, problemas:string[]}[]}}
 */
export function registrarRemotas(filas) {
  const aceptadas = [], rechazadas = [];
  const nuevas = {};
  for (const f of filas ?? []) {
    const p = f?.datos && normalizar({ ...f.datos, anio: Number(f.anio), revision: Number(f.revision) || 0 });
    const problemas = p ? validar(p) : ['sin datos'];
    if (problemas.length) rechazadas.push({ anio: Number(f?.anio), problemas });
    else { nuevas[p.anio] = p; aceptadas.push(p.anio); }
  }
  remotas = nuevas;
  return { aceptadas, rechazadas };
}
