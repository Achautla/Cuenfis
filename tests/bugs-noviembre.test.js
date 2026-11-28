// Casos de la revisión de bugs de noviembre 2026: redondeo y fechas del SAT, asistente, memoria, Markdown y noticias.
import { describe, it, expect, beforeAll } from 'vitest';
import { redondeoSat, fechaLimiteMensual, diasInhabiles, estimarBrutoDesdeNeto } from '../src/core/fiscal.js';
import { calcular } from '../src/core/motor.js';
import P from '../src/core/params/2026.js';
import { markdown } from '../src/ui/markdown.js';
import { leerRss, fechaMx, limpiarTexto } from '../supabase/functions/_shared/rss.js';

const mem = new Map();
globalThis.localStorage ??= { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k) };

let memoria, conv;
beforeAll(async () => {
  memoria = await import('../src/ia/memoria.js');
  conv = await import('../src/ia/conversacion.js');
});

describe('Redondeo y fechas del SAT (estimado)', () => {
  it('redondeoSat: hasta 50 centavos baja, de 51 sube', () => {
    expect(redondeoSat(100.5)).toBe(100);
    expect(redondeoSat(100.51)).toBe(101);
    expect(redondeoSat(0.49)).toBe(0);
    expect(redondeoSat(99.99)).toBe(100);
  });
  it('fechaLimiteMensual: día 17 del mes siguiente, recorrido si es fin de semana', () => {
    expect(fechaLimiteMensual('2026-11')).toBe('2026-12-17'); // jueves
    expect(fechaLimiteMensual('2026-09')).toBe('2026-10-19'); // el 17 es sábado
    expect(fechaLimiteMensual('2026-12')).toBe('2027-01-18'); // el 17 es domingo, cambia de año
  });
  it('fechaLimiteMensual: se recorre en días inhábiles (tercer lunes de noviembre, jueves santo)', () => {
    expect(fechaLimiteMensual('2025-10')).toBe('2025-11-18'); // 17-nov-2025 es el tercer lunes
    expect(fechaLimiteMensual('2025-03')).toBe('2025-04-21'); // 17-abr-2025 es jueves santo
    expect([...diasInhabiles(2026)]).toContain('2026-04-03'); // viernes santo 2026
  });
});

describe('Asistente: historial recortado', () => {
  it('siempre empieza en una pregunta del usuario', () => {
    const api = [
      { role: 'user', content: 'hola' },
      { role: 'assistant', content: [{ type: 'tool_use', id: 't1', name: 'x', input: {} }] },
      { role: 'user', content: [{ type: 'tool_result', tool_use_id: 't1', content: '{}' }] },
      { role: 'assistant', content: [{ type: 'text', text: 'listo' }] },
      { role: 'user', content: 'otra' },
    ];
    const r = conv.recortar(api, 3);
    expect(r[0]).toEqual({ role: 'user', content: 'otra' });
    expect(conv.recortar(api, 10)[0].content).toBe('hola');
  });
});

describe('Memoria: no guarda datos sensibles', () => {
  it('rechaza tarjetas y CLABE con espacios o guiones', () => {
    expect(() => memoria.limpiarRecuerdo('mi tarjeta 4152 3134 5678 9012')).toThrow();
    expect(() => memoria.limpiarRecuerdo('clabe 012-180-01234567890-1')).toThrow();
    expect(() => memoria.limpiarRecuerdo('mi contrasena es gato')).toThrow();
    expect(() => memoria.limpiarRecuerdo('Mi clave del SAT es x')).toThrow();
  });
  it('acepta recuerdos normales con cifras', () => {
    expect(memoria.limpiarRecuerdo('Cobro 25 000 al mes en RESICO')).toBe('Cobro 25 000 al mes en RESICO');
  });
});

describe('Markdown', () => {
  it('las negritas no rompen la dirección de un enlace', () => {
    const h = markdown('Ve [el **portal**](https://www.sat.gob.mx/a_b*c*d) hoy');
    expect(h).toContain('href="https://www.sat.gob.mx/a_b*c*d"');
    expect(h).toContain('<b>portal</b>');
  });
});

