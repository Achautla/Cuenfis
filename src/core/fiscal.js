// Funciones fiscales puras: tarifas, tasas y subsidio. Sin estado ni DOM.
import { reglas } from './reglas.js';

/** Parámetros del año (si aún no hay del año pedido, usa los del último año anterior: ver reglas.js). */
export function params(anio) {
  return reglas(anio).p;
}

export const r2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
export const umaAnual = (p) => p.uma.diaria * 365;

/** Redondeo del art. 20 CFF: de 1 a 50 centavos baja al peso; de 51 a 99 sube. */
export function redondeoSat(x) {
  const n = r2(Number(x) || 0);
  const ent = Math.floor(n);
  return r2(n - ent) <= 0.5 ? ent : ent + 1;
}

/** Domingo de Pascua (algoritmo gregoriano anónimo). */
function pascua(y) {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31), dia = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(y, mes - 1, dia));
}
const iso = (d) => d.toISOString().slice(0, 10);
/** n-ésimo lunes de un mes (1 = primero). */
const lunes = (y, mes, n) => { const d = new Date(Date.UTC(y, mes - 1, 1)); d.setUTCDate(1 + ((8 - d.getUTCDay()) % 7) + (n - 1) * 7); return iso(d); };

/**
 * Días inhábiles para el SAT en un año (art. 12 CFF y art. 74 LFT), más el jueves y viernes santos,
 * que el SAT suele declarar como periodo vacacional (regla 2.1.6 de la RMF). Estimado: la RMF de cada año puede cambiarlos.
 */
export function diasInhabiles(y) {
  const p = pascua(y);
  const santo = (n) => iso(new Date(p.getTime() - n * 864e5));
  return new Set([`${y}-01-01`, lunes(y, 2, 1), lunes(y, 3, 3), santo(3), santo(2), `${y}-05-01`, `${y}-09-16`, lunes(y, 11, 3), `${y}-12-25`,
    ...((y - 2024) % 6 === 0 ? [`${y}-10-01`] : [])]);
}

/**
 * Fecha límite de la declaración mensual de `clave` (AAAA-MM): el día que marca la ley del mes siguiente.
 * Si cae en sábado, domingo o día inhábil se recorre al siguiente día hábil (art. 12 CFF).
 */
export function fechaLimiteMensual(clave) {
  const [y, m] = clave.split('-').map(Number);
  const d = new Date(Date.UTC(y, m, params(y + (m === 12 ? 1 : 0)).diaLimiteMensual ?? 17));
  while (d.getUTCDay() === 0 || d.getUTCDay() === 6 || diasInhabiles(d.getUTCFullYear()).has(iso(d))) d.setUTCDate(d.getUTCDate() + 1);
  return iso(d);
}

/** Tasa RESICO mensual según el total del mes (se aplica a todo el ingreso). */
export function tasaResicoMensual(total, p) {
  if (total <= 0) return 0;
  const fila = p.resico.mensual.find((f) => total <= f.hasta);
  return (fila ?? p.resico.mensual.at(-1)).tasa;
}

/** ISR con tarifa progresiva [limInf, limSup, cuota, %]. */
export function isrTarifa(base, tarifa) {
  if (base <= 0) return 0;
  // El tramo es el último cuyo límite inferior no pasa la base (evita huecos entre centavos, p. ej. 844.595)
  const fila = tarifa.findLast(([inf]) => base >= inf) ?? tarifa[0];
  const [inf, , cuota, pct] = fila;
  return r2(cuota + (base - inf) * pct);
}

/** Subsidio para el empleo mensual (decreto del año): monto fijo si el ingreso no pasa el límite. */
export function subsidioEmpleoMensual(ingresoMensual, p) {
  const s = p.subsidioEmpleo;
  if (!s || ingresoMensual > s.limiteIngresoMensual) return 0;
  return r2(p.uma.diaria * s.diasMes * s.porcentajeUmaMensual);
}

/** ISR que el patrón retiene en un mes de nómina (art. 96 menos subsidio, mínimo 0). */
export function isrRetenidoNomina(brutoMensual, p) {
  const isr = isrTarifa(brutoMensual, p.tarifaMensual);
  return r2(Math.max(0, isr - subsidioEmpleoMensual(brutoMensual, p)));
}

/**
 * Estima el sueldo bruto a partir del neto depositado, invirtiendo la retención de ISR.
 * No considera IMSS ni otras deducciones de nómina: por eso es una estimación.
 */
export function estimarBrutoDesdeNeto(neto, p) {
  if (neto <= 0) return 0;
  let lo = neto, hi = neto * 2 + 1000;
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    if (mid - isrRetenidoNomina(mid, p) < neto) lo = mid; else hi = mid;
  }
  return r2((lo + hi) / 2);
}

/** Límite general de deducciones personales: el menor entre 5 UMA anuales y 15% de ingresos. */
export function limiteDeducciones(ingresos, p) {
  return r2(Math.min(umaAnual(p) * p.deducciones.umasAnuales, ingresos * p.deducciones.porcentajeIngresos));
}
