import { describe, it, expect } from 'vitest';
import { calcular } from '../src/core/motor.js';
import { estadoTarjeta, estadoPrestamo } from '../src/core/deudas.js';
import { ocurrencias, pendientesRecurrentes, progresoMeta, resumenClientes, recibidoDeFactura } from '../src/core/agenda.js';
import { guardarRecurrente, confirmarRecurrente, omitirRecurrente, guardarFactura, cobrarFactura, borrarMovimiento, estadoVacio } from '../src/data/acciones.js';

const perfil = { regimenes: [{ reg: 'resico', desde: '2026-01-01' }] };

describe('Tarjeta de crédito', () => {
  const estado = { perfil, cuentas: [
    { id: 'deb', tipo: 'debito', saldoInicial: 10000 },
    { id: 'tdc', tipo: 'credito', saldoInicial: 0, limite: 20000, diaCorte: 10, diaPago: 30, tasaAnual: 0.48 }],
  movimientos: [
    { id: 'a', tipo: 'salida', categoria: 'comida', fecha: '2026-03-05', monto: 3000, cuenta: 'tdc', formaPago: 'tarjeta' },
    { id: 'b', tipo: 'salida', categoria: 'ocio', fecha: '2026-03-12', monto: 1000, cuenta: 'tdc', formaPago: 'tarjeta' },
    { id: 'c', tipo: 'transferencia', fecha: '2026-03-20', monto: 1000, cuenta: 'deb', cuentaDestino: 'tdc' }] };
  const f = calcular(estado, '2026-03-25');
  const t = estadoTarjeta(f, f.cuentas.find((c) => c.id === 'tdc'));
  it('corte y fecha límite', () => { expect(t.ultimoCorte).toBe('2026-03-10'); expect(t.limitePago).toBe('2026-03-30'); expect(t.diasParaPagar).toBe(5); });
  it('saldo al corte y pago para no generar intereses', () => { expect(t.saldoCorte).toBe(3000); expect(t.pagoSinIntereses).toBe(2000); });
  it('pago mínimo ya cubierto (máx. de 1.5% del saldo y 1.25% del límite = $250)', () => expect(t.pagoMinimo).toBe(0));
  it('interés si solo pagas el mínimo: $2,000 × 4% × 1.16', () => expect(t.interesSiMinimo).toBe(92.8));
  it('uso de la línea', () => { expect(t.saldo).toBe(3000); expect(t.disponible).toBe(17000); });
  it('antes del corte de marzo usa el corte de febrero', () => {
    const f2 = calcular(estado, '2026-03-09');
    expect(estadoTarjeta(f2, f2.cuentas.find((c) => c.id === 'tdc')).saldoCorte).toBe(0);
  });
});

describe('Préstamo', () => {
  it('meses para liquidar', () => expect(estadoPrestamo({ saldo: 10000, tasaAnual: 0.24, pagoMensual: 1000 }).meses).toBe(12));
  it('pago menor al interés nunca liquida', () => expect(estadoPrestamo({ saldo: 10000, tasaAnual: 0.24, pagoMensual: 150 }).nuncaSeLiquida).toBe(true));
});

describe('Recurrentes', () => {
  it('mensual el día 31 se ajusta a fin de mes', () => expect(ocurrencias({ frecuencia: 'mensual', dia: 31, desde: '2026-01-31' }, '2026-01-31', '2026-04-15')).toEqual(['2026-01-31', '2026-02-28', '2026-03-31']));
  it('quincenal: 15 y fin de mes', () => expect(ocurrencias({ frecuencia: 'quincenal', desde: '2026-02-01' }, '2026-02-01', '2026-03-20')).toEqual(['2026-02-15', '2026-02-28', '2026-03-15']));
  it('semanal', () => expect(ocurrencias({ frecuencia: 'semanal', desde: '2026-03-02' }, '2026-03-02', '2026-03-20')).toEqual(['2026-03-02', '2026-03-09', '2026-03-16']));
  it('confirmar crea el movimiento y omitir lo quita de pendientes', () => {
    let e = { ...estadoVacio(), perfil };
    e = guardarRecurrente(e, { id: 'r', frecuencia: 'mensual', dia: 3, desde: '2026-01-03', plantilla: { tipo: 'salida', categoria: 'vivienda', monto: 4500, cuenta: 'debito', formaPago: 'transferencia' } });
    expect(pendientesRecurrentes(e, '2026-02-10').length).toBe(2);
    e = confirmarRecurrente(e, 'r', '2026-01-03', 4600);
    e = omitirRecurrente(e, 'r', '2026-02-03');
    expect(pendientesRecurrentes(e, '2026-02-10').length).toBe(0);
    expect(e.movimientos).toHaveLength(1);
    expect(e.movimientos[0]).toMatchObject({ fecha: '2026-01-03', monto: 4600, categoria: 'vivienda' });
  });
});

describe('Metas', () => {
  it('ahorro mensual necesario', () => {
    const f = calcular({ perfil, cuentas: [], movimientos: [] }, '2026-04-15');
    expect(progresoMeta({ objetivo: 30000, aportado: 6000, fecha: '2026-12-31' }, f)).toMatchObject({ falta: 24000, meses: 8, porMes: 3000, avance: 0.2 });
  });
  it('meta ligada a una cuenta usa su saldo', () => {
    const f = calcular({ perfil, cuentas: [{ id: 'ah', tipo: 'ahorro', saldoInicial: 9000 }], movimientos: [] }, '2026-04-15');
    expect(progresoMeta({ objetivo: 9000, cuenta: 'ah' }, f).lograda).toBe(true);
  });
});

describe('Clientes y facturas por cobrar', () => {
  let e = { ...estadoVacio(), perfil };
  e = guardarFactura(e, { id: 'f1', cliente: 'Agencia SA', fecha: '2026-02-01', vence: '2026-02-15', subtotal: 45000, pagador: 'pm', tasaIva: 0.16 });
  it('lo que llegará = subtotal × 1.040833', () => expect(recibidoDeFactura(e.facturas[0])).toBeCloseTo(46837.5, 2));
  it('pendiente y vencido', () => expect(resumenClientes(e, '2026-02-20')).toMatchObject({ porCobrar: 46837.5, vencido: 46837.5 }));
  it('una factura sin cobrar no cuenta para impuestos', () => expect(calcular(e, '2026-02-20').meses['2026-02'].total).toBe(0));
  it('al cobrarla genera la entrada y entra a la declaración del mes del cobro', () => {
    const c = cobrarFactura(e, 'f1', { fecha: '2026-03-05', cuenta: 'debito', monto: 46837.5, categoria: 'cobro_resico' });
    const f = calcular(c, '2026-03-31');
    expect(f.meses['2026-03']).toMatchObject({ total: 45000, isrDet: 495, isrRet: 562.5, ivaCargo: 2400 });
    expect(resumenClientes(c, '2026-03-31').porCobrar).toBe(0);
    const borrado = borrarMovimiento(c, c.facturas[0].movId);
    expect(borrado.facturas[0].estado).toBe('pendiente');
  });
});