describe('Noticias RSS', () => {
  it('fecha sin hora se queda igual', () => {
    expect(fechaMx('2026-11-27')).toBe('2026-11-27');
  });
  it('una entidad numérica inválida no tira la fuente', () => {
    expect(limpiarTexto('a&#99999999;b')).toBe('ab');
  });
  it('Atom: toma el enlace alternate, no la imagen', () => {
    const xml = '<feed><entry><title>Tasa de Banxico</title><link rel="enclosure" href="https://m.mx/foto.jpg"/><link rel="alternate" href="https://m.mx/nota"/><updated>2026-11-27T10:00:00Z</updated></entry></feed>';
    expect(leerRss(xml, { nombre: 'M' })[0].enlace).toBe('https://m.mx/nota');
  });
});

const C = [{ id: 'c1', nombre: 'Banco', tipo: 'debito', saldoInicial: 0 }];
const ent = (id, fecha, monto, categoria, extra = {}) => ({ id, tipo: 'entrada', fecha, monto, categoria, cuenta: 'c1', ...extra });

describe('Otro ingreso: qué es este dinero (estimado)', () => {
  const base = { perfil: { regimenes: [{ reg: 'resico', desde: '2026-01-01' }] }, cuentas: C, declaraciones: {} };
  it('lo explicado como préstamo o regalo ya no se avisa en la mensual; lo de "mi trabajo" sí', () => {
    const f = calcular({ ...base, movimientos: [
      ent('a', '2026-11-05', 50000, 'otro_ingreso', { origen: 'prestamo' }),
      ent('b', '2026-11-06', 3000, 'otro_ingreso', { origen: 'actividad' }),
      ent('c', '2026-11-07', 500, 'otro_ingreso'),
    ] }, '2026-11-27');
    expect(f.meses['2026-11'].noSumadas).toEqual(['b', 'c']);
  });
  it('anual: avisa préstamos y regalos de más de $600,000 y el regalo gravado', () => {
    const f = calcular({ ...base, movimientos: [
      ent('a', '2026-03-01', 500000, 'otro_ingreso', { origen: 'prestamo' }),
      ent('b', '2026-04-01', 150000, 'otro_ingreso', { origen: 'regalo_otro' }),
      ent('c', '2026-05-01', 1000, 'otro_ingreso'),
    ] }, '2026-11-27');
    const o = f.anual(2026).otrosIngresos;
    expect(o.informarArt90).toBe(true);
    expect(o.topeRegalo).toBeCloseTo(117.31 * 365 * 3, 1);
    expect(o.regaloGravado).toBeCloseTo(150000 - 117.31 * 365 * 3, 1);
    expect(o.sinExplicar).toBe(1);
  });
  it('un sueldo cuando no estás en Sueldos sí se avisa', () => {
    const f = calcular({ ...base, movimientos: [ent('a', '2026-11-05', 9000, 'sueldo')] }, '2026-11-27');
    expect(f.meses['2026-11'].noSumadas).toEqual(['a']);
  });
});

describe('Sueldos sin recibo cobrados por quincena', () => {
  it('el ISR estimado se calcula con lo del mes, no con cada depósito', () => {
    const base = { perfil: { regimenes: [{ reg: 'sueldos', desde: '2026-01-01' }] }, cuentas: C, declaraciones: {} };
    const f = calcular({ ...base, movimientos: [ent('a', '2026-06-15', 10000, 'sueldo'), ent('b', '2026-06-30', 10000, 'sueldo')] }, '2026-11-27');
    const bruto = f.movs.reduce((s, m) => s + m.d.bruto, 0);
    expect(bruto).toBeCloseTo(estimarBrutoDesdeNeto(20000, P), 0);
    expect(bruto).toBeGreaterThan(2 * estimarBrutoDesdeNeto(10000, P));
  });
});

describe('Colegiaturas: tope por alumno y nivel', () => {
  it('cada alumno tiene su propio tope', () => {
    const base = { perfil: { regimenes: [{ reg: 'sueldos', desde: '2026-01-01' }] }, cuentas: C, declaraciones: {} };
    const col = (id, monto, alumno, nivel) => ({ id, tipo: 'salida', fecha: '2026-03-01', monto, categoria: 'colegiaturas', cuenta: 'c1', cfdi: true, formaPago: 'transferencia', alumno, nivel });
    const f = calcular({ ...base, movimientos: [ent('s', '2026-01-31', 400000, 'sueldo'), col('a', 20000, 'Sofi', 'primaria'), col('b', 30000, 'Leo', 'bachillerato')] }, '2026-11-27');
    const d = f.anual(2026).deducciones;
    expect(d.alumnos.length).toBe(2);
    expect(d.aplicables.colegiaturas).toBe(P.deducciones.colegiaturas.primaria + P.deducciones.colegiaturas.bachillerato);
  });
});
