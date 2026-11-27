import { describe, it, expect } from 'vitest';
import { calcular } from '../src/core/motor.js';
import { recordatorios } from '../src/core/recordatorios.js';
import { reporteContador } from '../src/core/reporte.js';
import { marcarDeclaracion, guardarAcuse, estadoVacio } from '../src/data/acciones.js';

const perfilR = { nombre: 'Ana', regimenes: [{ reg: 'resico', desde: '2026-01-01' }] };
const base = { ...estadoVacio(), perfil: perfilR, movimientos: [
  { id: 'c1', tipo: 'entrada', categoria: 'cobro_resico', fecha: '2026-03-05', monto: 23200, cuenta: 'debito', pagador: 'pf', tasaIva: 0.16, cfdi: true },
  { id: 'c2', tipo: 'entrada', categoria: 'cobro_resico', fecha: '2026-03-18', monto: 15612.5, cuenta: 'debito', pagador: 'pm', tasaIva: 0.16, cfdi: true },
  { id: 'g1', tipo: 'salida', categoria: 'gasto_actividad', fecha: '2026-03-08', monto: 580, cuenta: 'debito', formaPago: 'tarjeta', cfdi: true, tasaIva: 0.16 },
  { id: 'd1', tipo: 'salida', categoria: 'salud', fecha: '2026-03-22', monto: 1200, cuenta: 'debito', formaPago: 'tarjeta', cfdi: true, tasaIva: 0 },
  { id: 'd2', tipo: 'salida', categoria: 'salud', fecha: '2026-03-23', monto: 700, cuenta: 'efectivo', formaPago: 'efectivo', cfdi: true, tasaIva: 0 },
] };

describe('Recordatorios', () => {
  it('declaración de marzo: 7 días antes del 17 de abril es "pronto"', () => {
    const r = recordatorios(base, calcular(base, '2026-04-10'));
    const d = r.find((x) => x.id.startsWith('decl-2026-03'));
    expect(d).toMatchObject({ nivel: 'pronto', fecha: '2026-04-17', ruta: 'declaracion' });
    expect(d.texto).toContain('4,117.50');
  });
  it('vencida después del 17 y desaparece al marcarla pagada', () => {
    expect(recordatorios(base, calcular(base, '2026-04-20')).find((x) => x.id.startsWith('decl-2026-03')).nivel).toBe('urgente');
    const pagada = marcarDeclaracion(base, '2026-03', 'pagada', { cuenta: 'debito', fecha: '2026-04-15', hoy: '2026-04-15' });
    expect(recordatorios(pagada, calcular(pagada, '2026-04-20')).some((x) => x.id.startsWith('decl-2026-03'))).toBe(false);
  });
  it('a quien solo tiene sueldos no se le recuerda nada de RESICO', () => {
    const e = { ...estadoVacio(), perfil: { regimenes: [{ reg: 'sueldos', desde: '2026-01-01' }] }, movimientos: [
      { id: 's', tipo: 'entrada', categoria: 'sueldo', fecha: '2026-03-15', monto: 13597.18, sueldoBruto: 15000, isrRetenidoNomina: 1402.82, cuenta: 'debito', cfdi: true }] };
    expect(recordatorios(e, calcular(e, '2026-04-10')).length).toBe(0);
  });
  it('tarjeta: avisa 5 días antes de la fecha límite', () => {
    const e = { ...base, cuentas: [...base.cuentas, { id: 'tdc', tipo: 'credito', saldoInicial: 0, limite: 20000, diaCorte: 10, diaPago: 30 }],
      movimientos: [{ id: 'x', tipo: 'salida', categoria: 'comida', fecha: '2026-06-05', monto: 3000, cuenta: 'tdc', formaPago: 'tarjeta' }] };
    expect(recordatorios(e, calcular(e, '2026-06-24')).some((x) => x.ruta === 'deudas')).toBe(false);
    expect(recordatorios(e, calcular(e, '2026-06-26')).find((x) => x.ruta === 'deudas')).toMatchObject({ nivel: 'pronto', fecha: '2026-06-30' });
  });
});

describe('Reporte para el contador', () => {
  const e = guardarAcuse(marcarDeclaracion(base, '2026-03', 'pagada', { cuenta: 'debito', fecha: '2026-04-15', hoy: '2026-04-15' }), '2026-03', { numOperacion: '123' });
  const r = reporteContador(e, calcular(e, '2026-04-30'), '2026-03-01', '2026-03-31');
  it('totales de ingresos: subtotal 35,000, IVA 5,600, ISR ret 187.50, IVA ret 1,600 (2/3 de 2,400)', () =>
    expect(r.totales.ingresos).toMatchObject({ subtotal: 35000, iva: 5600, isrRet: 187.5, ivaRet: 1600, recibido: 38812.5 }));
  it('mes RESICO con estado y número de operación', () =>
    expect(r.meses[0]).toMatchObject({ clave: '2026-03', isrDet: 385, isrCargo: 197.5, ivaCargo: 3920, totalPagar: 4117.5, estado: 'pagada', numOperacion: '123' }));
  it('IVA acreditable del gasto con CFDI: 80', () => expect(r.totales.gastosActividad).toMatchObject({ total: 580, iva: 80, ivaAcreditable: 80 }));
  it('deducciones: la de efectivo no es deducible', () => expect(r.totales.deducciones).toMatchObject({ total: 1900, deducible: 1200 }));
  it('el pago al SAT no aparece como gasto ni ingreso', () => expect(r.ingresos.length + r.gastosActividad.length + r.deducciones.length).toBe(5));
});

describe('Regresar a pendiente conserva el acuse', () => {
  it('no se pierde el número de operación', () => {
    let e = marcarDeclaracion(base, '2026-03', 'presentada', { hoy: '2026-04-10' });
    e = guardarAcuse(e, '2026-03', { numOperacion: '999' });
    e = marcarDeclaracion(e, '2026-03', 'pendiente', { hoy: '2026-04-10' });
    expect(e.declaraciones['2026-03'].acuse.numOperacion).toBe('999');
    expect(calcular(e, '2026-04-10').meses['2026-03'].estado).toBe('pendiente');
  });
});
