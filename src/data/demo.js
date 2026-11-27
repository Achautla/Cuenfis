// Datos de ejemplo: sueldo en la primera mitad del año y RESICO después. Sirven para probar la app.
const pad = (n) => String(n).padStart(2, '0');

export function datosDemo(hoy) {
  const y = +hoy.slice(0, 4), mesHoy = +hoy.slice(5, 7);
  const f = (m, d) => `${y}-${pad(m)}-${pad(d)}`;
  const corte = Math.max(2, Math.min(mesHoy - 2, 6)); // termina el empleo unos meses antes de hoy
  const movimientos = [];
  let n = 0;
  const id = () => `demo${++n}`;
  for (let m = 1; m <= corte; m++) {
    movimientos.push({ id: id(), tipo: 'entrada', categoria: 'sueldo', fecha: f(m, 15), monto: 13597.18, sueldoBruto: 15000, isrRetenidoNomina: 1402.82, cuenta: 'debito', formaPago: 'transferencia', cfdi: true, contraparte: 'Empresa donde trabajaba' });
  }
  for (let m = 1; m <= mesHoy; m++) {
    movimientos.push({ id: id(), tipo: 'salida', categoria: 'vivienda', fecha: f(m, 3), monto: 4500, cuenta: 'debito', formaPago: 'transferencia', nota: 'Renta' });
    movimientos.push({ id: id(), tipo: 'salida', categoria: 'comida', fecha: f(m, 9), monto: 2800, cuenta: 'tdc', formaPago: 'tarjeta', nota: 'Súper' });
    movimientos.push({ id: id(), tipo: 'salida', categoria: 'transporte', fecha: f(m, 12), monto: 650, cuenta: 'efectivo', formaPago: 'efectivo' });
    movimientos.push({ id: id(), tipo: 'transferencia', fecha: f(m, 20), monto: 2800, cuenta: 'debito', cuentaDestino: 'tdc', nota: 'Pago de tarjeta' });
    movimientos.push({ id: id(), tipo: 'transferencia', fecha: f(m, 1), monto: 650, cuenta: 'debito', cuentaDestino: 'efectivo', nota: 'Retiro de cajero' });
  }
  for (let m = corte + 1; m <= mesHoy; m++) {
    movimientos.push({ id: id(), tipo: 'entrada', categoria: 'cobro_resico', fecha: f(m, 5), monto: 23200, cuenta: 'debito', pagador: 'pf', tasaIva: 0.16, cfdi: true, formaPago: 'transferencia', contraparte: 'Cliente particular', nota: 'Diseño web' });
    movimientos.push({ id: id(), tipo: 'entrada', categoria: 'cobro_resico', fecha: f(m, 18), monto: 15612.5, cuenta: 'debito', pagador: 'pm', tasaIva: 0.16, cfdi: true, formaPago: 'transferencia', contraparte: 'Agencia SA de CV', nota: 'Mantenimiento mensual' });
    movimientos.push({ id: id(), tipo: 'salida', categoria: 'gasto_actividad', fecha: f(m, 8), monto: 580, cuenta: 'debito', formaPago: 'tarjeta', cfdi: true, tasaIva: 0.16, nota: 'Internet' });
  }
  movimientos.push({ id: id(), tipo: 'salida', categoria: 'salud', fecha: f(Math.min(3, mesHoy), 22), monto: 1200, cuenta: 'debito', formaPago: 'tarjeta', cfdi: true, tasaIva: 0, nota: 'Dentista' });
  movimientos.push({ id: id(), tipo: 'salida', categoria: 'salud', fecha: f(Math.min(4, mesHoy), 2), monto: 700, cuenta: 'efectivo', formaPago: 'efectivo', cfdi: true, tasaIva: 0, nota: 'Consulta (efectivo)' });
  // Suscripción recurrente: confirmada todos los meses menos el último (queda por confirmar)
  const ocurr = [];
  for (let m = 1; m <= mesHoy; m++) if (f(m, 25) <= hoy) ocurr.push(f(m, 25));
  ocurr.pop();
  for (const fe of ocurr) movimientos.push({ id: id(), tipo: 'salida', categoria: 'ocio', fecha: fe, monto: 219, cuenta: 'tdc', formaPago: 'tarjeta', nota: 'Streaming', recurrente: 'rec-streaming' });
  const rentas = movimientos.filter((m) => m.nota === 'Renta' && m.fecha <= hoy).map((m) => m.fecha);
  const agencia = movimientos.filter((m) => m.contraparte === 'Agencia SA de CV' && m.fecha <= hoy);
  const ultAg = agencia.at(-1);
  const masDias = (iso, n) => new Date(Date.parse(iso + 'T00:00:00Z') + n * 864e5).toISOString().slice(0, 10);
  const facturas = [];
  if (ultAg) facturas.push({ id: 'fac1', cliente: 'Agencia SA de CV', concepto: 'Mantenimiento mensual', subtotal: 15000, tasaIva: 0.16, pagador: 'pm', fecha: masDias(ultAg.fecha, -10), vence: ultAg.fecha, estado: 'cobrada', movId: ultAg.id, cobradaEl: ultAg.fecha });
  if (mesHoy > corte) {
    facturas.push({ id: 'fac2', cliente: 'Estudio Norte', concepto: 'Sitio web (anticipo)', folio: 'A-12', subtotal: 8000, tasaIva: 0.16, pagador: 'pf', estado: 'pendiente', fecha: masDias(hoy, -40), vence: masDias(hoy, -10) });
    facturas.push({ id: 'fac3', cliente: 'Agencia SA de CV', concepto: 'Campaña de fin de año', folio: 'A-13', subtotal: 12000, tasaIva: 0.16, pagador: 'pm', estado: 'pendiente', fecha: masDias(hoy, -5), vence: masDias(hoy, 25) });
  }
  return {
    version: 1,
    perfil: { nombre: 'Ejemplo', rfc: '', frontera: false, regimenes: [
      { reg: 'sueldos', desde: f(1, 1), hasta: `${y}-${pad(corte)}-${new Date(y, corte, 0).getDate()}` },
      { reg: 'resico', desde: f(corte + 1, 1) },
    ] },
    cuentas: [
      { id: 'efectivo', nombre: 'Efectivo', tipo: 'efectivo', saldoInicial: 2000 },
      { id: 'debito', nombre: 'Cuenta de nómina', tipo: 'debito', saldoInicial: 8000 },
      { id: 'tdc', nombre: 'Tarjeta de crédito', tipo: 'credito', saldoInicial: 0, limite: 25000, diaCorte: 10, diaPago: 30, tasaAnual: 0.62 },
      { id: 'ahorro', nombre: 'Ahorro', tipo: 'ahorro', saldoInicial: 15000 },
    ],
    recurrentes: [
      { id: 'rec-renta', nombre: 'Renta', frecuencia: 'mensual', dia: 3, desde: f(1, 3), hechas: rentas, plantilla: { tipo: 'salida', categoria: 'vivienda', monto: 4500, cuenta: 'debito', formaPago: 'transferencia', nota: 'Renta' } },
      { id: 'rec-streaming', nombre: 'Streaming', frecuencia: 'mensual', dia: 25, desde: f(1, 25), hechas: ocurr, plantilla: { tipo: 'salida', categoria: 'ocio', monto: 219, cuenta: 'tdc', formaPago: 'tarjeta', nota: 'Streaming' } },
    ],
    metas: [
      { id: 'meta1', nombre: 'Fondo de emergencia', tipo: 'emergencia', objetivo: 48000, cuenta: 'ahorro' },
      { id: 'meta2', nombre: 'Viaje a Oaxaca', tipo: 'viaje', objetivo: 12000, aportado: 4000, fecha: `${y + 1}-07-15` },
    ],
    facturas,
    movimientos: movimientos.filter((m) => m.fecha <= hoy),
    declaraciones: {},
    presupuestos: { comida: 3000, ocio: 1500, transporte: 800, vivienda: 4500 },
    preferencias: { metaAhorro: 5000 },
  };
}
