// Modo demostración del asistente: respuestas simuladas, sin IA, con los mismos cálculos y pantallas.
// Sirve para probar la experiencia antes de activar el servidor. Siempre se anuncia como demostración.
import { ejecutar, contexto } from './herramientas.js';
import { money, fechaLarga, pesos } from '../ui/dom.js';
import { ID_POR_ETIQUETA, CASILLAS } from './casillas.js';

const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const n = (t) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const masDias = (iso, d) => new Date(Date.parse(`${iso}T12:00:00Z`) + d * 864e5).toISOString().slice(0, 10);

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const ini = (yy, mm) => `${yy}-${String(mm).padStart(2, '0')}-01`;
const fin = (yy, mm) => new Date(Date.UTC(yy, mm, 0)).toISOString().slice(0, 10);

function periodoDe(t, hoy) {
  const [y, m] = hoy.split('-').map(Number);
  const nm = MESES.findIndex((x) => new RegExp(`\\b${x}\\b`).test(t));
  if (nm >= 0) { const yy = nm + 1 > m ? y - 1 : y; return [ini(yy, nm + 1), nm + 1 === m && yy === y ? hoy : fin(yy, nm + 1), `${MESES[nm]}${yy !== y ? ` de ${yy}` : ''}`]; }
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

  const rec = texto.match(/\b(?:recuerda|acuérdate|acuerdate|ten en cuenta)\s+(?:que\s+)?(.{3,})/i);
  if (rec) {
    alEvento({ t: 'herramienta', nombre: 'proponer_recuerdo' });
    await espera(350);
    const frase = rec[1].replace(/[.!?¡¿]+$/, '');
    const r = ejecutar('proponer_recuerdo', { texto: frase });
    if (r.error) { alEvento({ t: 'texto', md: `No lo guardo: ${r.error}` }); return; }
    alEvento({ t: 'texto', md: '¿Quieres que lo recuerde para tus próximas preguntas? Tú decides:' });
    alEvento({ t: 'recuerdo', texto: frase[0].toUpperCase() + frase.slice(1) });
    return;
  }

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

  // Asistencia en la declaración: una casilla concreta o el recorrido completo
  const q = texto.match(/«(.+?)»/);
  const anioTxt = t.match(/\b(20\d\d)\b/)?.[1];
  const mesTxt = MESES.findIndex((x) => new RegExp(`\\b${x}\\b`).test(t));
  const periodo = /\banual\b/.test(t) && anioTxt ? anioTxt : anioTxt && mesTxt >= 0 ? `${anioTxt}-${String(mesTxt + 1).padStart(2, '0')}` : ctx.hoy.slice(0, 7);
  if (q && ID_POR_ETIQUETA[q[1]]) {
    alEvento({ t: 'herramienta', nombre: 'guia_casilla' });
    await espera(450);
    const g = ejecutar('guia_casilla', { casilla: ID_POR_ETIQUETA[q[1]], periodo });
    if (g.error) { alEvento({ t: 'texto', md: g.error }); return; }
    const v = typeof g.valor === 'number';
    alEvento({ t: 'texto', md: `En **${g.casilla}** (pestaña ${g.pestana}) pon **${v ? pesos(g.valor) : g.valor}**${v && g.valor % 1 ? ` (son ${money(g.valor)}; el portal pide pesos sin centavos)` : ''}.

${g.explicacion}

Fundamento: ${g.fuente.documento}, ${g.fuente.articulo}.${g.reglas_provisionales ? ' Ojo: las reglas de este año aún son provisionales.' : ''}

Es una estimación; confírmala con el SAT o con un contador.` });
    return;
  }
  if (/guiame|paso a paso/.test(t) && ctx.regimenes.includes('resico')) {
    const imp = /\biva\b/.test(t) ? 'iva' : 'isr';
    alEvento({ t: 'herramienta', nombre: 'declaracion_mensual' });
    await espera(400);
    const d = ejecutar('declaracion_mensual', { mes: periodo.length === 7 ? periodo : ctx.hoy.slice(0, 7) });
    if (d.error) { alEvento({ t: 'texto', md: d.error }); return; }
    alEvento({ t: 'herramienta', nombre: 'guia_casilla' });
    await espera(350);
    const filas = Object.entries(CASILLAS).filter(([, c]) => c[0] === imp).map(([id]) => ejecutar('guia_casilla', { casilla: id, periodo: d.mes })).filter((g) => !g.error);
    alEvento({ t: 'texto', md: `Vamos con el **${imp.toUpperCase()}** de ${d.mes}. Captura así, en este orden:

| Casilla | Pon |
| --- | --- |
${filas.map((g) => `| ${g.casilla} | ${typeof g.valor === 'number' ? pesos(g.valor) : g.valor} |`).join('\n')}
| **Cantidad a pagar** | **${pesos(imp === 'isr' ? d.isr.isr_a_cargo : d.iva.iva_a_cargo)}** |

1. Revisa que el prellenado coincida con la primera casilla. Si no, dime qué ves y lo revisamos.
2. ${imp === 'isr' ? 'La tasa y el ISR determinado los calcula el portal: solo confirma que coincidan.' : 'El IVA acreditable lo capturas tú: es el IVA de tus gastos de la actividad con factura.'}
3. Al terminar, ${imp === 'isr' ? 'sigue con el IVA (pregúntame «guíame con el IVA»)' : 'envía la declaración y paga la línea de captura'} antes del ${fechaLarga(d.fecha_limite)}.

Es una estimación; confírmala con el SAT o con un contador.` });
    return;
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

  if (/presupuest|cuanto tengo|cuanto debo|disponible|saldo|mis metas|\bmeta|mis deudas/.test(t)) {
    alEvento({ t: 'herramienta', nombre: 'estado_financiero' });
    await espera(450);
    const r = ejecutar('estado_financiero', { mes: ctx.hoy.slice(0, 7) });
    const ps = r.presupuestos.categorias;
    const est = { excedido: 'Te pasaste', aviso: 'Cerca del límite', ok: 'Bien' };
    let md = `Tienes **${money(r.saldos.tengo)}** y debes ${money(r.saldos.deudas)} en tarjetas y créditos. Con lo apartado para el SAT (${money(r.saldos.apartado_para_sat)}), tu **disponible real es ${money(r.saldos.disponible_real)}**.`;
    if (ps.length) md += `\n\n**Presupuestos de este mes**\n\n| Categoría | Gastado | Te queda |\n| --- | --- | --- |\n${ps.map((c) => `| ${c.categoria} | ${money(c.gastado)} de ${money(c.limite)} | ${c.restante < 0 ? `**Te pasaste ${money(-c.restante)}**` : money(c.restante)} |`).join('\n')}`;
    const alertas = ps.filter((c) => c.estado !== 'ok');
    if (alertas.length) md += `\n\n${alertas.map((c) => `${est[c.estado]} en ${c.categoria} (${c.uso}).`).join(' ')}`;
    if (r.metas.length) md += `\n\n**Metas**\n\n${r.metas.map((m) => `- ${m.nombre}: ${money(m.ahorrado)} de ${money(m.objetivo)} (${m.avance})`).join('\n')}`;
    alEvento({ t: 'texto', md });
    return;
  }

  if (/compar|contra el mes|vs\.? el mes|que el mes pasado/.test(t)) {
    const [y, m] = ctx.hoy.split('-').map(Number);
    const d = new Date(Date.UTC(y, m - 2, 1));
    const [py, pm] = [d.getUTCFullYear(), d.getUTCMonth() + 1];
    const dia = Math.min(+ctx.hoy.slice(8), +fin(py, pm).slice(8));
    alEvento({ t: 'herramienta', nombre: 'resumen_periodo' });
    await espera(300);
    const a = ejecutar('resumen_periodo', { desde: ini(y, m), hasta: ctx.hoy });
    alEvento({ t: 'herramienta', nombre: 'resumen_periodo' });
    await espera(300);
    const b = ejecutar('resumen_periodo', { desde: ini(py, pm), hasta: `${ini(py, pm).slice(0, 8)}${String(dia).padStart(2, '0')}` });
    const dif = a.gasto_real - b.gasto_real;
    const cats = [...new Set([...a.gasto_por_categoria, ...b.gasto_por_categoria].map((c) => c.categoria))].slice(0, 6);
    const de = (r, c) => r.gasto_por_categoria.find((x) => x.categoria === c)?.monto ?? 0;
    alEvento({ t: 'texto', md: `Comparé del día 1 al ${+ctx.hoy.slice(8)} de cada mes, para que sea justo:

| Concepto | ${MESES[pm - 1]} | ${MESES[m - 1]} |
| --- | --- | --- |
| Ingresos propios | ${money(b.ingresos_propios)} | ${money(a.ingresos_propios)} |
| **Gasto real** | **${money(b.gasto_real)}** | **${money(a.gasto_real)}** |
${cats.map((c) => `| ${c} | ${money(de(b, c))} | ${money(de(a, c))} |`).join('\n')}
| Ahorro | ${money(b.ahorro)} | ${money(a.ahorro)} |

${dif > 0 ? `Este mes llevas **${money(dif)} más** de gasto que el mes pasado a estas alturas.` : dif < 0 ? `Este mes llevas **${money(-dif)} menos** de gasto que el mes pasado a estas alturas. ¡Bien!` : 'Vas igual que el mes pasado.'}` });
    return;
  }

  const enCat = t.match(/(?:gaste|gastado|llevo|pague|se me fue)\s+(?:\w+\s+)?en\s+([a-z ]+?)(?:\s+(?:en|este|el|de|del|la)\b|\?|$)/);
  if (enCat && !/^(que|total)/.test(enCat[1])) {
    const palabra = enCat[1].trim();
    const [desde, hasta, nombre] = periodoDe(t, ctx.hoy);
    const cat = CLAVES_CAT.find(([re]) => re.test(palabra))?.[1];
    const cats = ejecutar('listar_categorias', { tipo: 'salida' }).categorias;
    const porNombre = cats.find((c) => n(c.nombre).includes(palabra) || palabra.includes(n(c.nombre)))?.id;
    const categoria = porNombre ?? (cats.some((c) => c.id === cat) ? cat : undefined);
    alEvento({ t: 'herramienta', nombre: 'buscar_movimientos' });
    await espera(400);
    let r = ejecutar('buscar_movimientos', { desde, hasta, tipo: 'salida', ...(categoria ? { categoria } : { texto: palabra }) });
    if (!r.total && categoria) r = ejecutar('buscar_movimientos', { desde, hasta, tipo: 'salida', texto: palabra });
    const total = r.movimientos.reduce((s2, x) => s2 + x.monto, 0);
    alEvento({ t: 'texto', md: r.total
      ? `En ${nombre} gastaste **${money(total)}** en ${palabra} (${r.total} movimiento${r.total === 1 ? '' : 's'}):\n\n| Fecha | Concepto | Monto |\n| --- | --- | --- |\n${r.movimientos.slice(0, 8).map((x) => `| ${x.fecha.slice(8)}/${x.fecha.slice(5, 7)} | ${x.nota || x.categoria} | ${money(x.monto)} |`).join('\n')}${r.total > 8 ? `\n\nY ${r.total - 8} más.` : ''}`
      : `No encontré gastos de "${palabra}" en ${nombre}. Prueba con otra palabra o con el nombre de la categoría.` });
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
- "¿Cómo voy de ahorro este año?"
- "¿Cuánto gasté en comida en octubre?"
- "¿Cómo voy contra el mes pasado?"
- "¿Cómo voy con mis presupuestos?"
- "Me pagaron 8,500 por transferencia"` });
}
