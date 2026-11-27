// Tarjetas de crédito y préstamos: corte, pago para no generar intereses, pago mínimo e interés estimado.
import { r2 } from './fiscal.js';

const IVA_INTERESES = 0.16;           // los intereses de tarjeta causan IVA
const MINIMO_SALDO = 0.015;           // regla de Banxico: 1.5% del saldo...
const MINIMO_LIMITE = 0.0125;         // ...o 1.25% del límite, lo que sea mayor

const pad = (n) => String(n).padStart(2, '0');
const finDeMes = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate(); // m: 1-12
const fechaDia = (y, m, d) => { while (m < 1) { m += 12; y -= 1; } while (m > 12) { m -= 12; y += 1; } return `${y}-${pad(m)}-${pad(Math.min(d, finDeMes(y, m)))}`; };
const masDias = (iso, n) => new Date(Date.parse(iso + 'T00:00:00Z') + n * 864e5).toISOString().slice(0, 10);

/** Deuda (o saldo) de una cuenta al cierre de `fecha`, con la misma regla de signos del motor. */
export function saldoAl(foto, cuenta, fecha) {
  const k = cuenta.esDeuda ? -1 : 1;
  let s = Number(cuenta.saldoInicial) || 0;
  for (const m of foto.movs) {
    if (m.fecha > fecha) break;
    if (m.cuenta === cuenta.id) s += (m.tipo === 'entrada' ? 1 : -1) * k * m.monto;
    if (m.tipo === 'transferencia' && m.cuentaDestino === cuenta.id) s += k * m.monto;
  }
  return r2(s);
}

/** Estado de una tarjeta de crédito a la fecha `hoy`. */
export function estadoTarjeta(foto, cuenta, hoy = foto.hoy) {
  const limite = Number(cuenta.limite) || 0;
  const tasa = Number(cuenta.tasaAnual) || 0;
  const saldo = cuenta.saldo;
  const base = { saldo, limite, disponible: limite ? r2(limite - saldo) : null, uso: limite ? saldo / limite : null, configurada: false };
  if (!cuenta.diaCorte) return base;

  const [y, m, d] = hoy.split('-').map(Number);
  const corteEsteMes = fechaDia(y, m, cuenta.diaCorte);
  const ultimoCorte = corteEsteMes <= hoy ? corteEsteMes : fechaDia(y, m - 1, cuenta.diaCorte);
  const [cy, cm] = ultimoCorte.split('-').map(Number);
  const proximoCorte = fechaDia(cy, cm + 1, cuenta.diaCorte);
  // Fecha límite de pago: el día de pago siguiente al corte (o 20 días después si no se capturó)
  let limitePago;
  if (cuenta.diaPago) {
    limitePago = fechaDia(cy, cm, cuenta.diaPago);
    if (limitePago <= ultimoCorte) limitePago = fechaDia(cy, cm + 1, cuenta.diaPago);
  } else limitePago = masDias(ultimoCorte, 20);

  const saldoCorte = Math.max(0, saldoAl(foto, cuenta, ultimoCorte));
  const pagosDespues = r2(foto.movs.filter((x) => x.fecha > ultimoCorte && x.fecha <= hoy &&
    ((x.tipo === 'transferencia' && x.cuentaDestino === cuenta.id) || (x.tipo === 'entrada' && x.cuenta === cuenta.id)))
    .reduce((s, x) => s + x.monto, 0));
  const minimoTeorico = Math.min(saldoCorte, Math.max(saldoCorte * MINIMO_SALDO, limite * MINIMO_LIMITE));
  const pagoSinIntereses = r2(Math.max(0, saldoCorte - pagosDespues));
  const pagoMinimo = r2(Math.max(0, minimoTeorico - pagosDespues));
  // Si solo pagas el mínimo, el resto genera intereses (más IVA) en el siguiente periodo
  const interesSiMinimo = r2(Math.max(0, saldoCorte - Math.max(minimoTeorico, pagosDespues)) * tasa / 12 * (1 + IVA_INTERESES));
  const diasParaPagar = Math.round((Date.parse(limitePago) - Date.parse(hoy)) / 864e5);
  return { ...base, configurada: true, ultimoCorte, proximoCorte, limitePago, diasParaPagar, saldoCorte, pagosDespues,
    pagoSinIntereses, pagoMinimo, interesSiMinimo, tasa, cubierto: pagoSinIntereses === 0 };
}

/** Préstamo con pagos fijos: meses para liquidar e intereses totales. */
export function estadoPrestamo(cuenta) {
  const P = cuenta.saldo, A = Number(cuenta.pagoMensual) || 0, i = (Number(cuenta.tasaAnual) || 0) / 12;
  if (!(P > 0) || !(A > 0)) return { saldo: P, configurado: false };
  if (i === 0) { const n = Math.ceil(P / A); return { saldo: P, configurado: true, meses: n, interesesTotales: 0, pagoMensual: A }; }
  if (A <= P * i) return { saldo: P, configurado: true, nuncaSeLiquida: true, interesMensual: r2(P * i), pagoMensual: A };
  const n = Math.ceil(-Math.log(1 - (i * P) / A) / Math.log(1 + i));
  // Intereses reales simulando mes a mes (el último pago es menor)
  let s = P, intereses = 0;
  for (let k = 0; k < n && s > 0; k++) { const int = s * i; intereses += int; s = s + int - A; }
  return { saldo: P, configurado: true, meses: n, interesesTotales: r2(intereses), pagoMensual: A };
}

export { fechaDia, masDias };
