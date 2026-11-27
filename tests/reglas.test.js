import { describe, it, expect, afterEach } from 'vitest';
import P2025 from '../src/core/params/2025.js';
import P2026 from '../src/core/params/2026.js';
import { FUENTES } from '../src/core/params/fuentes.js';
import { reglas, validar, registrarRemotas, cambios, leyendaReglas, datosPara, fuente, valor, aniosConReglas } from '../src/core/reglas.js';
import { params, isrTarifa, subsidioEmpleoMensual } from '../src/core/fiscal.js';

afterEach(() => registrarRemotas([]));

describe('Reglas fiscales por año', () => {
  it('cada año usa sus propias reglas', () => {
    expect(reglas(2026)).toMatchObject({ base: 2026, provisional: false });
    expect(reglas(2025)).toMatchObject({ base: 2025, provisional: false });
    expect(params(2025).uma.diaria).toBe(113.14);
    expect(params(2026).uma.diaria).toBe(117.31);
  });
  it('un año sin reglas publicadas usa el último anterior y queda provisional', () => {
    expect(reglas(2027)).toMatchObject({ anio: 2027, base: 2026, provisional: true });
    expect(leyendaReglas(2027)).toMatch(/provisionales para 2027/);
    expect(leyendaReglas(2026)).toBe('reglas fiscales 2026');
  });
  it('tarifa y subsidio 2025 (Anexo 8 RMF 2025, decreto DOF 31-dic-2024)', () => {
    expect(isrTarifa(15000, P2025.tarifaMensual)).toBeCloseTo(1552.78, 2);
    expect(subsidioEmpleoMensual(9000, P2025)).toBeCloseTo(474.64, 2);
    expect(subsidioEmpleoMensual(10500, P2025)).toBe(0);
  });
  it('las reglas incluidas pasan la validación', () => {
    expect(validar(P2025)).toEqual([]);
    expect(validar(P2026)).toEqual([]);
  });
  it('todos los datos con fuente existen en cada año y tienen documento, artículo y enlace oficial', () => {
    for (const y of aniosConReglas()) for (const k of Object.keys(FUENTES)) {
      expect(valor(params(y), k), `${k} ${y}`).toBeDefined();
      const f = fuente(k, y);
      expect(f.documento && f.articulo && f.url.startsWith('https://')).toBeTruthy();
    }
    expect(fuente('tarifaMensual', 2026).publicacion).toMatch(/Anexo 8 de la RMF 2026/);
    expect(fuente('tarifaMensual', 2027).provisional).toBe(true);
  });
  it('qué cambió de 2025 a 2026', () => {
    const c = cambios(2026);
    expect(c).toEqual(expect.arrayContaining(['uma', 'tarifaMensual', 'tarifaAnual', 'subsidioEmpleo']));
    expect(c).not.toContain('resico.mensual');
    expect(cambios(2025)).toEqual([]);
  });
  it('solo muestra los datos del régimen del usuario', () => {
    const resico = datosPara(['resico']);
    expect(resico).toContain('resico.mensual');
    expect(resico).not.toContain('tarifaMensual');
    const sueldos = datosPara(['sueldos']);
    expect(sueldos).not.toContain('resico.mensual');
    expect(sueldos).toContain('tarifaAnual');
  });
});

describe('Reglas desde la nube', () => {
  const json = (p) => JSON.parse(JSON.stringify(p)); // Infinity viaja como null
  it('acepta reglas válidas de un año nuevo y deja de ser provisional', () => {
    const r = registrarRemotas([{ anio: 2027, revision: 1, datos: { ...json(P2026), uma: { diaria: 121 } } }]);
    expect(r.aceptadas).toEqual([2027]);
    expect(reglas(2027)).toMatchObject({ base: 2027, provisional: false });
    expect(params(2027).uma.diaria).toBe(121);
    expect(params(2027).tarifaAnual.at(-1)[1]).toBe(Infinity);
  });
  it('una corrección con revisión mayor reemplaza a la incluida; una menor no', () => {
    registrarRemotas([{ anio: 2026, revision: 2, datos: { ...json(P2026), topeEfectivo: 2500 } }]);
    expect(params(2026).topeEfectivo).toBe(2500);
    registrarRemotas([{ anio: 2026, revision: 1, datos: { ...json(P2026), topeEfectivo: 9 } }]);
    expect(params(2026).topeEfectivo).toBe(2000);
  });
  it('rechaza reglas dañadas y sigue con las incluidas', () => {
    const malas = { ...json(P2026), tarifaMensual: [[0, 1, 2, 5]], iva: { general: 16 } };
    const r = registrarRemotas([{ anio: 2027, revision: 1, datos: malas }, { anio: 2028, revision: 1, datos: null }]);
    expect(r.aceptadas).toEqual([]);
    expect(r.rechazadas[0].problemas).toEqual(expect.arrayContaining(['iva', 'tarifaMensual']));
    expect(reglas(2027).provisional).toBe(true);
  });
});
