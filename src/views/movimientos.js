import { getFoto } from '../data/store.js';
import { CATEGORIAS, categoria, FORMAS_PAGO } from '../data/catalogo.js';
import { periodo } from '../core/motor.js';
import { icon } from '../ui/icons.js';
import { $, esc, money, descargar } from '../ui/dom.js';
import { listaAgrupada } from './comun.js';
import { abrirFormulario } from './movimiento-form.js';
import { filtroHTML, rango, enlazar } from './filtro-periodo.js';
import '../styles/views/movimientos.css';

let tipo = '', cat = '', q = '';

export function render(main) {
  const foto = getFoto();
  const [a, b] = rango('movs', foto.hoy);
  const per = periodo(foto, a, b);
  const usadas = [...new Set(foto.movs.map((m) => m.categoria).filter(Boolean))];
  const ms = per.movs.filter((m) => (!tipo || m.tipo === tipo) && (!cat || m.categoria === cat) &&
    (!q || `${m.nota ?? ''} ${m.contraparte ?? ''} ${categoria(m.categoria).nombre}`.toLowerCase().includes(q.toLowerCase()))).reverse();

  const extra = `<label class="field"><span>Tipo</span><select data-loc="tipo"><option value="">Todos</option><option value="entrada" ${tipo === 'entrada' ? 'selected' : ''}>Entradas</option><option value="salida" ${tipo === 'salida' ? 'selected' : ''}>Salidas</option><option value="transferencia" ${tipo === 'transferencia' ? 'selected' : ''}>Transferencias</option></select></label>
    <label class="field"><span>Categoría</span><select data-loc="cat"><option value="">Todas</option>${CATEGORIAS.filter((c) => usadas.includes(c.id)).map((c) => `<option value="${c.id}" ${cat === c.id ? 'selected' : ''}>${esc(c.nombre)}</option>`).join('')}</select></label>
    <label class="field grow"><span>Buscar</span><input data-loc="q" type="search" value="${esc(q)}" placeholder="Nota, cliente o categoría" /></label>`;

  main.innerHTML = `<section class="view">
    <div class="page-head"><h1>Movimientos</h1><span class="spacer"></span>
      <button class="btn" id="csv">${icon('download')}Exportar a Excel</button>
      <button class="btn primary" id="nuevo">${icon('plus')}Registrar</button></div>
    <div class="card">${filtroHTML('movs', foto.hoy, extra)}
      <div class="sum-row">
        <div><span>Entró</span><b class="num pos">${money(per.entradas)}</b></div>
        <div><span>Salió</span><b class="num">${money(per.salidas)}</b></div>
        <div><span>Lo tuyo</span><b class="num">${money(per.propios)}</b></div>
        <div><span>Gastos reales</span><b class="num">${money(per.gastos)}</b></div>
      </div>
      ${listaAgrupada(ms, foto, 'No hay movimientos con estos filtros.')}
    </div></section>`;

  enlazar(main, 'movs', () => render(main));
  main.querySelectorAll('[data-loc]').forEach((el) => el.addEventListener(el.type === 'search' ? 'input' : 'change', () => {
    ({ tipo: () => (tipo = el.value), cat: () => (cat = el.value), q: () => (q = el.value) })[el.dataset.loc]();
    const pos = el.selectionStart; render(main);
    const nuevo = main.querySelector(`[data-loc="${el.dataset.loc}"]`); if (el.type === 'search') { nuevo.focus(); nuevo.setSelectionRange(pos, pos); }
  }));
  $('#nuevo', main).onclick = () => abrirFormulario({ tipo: 'entrada' });
  $('#csv', main).onclick = () => descargar(`cuenfis-movimientos-${a}-${b}.csv`.replace(/0000-01-01|9999-12-31/g, 'todo'), csv(ms, foto), 'text/csv;charset=utf-8');
}

function csv(ms, foto) {
  const cols = ['Fecha', 'Tipo', 'Categoría', 'Cuenta', 'Forma de pago', 'Monto', 'Subtotal', 'IVA', 'ISR retenido', 'IVA retenido', 'IVA acreditable', 'Es tuyo', 'Es del SAT', 'Gasto real', 'CFDI', 'UUID', 'Cliente/Proveedor', 'Nota'];
  const q = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const n = (v) => (Number(v) || 0).toFixed(2);
  const filas = [...ms].reverse().map((m) => [m.fecha, m.tipo, m.tipo === 'transferencia' ? 'Transferencia' : categoria(m.categoria).nombre,
    foto.cuentas.find((c) => c.id === m.cuenta)?.nombre, FORMAS_PAGO[m.formaPago] ?? '', n(m.monto), n(m.d.subtotal), n(m.d.iva), n(m.d.isrRet), n(m.d.ivaRet), n(m.d.ivaAcreditable),
    n(m.propio), n(m.delSat), n(m.gastoReal), m.cfdi ? 'Sí' : 'No', m.uuid, m.contraparte, m.nota].map(q).join(','));
  return '﻿' + [cols.map(q).join(','), ...filas].join('\r\n');
}
