// Simulador: "si cobro X, ¿cuánto me queda?" y comparación de regímenes.
// Todo es estimación mensual; no incluye cuotas del IMSS ni otras contribuciones.
import { params, r2, tasaResicoMensual, isrTarifa, isrRetenidoNomina } from './fiscal.js';
import { factorCobro } from './desglose.js';

/**
 * Desglose de un cobro RESICO antes de hacerlo.
 * @param {object} o { subtotal, pagador: 'pf'|'pm'|'publico', tasaIva, yaCobradoMes, isrRetMes, anio }
 * yaCobradoMes: subtotal de lo cobrado en el mes, porque la tasa se aplica a todo el mes.
 */
export function cobroResico({ subtotal, pagador = 'pf', tasaIva = 0.16, yaCobradoMes = 0, isrRetMes = 0, anio = new Date().getFullYear() }) {
  const p = params(anio);
  const S = Math.max(0, Number(subtotal) || 0);
  const iva = r2(S * tasaIva);
  const isrRet = pagador === 'pm' ? r2(S * p.resico.retencionIsrPM) : 0;
  const ivaRet = pagador === 'pm' ? r2(iva * p.iva.retencionPM) : 0;
  const recibido = r2(S * factorCobro(tasaIva, pagador, p));

  // ISR marginal: cuánto sube el ISR del mes por este cobro (puede cambiar la tasa de todo el mes)
  const isrMes = (tot, ret) => Math.max(r2(tot * tasaResicoMensual(tot, p)), ret);
  const antes = isrMes(yaCobradoMes, isrRetMes);
  const despues = isrMes(yaCobradoMes + S, isrRetMes + isrRet);
  const isrTotal = r2(despues - antes); // incluye lo retenido
  const isrPorPagar = r2(isrTotal - isrRet);
  const ivaPorPagar = r2(iva - ivaRet);
  const tasaNueva = tasaResicoMensual(yaCobradoMes + S, p);
  return {
    subtotal: S, iva, isrRet, ivaRet, recibido,
    isrPorPagar, ivaPorPagar, apartar: r2(isrPorPagar + ivaPorPagar),
    teQueda: r2(S - isrTotal), tasa: tasaNueva,
    cambiaTasa: yaCobradoMes > 0 && tasaNueva !== tasaResicoMensual(yaCobradoMes, p),
  };
}

/**
 * Compara, para un ingreso mensual sin IVA, cuánto te queda en cada régimen.
 * @param {object} o { ingreso, gastos (mensuales deducibles de tu actividad, sin IVA), pagador, anio }
 */
export function compararRegimenes({ ingreso, gastos = 0, pagador = 'pf', anio = new Date().getFullYear() }) {
  const p = params(anio);
  const S = Math.max(0, Number(ingreso) || 0);
  const G = Math.max(0, Math.min(Number(gastos) || 0, S));
  const anual = S * 12;

  // RESICO: tasa fija mensual sobre todo el ingreso; los gastos no se deducen.
  const isrResico = Math.max(r2(S * tasaResicoMensual(S, p)), pagador === 'pm' ? r2(S * p.resico.retencionIsrPM) : 0);
  const resicoDisponible = anual <= p.resico.limiteAnual;

  // Actividad empresarial y profesional: tarifa progresiva sobre la utilidad (ingresos − gastos).
  const isrAct = r2(isrTarifa((S - G) * 12, p.tarifaAnual) / 12);

  // Sueldo: el mismo monto como sueldo bruto mensual, con retención art. 96 y subsidio.
  const isrSueldo = isrRetenidoNomina(S, p);

  const fila = (clave, nombre, isr, gastosPropios, nota, disponible = true) => ({
    clave, nombre, isr, gastos: gastosPropios, teQueda: r2(S - isr - gastosPropios),
    tasaEfectiva: S ? isr / S : 0, nota, disponible,
  });
  const filas = [
    fila('resico', 'RESICO', isrResico, G, resicoDisponible
      ? `Tasa ${(tasaResicoMensual(S, p) * 100).toFixed(1)}% sobre todo lo que cobras. Los gastos no bajan tu ISR, solo tu IVA.`
      : `No disponible: ganarías ${anual.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })} al año y el límite es ${p.resico.limiteAnual.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}.`, resicoDisponible),
    fila('honorarios', 'Actividad empresarial y profesional', isrAct, G, 'Tarifa progresiva sobre tu utilidad: tus gastos con factura sí bajan el ISR.'),
    fila('sueldos', 'Sueldo (mismo monto bruto)', isrSueldo, 0, 'Tu patrón retiene el ISR. No incluye IMSS ni prestaciones.'),
  ];
  const mejor = filas.filter((f) => f.disponible).sort((a, b) => b.teQueda - a.teQueda)[0];
  return { ingreso: S, gastos: G, filas, mejor: mejor?.clave };
}
