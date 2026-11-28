import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';

// Un "step" grueso (100, 500...) hace que el navegador rechace montos válidos
// como 85000 cuando min no es múltiplo del paso. Todos los campos numéricos aceptan centavos.
describe('campos numéricos', () => {
  const dir = new URL('../src/views/', import.meta.url);
  for (const f of readdirSync(dir).filter((n) => n.endsWith('.js'))) {
    it(`${f} acepta cualquier monto con centavos`, () => {
      const src = readFileSync(new URL(f, dir), 'utf8');
      // Solo campos de dinero: los deslizadores (type="range", como el volumen) tienen su propio paso
      const sinRangos = src.replace(/<input[^>]*type="range"[^>]*>/g, '');
      const pasos = [...sinRangos.matchAll(/step="([^"]*)"/g)].map((m) => m[1]);
      expect(pasos.filter((p) => p !== '0.01')).toEqual([]);
    });
  }
});
