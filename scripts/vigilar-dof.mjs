// Vigilante del DOF: busca en los sumarios de los últimos días publicaciones que pueden cambiar
// las reglas fiscales de Cuenfis (RMF, Anexo 8, UMA, reformas fiscales, subsidio para el empleo).
// Si encuentra algo, abre un aviso (issue) en GitHub para que una persona lo revise.
// Nunca cambia reglas por sí mismo: cada cambio fiscal se revisa a mano (docs/reglas-fiscales.md).
//
// Uso: node scripts/vigilar-dof.mjs [días=7]
// En GitHub Actions usa GITHUB_TOKEN y GITHUB_REPOSITORY para abrir el aviso.

export const CLAVES = [
  'resolucion miscelanea fiscal', 'anexo 8', 'unidad de medida y actualizacion', 'ley del impuesto sobre la renta',
  'impuesto sobre la renta', 'impuesto al valor agregado', 'subsidio para el empleo', 'ley de ingresos de la federacion',
  'codigo fiscal de la federacion', 'estimulos fiscales', 'regimen simplificado de confianza', 'paquete economico',
];

const normal = (t) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
const ENT = { '&nbsp;': ' ', '&amp;': '&', '&quot;': '"', '&#39;': "'", '&lt;': '<', '&gt;': '>' };
const texto = (h) => h.replace(/&[a-z#0-9]+;/gi, (e) => ENT[e.toLowerCase()] ?? ' ');

/** Títulos del sumario que mencionan algo fiscal relevante (sin repetir). */
export function buscarPublicaciones(html) {
  const sinScripts = html.replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ');
  const trozos = sinScripts.split(/<[^>]+>/).map((t) => texto(t).replace(/\s+/g, ' ').trim()).filter((t) => t.length >= 25 && t.length <= 700);
  const vistos = new Set();
  return trozos.filter((t) => {
    const n = normal(t);
    if (vistos.has(n) || !CLAVES.some((c) => n.includes(c))) return false;
    vistos.add(n);
    return true;
  });
}

/** Fechas (AAAA-MM-DD) de los últimos `dias` días en la Ciudad de México. */
export function ultimosDias(dias, ahora = new Date()) {
  const hoy = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mexico_City' }).format(ahora);
  const base = new Date(`${hoy}T12:00:00Z`);
  return Array.from({ length: dias }, (_, i) => new Date(base.getTime() - i * 864e5).toISOString().slice(0, 10));
}

const urlSumario = (f, ed) => {
  const [y, m, d] = f.split('-');
  return `https://www.dof.gob.mx/index.php?year=${y}&month=${m}&day=${d}${ed ? `&edicion=${ed}` : ''}`;
};

async function leer(url) {
  const r = await fetch(url, { headers: { 'User-Agent': 'cuenfis-vigilante-reglas' }, signal: AbortSignal.timeout(30000) });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.text();
}

async function abrirAviso(fecha, encontrados) {
  const { GITHUB_TOKEN: token, GITHUB_REPOSITORY: repo } = process.env;
  if (!token || !repo) return 'sin token: solo se reporta';
  const api = (ruta, opts = {}) => fetch(`https://api.github.com/repos/${repo}${ruta}`, {
    ...opts, headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' },
  });
  const titulo = `Reglas fiscales: revisar el DOF del ${fecha}`;
  const existentes = await (await api('/issues?labels=reglas-fiscales&state=all&per_page=100')).json();
  if (Array.isArray(existentes) && existentes.some((i) => i.title === titulo)) return 'ya existía el aviso';
  const cuerpo = [
    `El vigilante encontró en el Diario Oficial del ${fecha} publicaciones que pueden cambiar las reglas fiscales de Cuenfis:`, '',
    ...encontrados.map((t) => `- ${t}`), '',
    `Sumario: ${urlSumario(fecha)}`, '',
    'Qué hacer (ver docs/reglas-fiscales.md):',
    '1. Leer la publicación y decidir si cambia algún dato de src/core/params.',
    '2. Si cambia, actualizar o crear el archivo del año con su fuente y agregar pruebas con un ejemplo calculado a mano.',
    '3. Para que llegue sin publicar otra versión de la app, publicar el año en la tabla reglas_fiscales con una revisión mayor.',
    '4. Si no cambia nada, cerrar este aviso.',
  ].join('\n');
  const r = await api('/issues', { method: 'POST', body: JSON.stringify({ title: titulo, body: cuerpo, labels: ['reglas-fiscales'] }) });
  return r.ok ? 'aviso abierto' : `no se pudo abrir el aviso (HTTP ${r.status})`;
}

async function main() {
  const dias = Number(process.argv[2] ?? 7);
  const informe = [];
  let fallas = 0;
  for (const fecha of ultimosDias(dias)) {
    const encontrados = [];
    for (const ed of ['', 'VES']) {
      try { encontrados.push(...buscarPublicaciones(await leer(urlSumario(fecha, ed)))); }
      catch (e) { if (!ed) { fallas++; informe.push(`${fecha}: no se pudo leer el sumario (${e.message})`); } }
    }
    const unicos = [...new Set(encontrados)];
    if (unicos.length) informe.push(`${fecha}: ${unicos.length} publicación(es). ${await abrirAviso(fecha, unicos)}`);
  }
  const resumen = [`# Vigilante de reglas fiscales`, '', ...(informe.length ? informe.map((l) => `- ${l}`) : ['Sin publicaciones fiscales relevantes en los últimos días.'])].join('\n');
  console.log(resumen);
  if (process.env.GITHUB_STEP_SUMMARY) { const { appendFileSync } = await import('node:fs'); appendFileSync(process.env.GITHUB_STEP_SUMMARY, resumen + '\n'); }
  if (fallas === dias) { console.error('No se pudo leer ningún sumario del DOF.'); process.exit(1); }
}

if (import.meta.url === `file://${process.argv[1]}`) main();
