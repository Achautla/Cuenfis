import { describe, it, expect } from 'vitest';
import { leerRss, leerGobMx, leerFuente, limpiarTexto, sinRepetir, filasDesde, fechaMx, recortar, FUENTES_RSS, HERRAMIENTA_CLASIFICAR } from '../supabase/functions/_shared/rss.js';

const F = { id: 'x', nombre: 'El Medio', oficial: false };

const RSS = `<?xml version="1.0"?><rss><channel>
<item><title><![CDATA[Banxico baja la tasa a 6.75%]]></title><link>https://medio.mx/a</link>
<description><![CDATA[<p>La Junta de Gobierno &amp; el <b>consenso</b>&#8230;</p>]]></description><pubDate>Fri, 27 Nov 2026 14:19:14 -0600</pubDate></item>
<item><title>Nota sin enlace seguro</title><link>http://medio.mx/b</link></item>
<item><title>SAT amplía plazo - SAT</title><link>https://news.google.com/rss/articles/abc</link><source url="https://www.gob.mx">SAT</source><pubDate>Thu, 26 Nov 2026 10:00:00 GMT</pubDate></item>
</channel></rss>`;

describe('noticias automáticas: RSS', () => {
  it('lee título, enlace, extracto y fecha; descarta enlaces no https', () => {
    const n = leerRss(RSS, F);
    expect(n).toHaveLength(2);
    expect(n[0]).toMatchObject({ titulo: 'Banxico baja la tasa a 6.75%', enlace: 'https://medio.mx/a', fecha: '2026-11-27', fuente: 'El Medio', oficial: false });
    expect(n[0].extracto).toBe('La Junta de Gobierno & el consenso…');
    expect(n[1].titulo).toBe('SAT amplía plazo'); // sin el " - SAT" de Google Noticias
  });
  it('limpia HTML escapado dos veces y entidades', () => {
    expect(limpiarTexto('&lt;p&gt;Hola &amp;amp; adiós&lt;/p&gt;')).toBe('Hola & adiós');
    expect(limpiarTexto('<script>x</script>texto')).toBe('x texto');
  });
  it('fecha en hora de México y fechas inválidas', () => {
    expect(fechaMx('Sat, 28 Nov 2026 03:00:00 GMT')).toBe('2026-11-27');
    expect(fechaMx('no es fecha')).toBeNull();
  });
  it('recorta en palabra', () => {
    const r = recortar('uno dos tres cuatro cinco seis siete', 20);
    expect(r.length).toBeLessThanOrEqual(20);
    expect(r.endsWith('…')).toBe(true);
  });
  it('quita repetidas por enlace y por título casi igual', () => {
    const notas = [
      { titulo: 'Banxico recorta la tasa de interés a 6.75%', enlace: 'https://a.mx/1' },
      { titulo: 'Banxico recorta la tasa de interés a 6.75 %', enlace: 'https://b.mx/2' },
      { titulo: 'Otra nota distinta sobre el SAT', enlace: 'https://a.mx/3' },
    ];
    expect(sinRepetir(notas, new Set(['https://a.mx/3'])).map((n) => n.enlace)).toEqual(['https://a.mx/1']);
  });
  it('todas las fuentes son https', () => {
    expect(FUENTES_RSS.every((f) => f.url.startsWith('https://'))).toBe(true);
    expect(FUENTES_RSS.some((f) => f.oficial)).toBe(true);
    expect(HERRAMIENTA_CLASIFICAR.input_schema.properties.notas.items.required).toContain('resumen');
  });
});

describe('noticias automáticas: sala de prensa de gob.mx', () => {
  const pagina = String.raw`$("#prensa").append("<div class='row'>  <div class=\"col-md-4\">\n    <article>\n      <img alt=\"Comunicado SAT 064-2026\" />\n      <time datetime=\"2026-11-23 10:46:00\">23 de noviembre de 2026<\/time>\n      <h2>Oficina Móvil del SAT cierra noviembre con visitas a 42 municipios<\/h2>\n        <a class=\"small-link\" href=\"/sat/prensa/oficina-movil-del-sat?idiom=es\" target=\"_blank\">Continuar leyendo<\/a>\n    <\/article>\n  <\/div><article><h2>Sin enlace<\/h2><\/article>");`;
  it('saca título, fecha y enlace de cada comunicado', () => {
    const f = { id: 'sat', nombre: 'SAT', tipo: 'gobmx', oficial: true };
    const n = leerGobMx(pagina, f);
    expect(n).toEqual([{ titulo: 'Oficina Móvil del SAT cierra noviembre con visitas a 42 municipios', enlace: 'https://www.gob.mx/sat/prensa/oficina-movil-del-sat?idiom=es', extracto: '', fecha: '2026-11-23', fuente: 'SAT', oficial: true }]);
    expect(leerFuente(pagina, f)).toHaveLength(1);
    expect(leerFuente(pagina, { nombre: 'X' })).toHaveLength(0); // como RSS no hay items
  });
});

describe('noticias automáticas: lo que devuelve la IA', () => {
  const notas = [
    { titulo: 'Banxico baja la tasa', enlace: 'https://a.mx/1', fecha: '2026-11-27', fuente: 'Banxico', oficial: true },
    { titulo: 'Detienen a operador', enlace: 'https://a.mx/2', fecha: '2026-11-27', fuente: 'Medio', oficial: false },
  ];
  it('publica las relevantes y guarda ocultas las demás', () => {
    const f = filasDesde(notas, [
      { i: 0, relevante: true, temas: ['credito', 'inventado', 'credito'], regimenes: ['resico', 'x'], resumen: 'Los créditos podrían abaratarse en los próximos meses.' },
      { i: 1, relevante: false, temas: [], regimenes: [], resumen: '' },
      { i: 0, relevante: true, temas: ['ahorro'], regimenes: [], resumen: 'Repetida, se ignora.' },
      { i: 9, relevante: true, temas: ['ahorro'], regimenes: [], resumen: 'No existe esta nota.' },
    ]);
    expect(f).toHaveLength(2);
    expect(f[0]).toMatchObject({ publicada: true, automatica: true, oficial: true, temas: ['credito'], regimenes: ['resico'], enlace: 'https://a.mx/1' });
    expect(f[1].publicada).toBe(false);
    expect(f[1].resumen.length).toBeGreaterThanOrEqual(10);
  });
  it('no publica sin temas ni con resumen vacío; tolera basura', () => {
    expect(filasDesde(notas, [{ i: 0, relevante: true, temas: [], regimenes: [], resumen: 'Algo relevante pero sin tema.' }])[0].publicada).toBe(false);
    expect(filasDesde(notas, [{ i: 0, relevante: true, temas: ['ahorro'], regimenes: [], resumen: '<b></b>' }])[0].publicada).toBe(false);
    expect(filasDesde(notas, null)).toEqual([]);
    expect(filasDesde(notas, [null, 'x', { i: '0' }])).toEqual([]);
  });
  it('quita etiquetas del resumen', () => {
    expect(filasDesde(notas, [{ i: 0, relevante: true, temas: ['ahorro'], regimenes: [], resumen: '<img src=x onerror=alert(1)>Sube la tasa de los pagarés.' }])[0].resumen).toBe('Sube la tasa de los pagarés.');
  });
});
