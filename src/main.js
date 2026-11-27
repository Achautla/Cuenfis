import './styles/tokens.css';
import './styles/base.css';
import './styles/layout.css';
import './styles/components.css';

import { injectSprite, icon } from './ui/icons.js';
import { $, esc } from './ui/dom.js';
import { getEstado, suscribir } from './data/store.js';
import { regimenesEn, facturaPorActividad } from './core/regimen.js';
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
import * as deudas from './views/deudas.js';
import * as recurrentes from './views/recurrentes.js';
import * as metas from './views/metas.js';
import * as clientes from './views/clientes.js';
import * as cuenta from './views/cuenta.js';
import * as avisos from './views/avisos.js';
import * as reportes from './views/reportes.js';
import { abrirFormulario } from './views/movimiento-form.js';
import { arrancar as arrancarSync } from './data/sync.js';
import * as nube from './data/nube.js';
import { recordatorios } from './core/recordatorios.js';
import { revisar as revisarAvisos } from './ui/notificaciones.js';
import { getFoto } from './data/store.js';

// p: aparece en la barra inferior del celular; el resto va en "Más". g: grupo del menú. ver: cuándo se muestra.
const RUTAS = {
  inicio: { v: inicio, t: 'Inicio', i: 'home', p: 1, g: 'dinero' },
  avisos: { v: avisos, t: 'Avisos', i: 'bell', g: 'dinero' },
  movimientos: { v: movimientos, t: 'Movimientos', i: 'list', p: 1, g: 'dinero' },
  balance: { v: balance, t: 'Balance', i: 'scale', p: 1, g: 'dinero' },
  deudas: { v: deudas, t: 'Tarjetas y deudas', i: 'credit-card', g: 'dinero' },
  recurrentes: { v: recurrentes, t: 'Recurrentes', i: 'clock', g: 'dinero' },
  presupuestos: { v: presupuestos, t: 'Presupuestos', i: 'target', g: 'plan' },
  metas: { v: metas, t: 'Metas', i: 'piggy', g: 'plan' },
  indicadores: { v: indicadores, t: 'Indicadores', i: 'chart', g: 'plan' },
  declaracion: { v: declaracion, t: 'Mi declaración', c: 'Declaración', i: 'file', p: 1, g: 'sat' },
  clientes: { v: clientes, t: 'Clientes y cobros', i: 'receipt', g: 'sat', ver: (e) => facturaPorActividad(e.perfil, hoyISO()) || (e.facturas ?? []).length > 0 },
  reportes: { v: reportes, t: 'Reportes para contador', c: 'Reportes', i: 'printer', g: 'sat' },
  simulador: { v: simulador, t: 'Simulador', i: 'sparkle', g: 'sat' },
  aprende: { v: aprende, t: 'Aprende', i: 'book', g: 'mas' },
  cuenta: { v: cuenta, t: 'Cuenta y nube', i: 'cloud', g: 'mas' },
  ajustes: { v: ajustes, t: 'Ajustes', i: 'settings', g: 'mas' },
};
const GRUPOS = { dinero: 'Mi dinero', plan: 'Planear', sat: 'Impuestos', mas: 'App' };
const visibles = () => Object.entries(RUTAS).filter(([, r]) => !r.ver || r.ver(getEstado()));

function ruta() {
  const r = location.hash.replace(/^#\/?/, '').split('?')[0];
  return visibles().some(([k]) => k === r) ? r : 'inicio';
}

function pintarNav(actual) {
  const enMas = !RUTAS[actual].p;
  const nAvisos = recordatorios(getEstado(), getFoto()).filter((x) => x.nivel !== 'info').length;
  let g = null;
  $('#nav').innerHTML = visibles().map(([k, r]) => {
    const cab = r.g !== g ? `<span class="nav-g">${esc(GRUPOS[(g = r.g)])}</span>` : '';
    const badge = k === 'avisos' && nAvisos ? `<span class="badge" aria-label="${nAvisos} pendientes">${nAvisos}</span>` : '';
    return `${cab}<a href="#/${k}" class="${r.p ? 'pri' : 'sec'}" ${k === actual ? 'aria-current="page"' : ''}>${icon(r.i)}<span class="lbl-long">${esc(r.t)}</span><span class="lbl-short">${esc(r.c ?? r.t)}</span>${badge}</a>`;
  }).join('') +
    `<button type="button" class="mas" id="btnMas" ${enMas ? 'aria-current="page"' : ''} aria-haspopup="dialog">${icon('more')}<span class="lbl-short">Más</span>${nAvisos ? `<span class="badge">${nAvisos}</span>` : ''}</button>`;
  $('#btnMas').onclick = abrirMas;
}

function abrirMas() {
  const d = $('#dlg');
  d.onclick = null;
  d.innerHTML = `<div class="dlg-head"><h2>Más</h2><button type="button" class="btn ghost icon" data-x aria-label="Cerrar">${icon('x')}</button></div>
    <div class="dlg-body">${Object.entries(GRUPOS).map(([gk, gt]) => {
      const items = visibles().filter(([, r]) => !r.p && r.g === gk);
      const n = recordatorios(getEstado(), getFoto()).filter((x) => x.nivel !== 'info').length;
      return items.length ? `<p class="mas-g">${esc(gt)}</p><ul class="mas-list">${items.map(([k, r]) => `<li><a href="#/${k}">${icon(r.i)}<span>${esc(r.t)}</span>${k === 'avisos' && n ? `<span class="badge">${n}</span>` : ''}</a></li>`).join('')}</ul>` : '';
    }).join('')}</div>`;
  d.onclick = (ev) => { if (ev.target.closest('a') || ev.target.closest('[data-x]')) { d.onclick = null; d.close(); } };
  d.showModal();
}

function render() {
  const main = $('#main');
  const e = getEstado();
  if (!e.perfil) {
    document.querySelector('.sidebar').hidden = true;
    $('#fab').hidden = true;
    // Sin perfil solo se puede ver la bienvenida o iniciar sesión para traer tus datos
    if (location.hash.startsWith('#/cuenta')) cuenta.render(main); else bienvenida.render(main);
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

// Indicador de sincronización (solo con sesión)
function pintarSync(s) {
  const [txt, cls] = cuenta.textoFase(s.fase);
  for (const el of [$('#syncTop'), $('#syncSide')]) {
    el.hidden = !s.usuario;
    el.className = `sync-chip ${cls}`;
    el.title = txt;
    el.setAttribute('aria-label', `Nube: ${txt}`);
    el.innerHTML = `${icon('cloud')}<span>${esc(txt)}</span>`;
  }
  if (ruta() === 'cuenta' || location.hash.startsWith('#/cuenta')) render();
}
nube.alCambiar(pintarSync);
arrancarSync();
render();

// Avisos del dispositivo al abrir la app y al volver a ella
const avisar = () => revisarAvisos(getEstado(), getFoto()).catch(() => {});
setTimeout(avisar, 1500);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') avisar(); });

// Mantén a la vista qué regímenes están activos (accesible para estilos condicionales)
document.documentElement.dataset.regs = regimenesEn(getEstado().perfil, hoyISO()).join(' ');

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => navigator.serviceWorker.register(import.meta.env.BASE_URL + 'sw.js').catch(() => {}));
}
