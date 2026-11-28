// Casos de la revisión de bugs de noviembre 2026: redondeo y fechas del SAT, asistente, memoria, Markdown y noticias.
import { describe, it, expect, beforeAll } from 'vitest';
import { redondeoSat, fechaLimiteMensual } from '../src/core/fiscal.js';
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
