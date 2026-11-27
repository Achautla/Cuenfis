// Modo demostración del asistente: respuestas simuladas, sin IA, con los mismos cálculos y pantallas.
// Sirve para probar la experiencia antes de activar el servidor. Siempre se anuncia como demostración.
import { ejecutar, contexto } from './herramientas.js';
import { money, fechaLarga } from '../ui/dom.js';

const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const n = (t) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const masDias = (iso, d) => new Date(Date.parse(`${iso}T12:00:00Z`) + d * 864e5).toISOString().slice(0, 10);

function periodoDe(t, hoy) {
  const [y, m] = hoy.split('-').map(Number);
  const ini = (yy, mm) => `${yy}-${String(mm).padStart(2, '0')}-01`;
  const fin = (yy, mm) => new Date(Date.UTC(yy, mm, 0)).toISOString().slice(0, 10);
  if (/mes pasado|anterior/.test(t)) { const d = new Date(Date.UTC(y, m - 2, 1)); return [ini(d.getUTCFullYear(), d.getUTCMonth() + 1), fin(d.getUTCFullYear(), d.getUTCMonth() + 1), 'el mes pasado']; }
  if (/ano|anio/.test(t)) return [`${y}-01-01`, hoy, `lo que va de ${y}`];
  if (/semana/.test(t)) return [masDias(hoy, -6), hoy, 'los últimos 7 días'];
  return [ini(y, m), hoy, 'este mes'];
}

const CLAVES_CAT = [
  [/gasolina|uber|taxi|camion|metro|transporte|estacionamiento/, 'transporte'],
  [/super|comida|restaurante|tacos|despensa|cafe/, 'comida'],
  [/luz|agua|internet|telefono|celular|gas\b/, 'servicios'],
  [/renta|hipoteca/, 'vivienda'],
  [/doctor|medico|dentista|farmacia|hospital|consulta/, 'salud'],
  [/cine|netflix|streaming|spotify|fiesta|salida/, 'ocio'],
];

function propuesta(t, original, ctx) {
  const monto = Number((original.match(/\$?\s?(\d[\d,]*(?:\.\d{1,2})?)/) ?? [])[1]?.replace(/,/g, ''));
  if (!(monto > 0)) return null;
  const entrada = /me pagaron|cobre|me depositaron|ingreso|me transfirieron/.test(t);
  const cats = ejecutar('listar_categorias', { tipo: entrada ? 'entrada' : 'salida' }).categorias.map((c) => c.id);
  let categoria = entrada ? (cats.includes('cobro_resico') ? 'cobro_resico' : cats.includes('otro_ingreso') ? 'otro_ingreso' : cats[0])
    : (CLAVES_CAT.find(([re, c]) => re.test(t) && cats.includes(c))?.[1] ?? (cats.includes('comida') ? 'comida' : cats[0]));
  const forma_pago = /efectivo/.test(t) ? 'efectivo' : /tarjeta/.test(t) ? 'tarjeta' : 'transferencia';
  const fecha = /antier|antes de ayer/.test(t) ? masDias(ctx.hoy, -2) : /ayer/.test(t) ? masDias(ctx.hoy, -1) : ctx.hoy;
  const nota = (original.replace(/\$?\s?\d[\d,]*(\.\d{1,2})?/g, '').replace(/\b(ayer|hoy|antier|registra|anota|pague|pagué|de|con|en|por|me|mi|el|la|los|las|un|una|tarjeta|efectivo|transferencia|pesos)\b/gi, ' ').replace(/\s+/g, ' ').trim() || 'Movimiento').slice(0, 40);
  return { tipo: entrada ? 'entrada' : 'salida', monto, fecha, categoria, nota: nota[0].toUpperCase() + nota.slice(1), forma_pago };
}

