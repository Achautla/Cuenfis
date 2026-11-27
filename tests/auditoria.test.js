import { describe, it, expect } from 'vitest';
import { correr } from './escenarios.js';

describe('Auditoría Fase 1', () => {
  for (const e of correr()) {
    describe(`${e.id} · ${e.nombre}`, () => {
      for (const f of e.filas) it(f.que, () => expect(f.ok, `esperado ${f.esperado}, obtenido ${f.obtenido}`).toBe(true));
    });
  }
});
