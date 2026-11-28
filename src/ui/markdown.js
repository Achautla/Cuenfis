// Markdown mínimo y seguro para las respuestas del asistente.
// Primero se escapa todo el texto; después solo se agregan las etiquetas que conocemos.
// Admite: párrafos, **negritas**, *cursivas*, `código`, listas, tablas, títulos y enlaces https.
import { esc } from './dom.js';

function enLinea(t) {
  // Los enlaces se apartan primero para que las negritas o cursivas no se metan en su dirección
  const enlaces = [];
  const conMarcas = esc(t).replace(/\[([^\]]+)\]\((https:\/\/[^\s)"'<>]+)\)/g, (_, txt, url) => `\u0000${enlaces.push([txt, url]) - 1}\u0000`);
  const formato = (s) => s
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
    .replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<i>$2</i>');
  return formato(conMarcas).replace(/\u0000(\d+)\u0000/g, (_, i) => `<a href="${enlaces[i][1]}" target="_blank" rel="noopener noreferrer">${formato(enlaces[i][0])}</a>`);
}

const celdas = (fila) => fila.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
const esSeparador = (l) => /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?\s*$/.test(l);
const pareceNumero = (c) => /^[-−]?\s*\$?\s*[\d,.]+\s*%?$/.test(c.replace(/<\/?b>/g, ''));

function tabla(lineas) {
  const cab = celdas(lineas[0]);
  const filas = lineas.slice(2).map(celdas);
  const num = cab.map((_, i) => filas.length > 0 && filas.every((f) => !f[i] || pareceNumero(enLinea(f[i]))));
  const td = (c, i, tag) => `<${tag}${num[i] ? ' class="n"' : ''}>${enLinea(c ?? '')}</${tag}>`;
  return `<div class="table-wrap"><table><thead><tr>${cab.map((c, i) => td(c, i, 'th')).join('')}</tr></thead>`
    + `<tbody>${filas.map((f) => `<tr>${cab.map((_, i) => td(f[i], i, 'td')).join('')}</tr>`).join('')}</tbody></table></div>`;
}

/** Convierte Markdown a HTML seguro. */
export function markdown(md) {
  const ls = String(md ?? '').replace(/\r/g, '').split('\n');
  const out = [];
  for (let i = 0; i < ls.length;) {
    const l = ls[i];
    if (!l.trim()) { i++; continue; }
    if (l.includes('|') && esSeparador(ls[i + 1] ?? '')) {
      const bloque = [l, ls[i + 1]];
      i += 2;
      while (i < ls.length && ls[i].includes('|') && ls[i].trim()) bloque.push(ls[i++]);
      out.push(tabla(bloque));
      continue;
    }
    const h = l.match(/^(#{1,4})\s+(.*)$/);
    if (h) { out.push(`<p class="md-h">${enLinea(h[2])}</p>`); i++; continue; }
    if (/^\s*([-*•]|\d+[.)])\s+/.test(l)) {
      const ord = /^\s*\d/.test(l);
      const items = [];
      while (i < ls.length && /^\s*([-*•]|\d+[.)])\s+/.test(ls[i])) items.push(ls[i++].replace(/^\s*([-*•]|\d+[.)])\s+/, ''));
      out.push(`<${ord ? 'ol' : 'ul'}>${items.map((x) => `<li>${enLinea(x)}</li>`).join('')}</${ord ? 'ol' : 'ul'}>`);
      continue;
    }
    const par = [];
    while (i < ls.length && ls[i].trim() && !(ls[i].includes('|') && esSeparador(ls[i + 1] ?? '')) && !/^\s*([-*•]|\d+[.)])\s+/.test(ls[i]) && !/^#{1,4}\s/.test(ls[i])) par.push(ls[i++]);
    out.push(`<p>${par.map(enLinea).join('<br>')}</p>`);
  }
  return out.join('');
}
