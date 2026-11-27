// Recurrentes, metas y cuentas por cobrar. Funciones puras sobre el estado y la foto.
import { r2 } from './fiscal.js';
import { fechaDia, masDias } from './deudas.js';
import { periodo, rangoMes, ym } from './motor.js';
import { factorCobro } from './desglose.js';
import { params } from './fiscal.js';

/* ---------- Recurrentes ---------- */

/** Fechas en que toca un recurrente entre `desde` y `hasta` (inclusive). */
export function ocurrencias(rec, desde, hasta) {
  const out = [];
  const ini = rec.desde > desde ? rec.desde : desde;
  const fin = rec.hasta && rec.hasta < hasta ? rec.hasta : hasta;
  if (ini > fin) return out;
  if (rec.frecuencia === 'semanal') {
    let f = rec.desde;
    while (f < ini) f = masDias(f, 7);
    for (; f <= fin; f = masDias(f, 7)) out.push(f);
    return out;
  }
  let [y, m] = ini.split('-').map(Number);
  for (let guard = 0; guard < 400; guard++) {
    const dias = rec.frecuencia === 'quincenal' ? [15, 31] : [Number(rec.dia) || 1];
    for (const d of dias) { const f = fechaDia(y, m, d); if (f >= ini && f <= fin) out.push(f); }
    m += 1; if (m > 12) { m = 1; y += 1; }
    if (`${y}-${String(m).padStart(2, '0')}-01` > fin) break;
  }
  return out;
}

/** Recurrentes que ya tocaban y no se han confirmado ni omitido. */
export function pendientesRecurrentes(estado, hoy) {
  const out = [];
  for (const rec of estado.recurrentes ?? []) {
    if (rec.pausado) continue;
    const hechas = new Set(rec.hechas ?? []);
    for (const f of ocurrencias(rec, rec.desde, hoy)) if (!hechas.has(f)) out.push({ rec, fecha: f });
  }
  return out.sort((a, b) => a.fecha.localeCompare(b.fecha));
}

/** Próxima fecha de cada recurrente (para la agenda). */
export function proximaOcurrencia(rec, hoy) {
  return ocurrencias(rec, masDias(hoy, 1), masDias(hoy, 70))[0] ?? null;
}

/* ---------- Metas ---------- */

export function progresoMeta(meta, foto) {
  const cuenta = meta.cuenta ? foto.cuentas.find((c) => c.id === meta.cuenta) : null;
  const actual = r2(cuenta ? Math.max(0, cuenta.saldo) : Number(meta.aportado) || 0);
  const objetivo = Number(meta.objetivo) || 0;
  const falta = r2(Math.max(0, objetivo - actual));
  let meses = null, porMes = null;
  if (meta.fecha && falta > 0) {
    const [y1, m1] = foto.hoy.split('-').map(Number), [y2, m2] = meta.fecha.split('-').map(Number);
    meses = Math.max(1, (y2 - y1) * 12 + (m2 - m1));
    porMes = r2(falta / meses);
  }
  return { actual, objetivo, falta, avance: objetivo ? Math.min(1, actual / objetivo) : 0, meses, porMes, lograda: objetivo > 0 && falta === 0, cuenta };
}

/** Fondo de emergencia sugerido: N meses del gasto real promedio de los últimos 3 meses. */
export function fondoSugerido(foto, meses = 6) {
  const ks = [];
  let k = ym(foto.hoy);
  for (let i = 0; i < 3; i++) { const [y, m] = k.split('-').map(Number); k = new Date(Date.UTC(y, m - 2, 1)).toISOString().slice(0, 7); ks.push(k); }
  const gastos = ks.map((c) => { const [a, b] = rangoMes(c); return periodo(foto, a, b).gastos; }).filter((g) => g > 0);
  if (!gastos.length) return null;
  return Math.ceil(gastos.reduce((s, g) => s + g, 0) / gastos.length * meses / 100) * 100;
}

/* ---------- Clientes y cuentas por cobrar ---------- */

/** Lo que llegará a tu cuenta cuando te paguen una factura (con retenciones si es empresa). */
export function recibidoDeFactura(f) {
  const t = f.tasaIva === 'exento' ? 0 : Number(f.tasaIva ?? 0.16);
  return r2(Number(f.subtotal) * factorCobro(t, f.pagador ?? 'pf', params(+f.fecha.slice(0, 4))));
}

export function resumenClientes(estado, hoy) {
  const porCliente = {};
  for (const f of estado.facturas ?? []) {
    if (f.estado === 'cancelada') continue;
    const c = (porCliente[f.cliente] ??= { cliente: f.cliente, facturado: 0, cobrado: 0, pendiente: 0, vencido: 0, facturas: [] });
    const total = recibidoDeFactura(f);
    c.facturado = r2(c.facturado + total);
    if (f.estado === 'cobrada') c.cobrado = r2(c.cobrado + total);
    else {
      c.pendiente = r2(c.pendiente + total);
      if (f.vence && f.vence < hoy) c.vencido = r2(c.vencido + total);
    }
    c.facturas.push(f);
  }
  const clientes = Object.values(porCliente).sort((a, b) => b.pendiente - a.pendiente || b.facturado - a.facturado);
  return { clientes, porCobrar: r2(clientes.reduce((s, c) => s + c.pendiente, 0)), vencido: r2(clientes.reduce((s, c) => s + c.vencido, 0)) };
}
