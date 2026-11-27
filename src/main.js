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
import { abrirFormulario } from './views/movimiento-form.js';

const RUTAS = {
  inicio: { v: inicio, t: 'Inicio', i: 'home' },
  movimientos: { v: movimientos, t: 'Movimientos', i: 'list' },
  indicadores: { v: indicadores, t: 'Indicadores', i: 'chart' },
  declaracion: { v: declaracion, t: 'Mi declaración', c: 'Declaración', i: 'file' },
  aprende: { v: aprende, t: 'Aprende', i: 'book' },
  ajustes: { v: ajustes, t: 'Ajustes', i: 'settings' },
};

function ruta() {
  const r = location.hash.replace(/^#\/?/, '').split('?')[0];
  return RUTAS[r] ? r : 'inicio';
}

function pintarNav(actual) {
  $('#nav').innerHTML = Object.entries(RUTAS).map(([k, r]) =>
    `<a href="#/${k}" ${k === actual ? 'aria-current="page"' : ''}>${icon(r.i)}<span class="lbl-long">${esc(r.t)}</span><span class="lbl-short">${esc(r.c ?? r.t)}</span></a>`).join('');
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
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
}
