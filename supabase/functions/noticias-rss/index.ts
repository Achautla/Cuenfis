// Noticias automáticas de Cuenfis (prueba con fuentes gratuitas).
// La llama pg_cron cada 4 horas con una clave interna. Lee RSS de medios y comunicados oficiales,
// descarta lo ya visto, y la IA (Haiku) elige lo que sirve a las finanzas personales, le pone temas
// y escribe un resumen propio de una o dos frases. Se publica título, resumen y enlace a la fuente.
import { createClient } from 'npm:@supabase/supabase-js@2';
import Anthropic from 'npm:@anthropic-ai/sdk@^0.136.0';
import { FUENTES_RSS, leerFuente, sinRepetir, filasDesde, HERRAMIENTA_CLASIFICAR, INSTRUCCIONES_CLASIFICAR } from '../_shared/rss.js';

const MODELO = Deno.env.get('MODELO_NOTICIAS') ?? 'claude-haiku-5-5';
const MAX_POR_FUENTE = 15;
const MAX_POR_CORRIDA = 60;
const LOTE = 30;
const DIAS = 3; // solo notas recientes
const DIAS_OFICIAL = 10; // los comunicados oficiales salen con menos frecuencia
const CONSERVAR_DIAS = 45;
// USD por millón de tokens (Haiku), solo para llevar la cuenta en noticias_corridas
const PRECIO = { entrada: Number(Deno.env.get('PRECIO_ENTRADA_NOTICIAS') ?? 0.10), salida: Number(Deno.env.get('PRECIO_SALIDA_NOTICIAS') ?? 0.50) };

function llave(clasica: string, nueva: string) {
  const v = Deno.env.get(clasica);
  if (v) return v;
  try { const j = JSON.parse(Deno.env.get(nueva) ?? '{}'); return j.default ?? Object.values(j)[0] as string; } catch { return ''; }
}

const json = (c: unknown, s = 200) => new Response(JSON.stringify(c), { status: s, headers: { 'Content-Type': 'application/json' } });

function iguales(a: string, b: string) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

async function traer(f: typeof FUENTES_RSS[number]) {
  try {
    const r = await fetch(f.url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CuenfisNoticias/1.0)', Accept: 'application/rss+xml, application/xml, text/xml, text/html' }, signal: AbortSignal.timeout(15000) });
    if (!r.ok) return { id: f.id, estado: r.status, notas: [] };
    const notas = leerFuente(await r.text(), f).slice(0, MAX_POR_FUENTE);
    return { id: f.id, estado: 200, notas };
  } catch (e) {
    return { id: f.id, estado: 0, error: String((e as Error)?.name ?? 'error'), notas: [] };
  }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'metodo' }, 405);
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, llave('SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SECRET_KEYS'), { auth: { persistSession: false } });

  // Solo la tarea programada conoce la clave (vive en una tabla que la app no puede leer)
  const { data: aj } = await admin.from('ajustes_servidor').select('valor').eq('clave', 'noticias_cron').maybeSingle();
  const dada = req.headers.get('x-cuenfis-cron') ?? '';
  if (!aj?.valor || !iguales(dada, aj.valor)) return json({ error: 'no_autorizado' }, 401);

  const inicio = Date.now();
  const resultados = await Promise.all(FUENTES_RSS.map(traer));
  const desde = (d: number) => new Date(Date.now() - d * 864e5).toISOString().slice(0, 10);
  const limite = desde(DIAS), limiteOficial = desde(DIAS_OFICIAL);
  const todas = resultados.flatMap((r) => r.notas).filter((n) => !n.fecha || n.fecha >= (n.oficial ? limiteOficial : limite));

  // Lo ya guardado (publicado u oculto) no se vuelve a clasificar
  const enlaces = todas.map((n) => n.enlace);
  const vistos = new Set<string>();
  for (let i = 0; i < enlaces.length; i += 100) {
    const { data } = await admin.from('noticias').select('enlace').in('enlace', enlaces.slice(i, i + 100));
    data?.forEach((x) => vistos.add(x.enlace));
  }
  // Primero las oficiales, luego por fecha
  const nuevas = sinRepetir(todas, vistos).sort((a, b) => Number(b.oficial) - Number(a.oficial) || String(b.fecha).localeCompare(String(a.fecha))).slice(0, MAX_POR_CORRIDA);

  let costoUsd = 0, publicadas = 0, guardadas = 0;
  const errores: string[] = [];
  const ia = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') });
  for (let i = 0; i < nuevas.length; i += LOTE) {
    const lote = nuevas.slice(i, i + LOTE);
    const texto = lote.map((n, k) => `[${k}] ${n.fuente} | ${n.titulo}${n.extracto ? `\n${n.extracto}` : ''}`).join('\n\n');
    try {
      const r = await ia.messages.create({
        model: MODELO, max_tokens: 6000,
        system: INSTRUCCIONES_CLASIFICAR,
        tools: [HERRAMIENTA_CLASIFICAR as never],
        tool_choice: { type: 'tool', name: HERRAMIENTA_CLASIFICAR.name },
        messages: [{ role: 'user', content: `Notas:\n\n${texto}` }],
      });
      costoUsd += ((r.usage.input_tokens ?? 0) * PRECIO.entrada + (r.usage.output_tokens ?? 0) * PRECIO.salida) / 1e6;
      const uso = r.content.find((b) => b.type === 'tool_use') as { input?: { notas?: unknown[] } } | undefined;
      const filas = filasDesde(lote, uso?.input?.notas ?? []);
      if (filas.length) {
        const { error } = await admin.from('noticias').upsert(filas, { onConflict: 'enlace', ignoreDuplicates: true });
        if (error) errores.push(`guardar: ${error.message}`);
        else { guardadas += filas.length; publicadas += filas.filter((f) => f.publicada).length; }
      }
    } catch (e) {
      errores.push(`ia: ${(e as { status?: number })?.status ?? (e as Error)?.message}`);
    }
  }

  // Limpieza: lo automático viejo ya no se muestra
  const viejo = new Date(Date.now() - CONSERVAR_DIAS * 864e5).toISOString().slice(0, 10);
  await admin.from('noticias').delete().eq('automatica', true).lt('fecha', viejo);

  const fuentes = Object.fromEntries(resultados.map((r) => [r.id, r.estado === 200 ? r.notas.length : `falla ${r.estado}${'error' in r ? ` ${r.error}` : ''}`]));
  const resumen = { fuentes, candidatas: nuevas.length, guardadas, publicadas, costo_usd: Number(costoUsd.toFixed(5)), errores, ms: Date.now() - inicio };
  await admin.from('noticias_corridas').insert({ detalle: resumen });
  return json(resumen);
});