/** Responde en modo demostración. Emite los mismos eventos que el asistente real. */
export async function responderDemo(texto, alEvento) {
  const t = n(texto);
  const ctx = contexto();
  await espera(350);

  if (/registr|anota|pague|compre|gaste \d|me pagaron|cobre|me depositaron/.test(t)) {
    const p = propuesta(t, texto, ctx);
    if (p) {
      alEvento({ t: 'herramienta', nombre: 'proponer_movimiento' });
      await espera(400);
      const r = ejecutar('proponer_movimiento', p);
      if (r.error) { alEvento({ t: 'texto', md: `No pude preparar el movimiento: ${r.error}` }); return; }
      alEvento({ t: 'texto', md: `Preparé este movimiento. Revísalo y guárdalo si está bien:` });
      alEvento({ t: 'propuesta', datos: p });
      return;
    }
  }

  if (/declar|impuesto|\bsat\b|\bisr\b|\biva\b|cuanto pago|cuanto debo/.test(t)) {
    if (ctx.regimenes.includes('resico')) {
      const mes = ctx.hoy.slice(0, 7);
      alEvento({ t: 'herramienta', nombre: 'declaracion_mensual' });
      await espera(450);
      const d = ejecutar('declaracion_mensual', { mes });
      alEvento({ t: 'herramienta', nombre: 'regla_fiscal' });
      await espera(300);
      const rg = ejecutar('regla_fiscal', { clave: 'resico.mensual', anio: +mes.slice(0, 4) });
      if (d.error) { alEvento({ t: 'texto', md: d.error }); return; }
      alEvento({ t: 'texto', md: `Así va tu declaración de **${mes}** (RESICO), casilla por casilla:

| Casilla | Monto |
| --- | --- |
| Ingresos cobrados sin IVA | ${money(d.isr.ingresos_cobrados_sin_iva)} |
| Tasa aplicable | ${d.isr.tasa} |
| ISR determinado | ${money(d.isr.isr_determinado)} |
| ISR retenido por empresas | ${money(d.isr.isr_retenido_por_empresas)} |
| **ISR a cargo** | **${money(d.isr.isr_a_cargo)}** |
| IVA a cargo | ${money(d.iva.iva_a_cargo)} |
| **Total a pagar** | **${money(d.total_a_pagar)}** |

Fecha límite: ${fechaLarga(d.fecha_limite)}. La tasa sale de la ${rg.fuente.documento}, ${rg.fuente.articulo}.

Es una estimación; confírmala con el SAT o con un contador.` });
      return;
    }
    const y = +ctx.hoy.slice(0, 4);
    alEvento({ t: 'herramienta', nombre: 'declaracion_anual' });
    await espera(450);
    const a = ejecutar('declaracion_anual', { anio: y });
    if (!a.calculo) { alEvento({ t: 'texto', md: `En ${y} no tienes sueldos registrados para calcular la anual. Registra tus sueldos y te muestro la estimación.` }); return; }
    alEvento({ t: 'texto', md: `Tu anual ${y} va así:

| Concepto | Monto |
| --- | --- |
| Ingresos por sueldos | ${money(a.sueldos.ingresos)} |
| Deducciones aplicables | ${money(a.deducciones.total_aplicable)} |
| Base gravable | ${money(a.calculo.base_gravable)} |
| ISR del ejercicio | ${money(a.calculo.isr_del_ejercicio)} |
| ISR retenido | ${money(a.sueldos.isr_retenido)} |
| **${a.calculo.saldo_a_favor ? 'Saldo a favor' : 'ISR a cargo'}** | **${money(a.calculo.saldo_a_favor || a.calculo.isr_a_cargo)}** |

La tarifa es la del art. 152 de la Ley del ISR. Es una estimación; confírmala con el SAT o con un contador.` });
    return;
  }

  if (/gast|ahorr|cuanto llevo|como voy|en que se me va/.test(t)) {
    const [desde, hasta, nombre] = periodoDe(t, ctx.hoy);
    alEvento({ t: 'herramienta', nombre: 'resumen_periodo' });
    await espera(450);
    const r = ejecutar('resumen_periodo', { desde, hasta });
    const top = r.gasto_por_categoria.slice(0, 6);
    alEvento({ t: 'texto', md: `En ${nombre} tu gasto real fue de **${money(r.gasto_real)}** y ahorraste **${money(r.ahorro)}** (${r.tasa_ahorro} de lo tuyo).

${top.length ? `| Categoría | Gasto |\n| --- | --- |\n${top.map((c) => `| ${c.categoria} | ${money(c.monto)} |`).join('\n')}` : 'No hay gastos registrados en ese periodo.'}

${r.apartado_para_sat ? `Además apartaste ${money(r.apartado_para_sat)} para el SAT, que no cuenta como gasto.` : ''}` });
    return;
  }

  alEvento({ t: 'texto', md: `Puedo ayudarte con tus finanzas y tus impuestos. Prueba con:

- "¿Cuánto gasté este mes?"
- "Ayer pagué 350 de gasolina con tarjeta"
- "¿Cuánto voy a pagar al SAT?"
- "¿Cómo voy de ahorro este año?"` });
}
