import { describe, it, expect } from 'vitest';
import P from '../src/core/params/2026.js';
import { tasaResicoMensual, isrTarifa, subsidioEmpleoMensual, estimarBrutoDesdeNeto, isrRetenidoNomina, limiteDeducciones } from '../src/core/fiscal.js';
import { factorCobro } from '../src/core/desglose.js';

describe('Tablas 2026', () => {
  it('RESICO: tasa por tramo y en el límite exacto', () => {
    expect(tasaResicoMensual(25000, P)).toBe(0.01);
    expect(tasaResicoMensual(25000.01, P)).toBe(0.011);
    expect(tasaResicoMensual(83333.33, P)).toBe(0.015);
    expect(tasaResicoMensual(208333.34, P)).toBe(0.025);
  });
  it('Factor de cobro persona moral = 1.040833', () => {
    expect(factorCobro(0.16, 'pm', P)).toBeCloseTo(1.0408333, 6);
    expect(factorCobro(0.16, 'pf', P)).toBeCloseTo(1.16, 6);
  });
  it('Art. 96 y 152', () => {
    expect(isrTarifa(15000, P.tarifaMensual)).toBeCloseTo(1402.82, 2);
    expect(isrTarifa(180000, P.tarifaAnual)).toBeCloseTo(16833.81, 2);
  });
  it('Subsidio para el empleo 2026', () => {
    expect(subsidioEmpleoMensual(10000, P)).toBeCloseTo(535.65, 2);
    expect(subsidioEmpleoMensual(12000, P)).toBe(0);
  });
  it('Neto → bruto estimado es consistente con la retención', () => {
    const bruto = estimarBrutoDesdeNeto(13597.18, P);
    expect(bruto).toBeCloseTo(15000, 0);
    expect(bruto - isrRetenidoNomina(bruto, P)).toBeCloseTo(13597.18, 1);
  });
  it('Límite de deducciones', () => {
    expect(limiteDeducciones(2_000_000, P)).toBeCloseTo(214090.75, 2);
  });
});
