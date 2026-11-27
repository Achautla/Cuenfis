import { describe, it, expect, beforeAll } from 'vitest';
import { markdown } from '../src/ui/markdown.js';
import { HERRAMIENTAS, NOMBRES_HERRAMIENTAS, CLAVES_REGLAS } from '../supabase/functions/_shared/herramientas.js';
import { FUENTES } from '../src/core/params/fuentes.js';

// Almacenamiento en memoria para correr el asistente fuera del navegador
const mem = new Map();
globalThis.localStorage = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k) };

let ia, demo, store, datosDemo;
const HOY = '2026-11-20';
beforeAll(async () => {
  store = await import('../src/data/store.js');
  ({ datosDemo } = await import('../src/data/demo.js'));
  ia = await import('../src/ia/herramientas.js');
  ({ responderDemo: demo } = await import('../src/ia/demo.js'));
  store.reemplazar(datosDemo(HOY));
});

const correr = async (texto) => { const ev = []; await demo(texto, (e) => ev.push(e)); return ev; };

describe('Markdown del asistente', () => {
  it('escapa HTML y solo deja enlaces https', () => {
    const h = markdown('<img src=x onerror=alert(1)> **ok** [a](javascript:alert(1)) [b](https://sat.gob.mx)');
    expect(h).not.toMatch(/<img/);
    expect(h).toContain('&lt;img');
    expect(h).toContain('<b>ok</b>');
    expect(h).not.toMatch(/href="javascript/);
    expect(h).toContain('<a href="https://sat.gob.mx" target="_blank" rel="noopener noreferrer">b</a>');
  });
  it('arma tablas con columnas numéricas alineadas, listas y párrafos', () => {
    const h = markdown('Hola\n\n| Casilla | Monto |\n| --- | --- |\n| ISR | $1,200.00 |\n| **Total** | **$1,500.00** |\n\n- uno\n- dos');
    expect(h).toContain('<table>');
    expect(h).toContain('<td class="n"><b>$1,500.00</b></td>');
    expect(h).toContain('<ul><li>uno</li><li>dos</li></ul>');
    expect(h.startsWith('<p>Hola</p>')).toBe(true);
  });
});

describe('Herramientas del asistente', () => {
  it('cada herramienta definida en el servidor tiene implementación en la app', () => {
    expect(NOMBRES_HERRAMIENTAS).toEqual(HERRAMIENTAS.map((h) => h.name));
    for (const n of NOMBRES_HERRAMIENTAS) expect(ia.ejecutar(n, {})).toBeTypeOf('object');
    expect(ia.ejecutar('borrar_todo', {})).toMatchObject({ error: expect.stringMatching(/desconocida/) });
  });
  it('las claves de regla_fiscal existen en las fuentes', () => {
    for (const c of CLAVES_REGLAS) expect(FUENTES[c], c).toBeTruthy();
  });
  it('resumen del periodo y regla fiscal con su fuente', () => {
    const r = ia.ejecutar('resumen_periodo', { desde: '2026-11-01', hasta: HOY });
    expect(r.movimientos).toBeGreaterThan(0);
    expect(r.gasto_por_categoria.length).toBeGreaterThan(0);
    const rg = ia.ejecutar('regla_fiscal', { clave: 'resico.mensual', anio: 2026 });
    expect(rg.fuente.documento).toBeTruthy();
    expect(rg.fuente.articulo).toMatch(/113-E/);
  });
  it('proponer_movimiento valida datos y categorías, y nunca guarda', () => {
    const antes = store.getEstado().movimientos.length;
    expect(ia.ejecutar('proponer_movimiento', { tipo: 'salida', monto: 0, fecha: HOY, categoria: 'comida' }).error).toBeTruthy();
    expect(ia.ejecutar('proponer_movimiento', { tipo: 'salida', monto: 10, fecha: HOY, categoria: 'no_existe' }).error).toMatch(/Categoría/);
    const cat = ia.ejecutar('listar_categorias', { tipo: 'salida' }).categorias[0].id;
    expect(ia.ejecutar('proponer_movimiento', { tipo: 'salida', monto: 10, fecha: HOY, categoria: cat })).toMatchObject({ estado: 'mostrado_al_usuario' });
    expect(store.getEstado().movimientos.length).toBe(antes);
  });
  it('el contexto solo lleva fecha, regímenes y frontera', () => {
    expect(Object.keys(ia.contexto()).sort()).toEqual(['frontera', 'hoy', 'regimenes']);
  });
});

describe('Modo demostración', () => {
  it('registra un gasto dictado como propuesta', async () => {
    const ev = await correr('Ayer pagué 350 de gasolina con tarjeta');
    const p = ev.find((e) => e.t === 'propuesta')?.datos;
    expect(p).toMatchObject({ tipo: 'salida', monto: 350, forma_pago: 'tarjeta', fecha: new Date(Date.parse(`${ia.contexto().hoy}T12:00:00Z`) - 864e5).toISOString().slice(0, 10) });
  });
  it('responde gastos del mes con tabla', async () => {
    const ev = await correr('¿Cuánto gasté este mes?');
    expect(ev[0]).toMatchObject({ t: 'herramienta', nombre: 'resumen_periodo' });
    expect(ev.at(-1).md).toMatch(/gasto real/);
  });
  it('declaración: cita la fuente y aclara que es estimación', async () => {
    const ev = await correr('¿Cuánto voy a pagar al SAT?');
    const md = ev.filter((e) => e.t === 'texto').map((e) => e.md).join('\n');
    expect(md).toMatch(/estimación/);
  });
  it('sin intención clara ofrece ejemplos', async () => {
    const ev = await correr('hola');
    expect(ev.at(-1).md).toMatch(/Prueba con/);
  });
});

describe('Fase 9: consultas por chat', () => {
  it('estado_financiero junta saldos, presupuestos y metas', () => {
    const r = ia.ejecutar('estado_financiero', { mes: HOY.slice(0, 7) });
    expect(r.saldos).toHaveProperty('disponible_real');
    expect(r.presupuestos.categorias.length).toBeGreaterThan(0);
    expect(r.metas.map((m) => m.nombre)).toContain('Viaje a Oaxaca');
    expect(ia.ejecutar('estado_financiero', { mes: 'x' }).error).toBeTruthy();
  });
  it('demostración: presupuestos, comparación y búsqueda por categoría', async () => {
    expect((await correr('¿Cómo voy con mis presupuestos?'))[0]).toMatchObject({ nombre: 'estado_financiero' });
    const cmp = await correr('¿Cómo voy contra el mes pasado?');
    expect(cmp.filter((e) => e.t === 'herramienta')).toHaveLength(2);
    expect(cmp.at(-1).md).toMatch(/Gasto real/);
    const b = await correr('¿Cuánto gasté en comida este mes?');
    expect(b[0]).toMatchObject({ nombre: 'buscar_movimientos' });
    expect(b.at(-1).md).toMatch(/comida/);
  });
  it('un cobro dictado se propone como entrada', async () => {
    const ev = await correr('Me pagaron 8,500 por transferencia');
    expect(ev.find((e) => e.t === 'propuesta').datos).toMatchObject({ tipo: 'entrada', monto: 8500, forma_pago: 'transferencia' });
  });
});
