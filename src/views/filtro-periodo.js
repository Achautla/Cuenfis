// Filtro de periodo compartido por Movimientos e Indicadores.
import { rangoMes, ym } from '../core/motor.js';
import { esc } from '../ui/dom.js';

const estadoFiltros = {};

export function filtroHTML(id, hoy, extra = '') {
  const f = estadoFiltros[id] ??= { p: 'mes', a: '', b: '' };
  return `<div class="filters" data-filtro="${id}">
    <label class="field"><span>Periodo</span><select data-k="p">
      ${[['mes', 'Este mes'], ['mesAnt', 'Mes anterior'], ['anio', `Este año (${hoy.slice(0, 4)})`], ['todo', 'Todo'], ['rango', 'Rango personalizado']].map(([v, t]) => `<option value="${v}" ${f.p === v ? 'selected' : ''}>${esc(t)}</option>`).join('')}
    </select></label>
    <label class="field" ${f.p === 'rango' ? '' : 'hidden'}><span>Desde</span><input type="date" data-k="a" value="${esc(f.a)}" /></label>
    <label class="field" ${f.p === 'rango' ? '' : 'hidden'}><span>Hasta</span><input type="date" data-k="b" value="${esc(f.b)}" /></label>
    ${extra}
  </div>`;
}

export function rango(id, hoy) {
  const f = estadoFiltros[id] ?? { p: 'mes' };
  const k = ym(hoy);
  if (f.p === 'mes') return rangoMes(k);
  if (f.p === 'mesAnt') { const [y, m] = k.split('-').map(Number); const d = new Date(Date.UTC(y, m - 2, 1)); return rangoMes(d.toISOString().slice(0, 7)); }
  if (f.p === 'anio') return [`${k.slice(0, 4)}-01-01`, `${k.slice(0, 4)}-12-31`];
  if (f.p === 'rango') return [f.a || '0000-01-01', f.b || '9999-12-31'];
  return ['0000-01-01', '9999-12-31'];
}

export function enlazar(root, id, onChange) {
  root.querySelector(`[data-filtro="${id}"]`).addEventListener('change', (e) => {
    const k = e.target.dataset.k; if (!k) return;
    estadoFiltros[id][k] = e.target.value;
    onChange();
  });
}
