// Funciones fiscales puras: tarifas, tasas y subsidio. Sin estado ni DOM.
import { reglas } from './reglas.js';

/** Parámetros del año (si aún no hay del año pedido, usa los del último año anterior: ver reglas.js). */
export function params(anio) {
  return reglas(anio).p;
}

export const r2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
export const umaAnual = (p) => p.uma.diaria * 365;

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
