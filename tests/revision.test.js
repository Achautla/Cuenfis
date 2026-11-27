// Pruebas de la revisión de bugs previa al lanzamiento.
import { describe, it, expect } from 'vitest';
import { calcular } from '../src/core/motor.js';
import { recordatorios } from '../src/core/recordatorios.js';
import { estadoVacio } from '../src/data/acciones.js';
import { isrTarifa, isrRetenidoNomina, estimarBrutoDesdeNeto, params } from '../src/core/fiscal.js';

const p = params(2026);

describe('tarifa ISR sin huecos entre centavos', () => {
  it('una base entre dos tramos (844.595) usa el tramo bajo, no el 35%', () => {
    expect(isrTarifa(844.595, p.tarifaMensual)).toBeLessThan(20);
    expect(isrTarifa(7168.515, p.tarifaMensual)).toBeLessThan(500);
  });
  it('la estimación del bruto desde el neto es coherente', () => {
    for (const neto of [800, 844.59, 7000, 12000, 30000]) {
      const bruto = estimarBrutoDesdeNeto(neto, p);
      expect(Math.abs(bruto - isrRetenidoNomina(bruto, p) - neto)).toBeLessThan(0.05);
    }
  });
});

describe('recordatorios', () => {
  it('una declaración presentada en ceros ya no se recuerda', () => {
    const e = { ...estadoVacio(), perfil: { regimenes: [{ reg: 'resico', desde: '2026-01-01' }] },
      declaraciones: { '2026-03': { estado: 'presentada', monto: 0 } } };
    const r = recordatorios(e, calcular(e, '2026-04-15'));
    expect(r.some((x) => x.id.startsWith('decl-2026-03'))).toBe(false);
  });
});
