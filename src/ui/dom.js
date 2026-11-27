// Utilidades de DOM y formato.
export const $ = (s, el = document) => el.querySelector(s);
export const $$ = (s, el = document) => [...el.querySelectorAll(s)];

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const mx = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 });
const mx0 = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 });
export const money = (n) => mx.format(Number(n) || 0).replace('MX$', '$');
export const pesos = (n) => mx0.format(Math.round(Number(n) || 0)); // el portal del SAT pide pesos sin centavos
export const pct = (n, d = 0) => `${(n * 100).toFixed(d)}%`;

export const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
export const Mes = (i) => MESES[i][0].toUpperCase() + MESES[i].slice(1);
export const nombreMes = (clave) => `${Mes(+clave.slice(5, 7) - 1)} ${clave.slice(0, 4)}`;
export function fechaLarga(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} de ${MESES[m - 1]} de ${y}`;
}
export function fechaCorta(iso) {
  const [, m, d] = iso.split('-').map(Number);
  return `${d} ${MESES[m - 1].slice(0, 3)}`;
}
export function hoyISO() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

let toastTimer;
export function toast(texto, ico = '') {
  const t = $('#toast');
  t.innerHTML = `${ico}<span>${esc(texto)}</span>`;
  t.classList.add('on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('on'), 2600);
}

const reduce = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
/** Anima un número de su valor anterior al nuevo (sutil, 500 ms). */
export function countTo(el, valor, fmt = money) {
  const desde = Number(el.dataset.v ?? 0);
  el.dataset.v = valor;
  if (reduce() || desde === valor) { el.textContent = fmt(valor); return; }
  const t0 = performance.now(), dur = 500;
  const step = (t) => {
    const k = Math.min(1, (t - t0) / dur), e = 1 - (1 - k) ** 3;
    el.textContent = fmt(desde + (valor - desde) * e);
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

export function descargar(nombre, contenido, tipo = 'text/plain') {
  const url = URL.createObjectURL(new Blob([contenido], { type: tipo }));
  const a = Object.assign(document.createElement('a'), { href: url, download: nombre });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
