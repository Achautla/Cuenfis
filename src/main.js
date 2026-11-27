import './styles/tokens.css';
import './styles/base.css';
import './styles/layout.css';
import './styles/components.css';

import { injectSprite, icon } from './ui/icons.js';
import { $, esc } from './ui/dom.js';
import { getEstado, suscribir } from './data/store.js';
import { regimenesEn } from './core/regimen.js';
import { hoyISO } from './ui/dom.js';
import * as inicio from './views/inicio.js';
import * as movimientos from './views/movimientos.js';
import * as indicadores from './views/indicadores.js';
import * as declaracion from './views/declaracion.js';
import * as aprende from './views/aprende.js';
import * as ajustes from './views/ajustes.js';
import * as bienvenida from './views/bienvenida.js';
import * as balance from './views/balance.js';
import * as presupuestos from './views/presupuestos.js';
import * as simulador from './views/simulador.js';
import { abrirFormulario } from './views/movimiento-form.js';

// p: aparece en la barra inferior del celular; el resto va en "Más".
const RUTAS = {
  inicio: { v: inicio, t: 'Inicio', i: 'home', p: 1 },
  movimientos: { v: movimientos, t: 'Movimientos', i: 'list', p: 1 },
  balance: { v: balance, t: 'Balance', i: 'scale', p: 1 },
  presupuestos: { v: presupuestos, t: 'Presupuestos', i: 'target' },
  indicadores: { v: indicadores, t: 'Indicadores', i: 'chart' },
  declaracion: { v: declaracion, t: 'Mi declaración', c: 'Declaración', i: 'file', p: 1 },
  simulador: { v: simulador, t: 'Simulador', i: 'sparkle' },
  aprende: { v: aprende, t: 'Aprende', i: 'book' },
  ajustes: { v: ajustes, t: 'Ajustes', i: 'settings' },
};

function ruta() {
  const r = location.hash.replace(/^#\/?/, '').split('?')[0];
  return RUTAS[r] ? r : 'inicio';
}

function pintarNav(actual) {
  const enMas = !RUTAS[actual].p;
  $('#nav').innerHTML = Object.entries(RUTAS).map(([k, r]) =>
    `<a href="#/${k}" class="${r.p ? 'pri' : 'sec'}" ${k === actual ? 'aria-current="page"' : ''}>${icon(r.i)}<span class="lbl-long">${esc(r.t)}</span><span class="lbl-short">${esc(r.c ?? r.t)}</span></a>`).join('') +
    `<button type="button" class="mas" id="btnMas" ${enMas ? 'aria-current="page"' : ''} aria-haspopup="dialog">${icon('more')}<span class="lbl-short">Más</span></button>`;
  $('#btnMas').onclick = abrirMas;
}

function abrirMas() {
  const d = $('#dlg');
  d.onclick = null;
  d.innerHTML = `<div class="dlg-head"><h2>Más</h2><button type="button" class="btn ghost icon" data-x aria-label="Cerrar">${icon('x')}</button></div>
    <div class="dlg-body"><ul class="mas-list">${Object.entries(RUTAS).filter(([, r]) => !r.p).map(([k, r]) =>
      `<li><a href="#/${k}">${icon(r.i)}<span>${esc(r.t)}</span></a></li>`).join('')}</ul></div>`;
  d.onclick = (ev) => { if (ev.target.closest('a') || ev.target.closest('[data-x]')) { d.onclick = null; d.close(); } };
  d.showModal();
}

function render() {
  const main = $('#main');
  const e = getEstado();
  if (!e.perfil) {
    document.querySelector('.sidebar').hidden = true;
    $('#fab').hidden = true;
    bienvenida.render(main);
    return;
  }
  document.querySelector('.sidebar').hidden = false;
  const r = ruta();
  pintarNav(r);
  $('#fab').hidden = false;
  document.title = `${RUTAS[r].t} · Cuenfis`;
  RUTAS[r].v.render(main);
}

injectSprite();
window.addEventListener('hashchange', () => { render(); $('#main').focus({ preventScroll: true }); window.scrollTo(0, 0); });
suscribir(render);
$('#fab').onclick = () => abrirFormulario({ tipo: 'entrada' });
render();

// Mantén a la vista qué regímenes están activos (accesible para estilos condicionales)
document.documentElement.dataset.regs = regimenesEn(getEstado().perfil, hoyISO()).join(' ');

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => navigator.serviceWorker.register(import.meta.env.BASE_URL + 'sw.js').catch(() => {}));
}
