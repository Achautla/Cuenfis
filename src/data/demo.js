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
  return {
    version: 1,
    perfil: { nombre: 'Ejemplo', rfc: '', frontera: false, regimenes: [
      { reg: 'sueldos', desde: f(1, 1), hasta: `${y}-${pad(corte)}-${new Date(y, corte, 0).getDate()}` },
      { reg: 'resico', desde: f(corte + 1, 1) },
    ] },
    cuentas: [
      { id: 'efectivo', nombre: 'Efectivo', tipo: 'efectivo', saldoInicial: 2000 },
      { id: 'debito', nombre: 'Cuenta de nómina', tipo: 'debito', saldoInicial: 8000 },
      { id: 'tdc', nombre: 'Tarjeta de crédito', tipo: 'credito', saldoInicial: 0 },
    ],
    movimientos: movimientos.filter((m) => m.fecha <= hoy),
    declaraciones: {},
    preferencias: { metaAhorro: 5000 },
  };
}
