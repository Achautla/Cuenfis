import { describe, it, expect } from 'vitest';
import { cobroResico, compararRegimenes } from '../src/core/simulador.js';
import { estadoPresupuestos, cruceDeUmbral } from '../src/core/presupuestos.js';
import { calcular } from '../src/core/motor.js';

describe('Simulador: si cobro X', () => {
  it('persona física: $45,000 + IVA', () => {
    const r = cobroResico({ subtotal: 45000, pagador: 'pf' });
    expect(r.recibido).toBe(52200); expect(r.isrPorPagar).toBe(495); expect(r.apartar).toBe(7695); expect(r.teQueda).toBe(44505);
  });
  it('empresa: retenciones y ISR cubierto', () => {
    const r = cobroResico({ subtotal: 45000, pagador: 'pm' });
    expect(r.recibido).toBeCloseTo(46837.5, 2); expect(r.isrPorPagar).toBe(0); expect(r.ivaPorPagar).toBe(2400); expect(r.teQueda).toBe(44437.5);
  });
  it('cobro que sube la tasa de todo el mes', () => {
    const r = cobroResico({ subtotal: 10000, pagador: 'pf', yaCobradoMes: 20000 });
    expect(r.isrPorPagar).toBe(130); expect(r.cambiaTasa).toBe(true); expect(r.teQueda).toBe(9870);
  });
});

describe('Simulador: comparar regímenes ($30,000/mes, $5,000 de gastos)', () => {
  const c = compararRegimenes({ ingreso: 30000, gastos: 5000 });
  const f = (k) => c.filas.find((x) => x.clave === k);
  it('RESICO', () => { expect(f('resico').isr).toBe(330); expect(f('resico').teQueda).toBe(24670); });
  it('Actividad empresarial (tarifa anual sobre utilidad)', () => { expect(f('honorarios').isr).toBeCloseTo(3451.66, 2); expect(f('honorarios').teQueda).toBeCloseTo(21548.34, 2); });
  it('Sueldo (art. 96)', () => { expect(f('sueldos').isr).toBeCloseTo(4519.65, 2); expect(f('sueldos').teQueda).toBeCloseTo(25480.35, 2); });
  it('Mejor opción', () => expect(c.mejor).toBe('sueldos'));
  it('RESICO no disponible si pasa el límite anual', () => expect(compararRegimenes({ ingreso: 300000 }).filas[0].disponible).toBe(false));
});

describe('Presupuestos', () => {
  const base = { perfil: { regimenes: [{ reg: 'sueldos', desde: '2026-01-01' }] }, cuentas: [{ id: 'd', tipo: 'debito', saldoInicial: 10000 }], movimientos: [
    { id: 'a', tipo: 'salida', categoria: 'comida', fecha: '2026-03-02', monto: 2500, cuenta: 'd', formaPago: 'tarjeta' }] };
  const pres = { comida: 3000, ocio: 1000 };
  it('aviso al 80%', () => {
    const e = estadoPresupuestos(calcular(base, '2026-03-31'), pres, '2026-03');
    expect(e.filas[0]).toMatchObject({ categoria: 'comida', gastado: 2500, nivel: 'aviso' });
    expect(e.alertas.length).toBe(1);
  });
  it('excedido al 100% y aviso de cruce al guardar', () => {
    const antes = calcular(base, '2026-03-31');
    const despues = calcular({ ...base, movimientos: [...base.movimientos, { id: 'b', tipo: 'salida', categoria: 'comida', fecha: '2026-03-05', monto: 600, cuenta: 'd', formaPago: 'tarjeta' }] }, '2026-03-31');
    expect(cruceDeUmbral(antes, despues, pres, '2026-03', 'comida')).toMatchObject({ nivel: 'excedido', restante: -100 });
  });
});
