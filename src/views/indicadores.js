import { getFoto } from '../data/store.js';
import { categoria } from '../data/catalogo.js';
import { periodo, colchon } from '../core/motor.js';
import { vigenteEnRango } from '../core/regimen.js';
import { icon } from '../ui/icons.js';
import { esc, money, pct, Mes } from '../ui/dom.js';
import { filtroHTML, rango, enlazar } from './filtro-periodo.js';
import { chipsFiscales } from './comun.js';
import '../styles/views/indicadores.css';

function barras(porMes) {
  const ks = Object.keys(porMes).sort();
  if (!ks.length) return `<div class="empty">${icon('chart')}<p>Sin datos en este periodo.</p></div>`;
  const max = Math.max(1, ...ks.flatMap((k) => [porMes[k].propios, porMes[k].gastos]));
  return `<div class="bars" role="img" aria-label="Lo tuyo contra gastos por mes">${ks.map((k, i) => {
    const p = porMes[k];
    return `<div class="bar-col" style="--d:${i * 40}ms" title="${esc(Mes(+k.slice(5) - 1))}: tuyo ${money(p.propios)}, gastos ${money(p.gastos)}">
      <div class="bar-pair"><i class="b-in" style="--h:${p.propios / max * 100}%"></i><i class="b-out" style="--h:${p.gastos / max * 100}%"></i></div>
      <span>${esc(Mes(+k.slice(5) - 1).slice(0, 3))}</span></div>`;
  }).join('')}</div><div class="legend"><span><i class="b-in"></i>Lo tuyo</span><span><i class="b-out"></i>Gastos reales</span></div>`;
}

function categorias(porCat) {
  const xs = Object.entries(porCat).sort((a, b) => b[1] - a[1]);
  if (!xs.length) return `<div class="empty">${icon('chart')}<p>Sin gastos en este periodo.</p></div>`;
  const tot = xs.reduce((s, x) => s + x[1], 0);
  return `<ul class="cat-bars">${xs.map(([c, v]) => { const cat = categoria(c); return `<li>
    <span class="avatar sm" style="background:${cat.color}">${icon(cat.icono)}</span>
    <span class="cb-main"><span class="cb-top"><span>${esc(cat.nombre)}</span><span class="num">${money(v)} <small class="muted">${pct(v / tot)}</small></span></span>
    <span class="cb-track"><i style="--w:${v / tot * 100}%;background:${cat.color}"></i></span></span></li>`; }).join('')}</ul>`;
}

export function render(main) {
  const foto = getFoto();
  const [a, b] = rango('ind', foto.hoy);
  const per = periodo(foto, a, b);
  const col = colchon(foto);
  const y = +foto.hoy.slice(0, 4);
  const conSueldos = vigenteEnRango(foto.perfil, 'sueldos', `${y}-01-01`, `${y}-12-31`);
  const an = conSueldos ? foto.anual(y) : null;
  const mesesRes = Object.values(foto.meses).filter((m) => m.clave >= a.slice(0, 7) && m.clave <= b.slice(0, 7));
  const satPeriodo = mesesRes.reduce((s, m) => s + m.totalPagar, 0);
  const salidas = per.movs.filter((m) => m.tipo === 'salida' && m.gastoReal);

  const kpis = [
    ['arrow-down-left', 'Lo tuyo', money(per.propios), 'Ingresos sin IVA ni ISR'],
    ['arrow-up-right', 'Gastos reales', money(per.gastos), 'Sin IVA que recuperas'],
    ['piggy', 'Ahorro', money(per.ahorro), per.propios ? `Tasa ${pct(per.tasaAhorro)}` : '—'],
    ['lifebuoy', 'Colchón', col == null ? '—' : `${col.toFixed(1)} meses`, 'Disponible ÷ gasto promedio'],
    mesesRes.length ? ['landmark', 'Impuestos del periodo', money(satPeriodo), `${mesesRes.length} declaración(es) RESICO`] : null,
    an ? ['heart', `Deducciones ${y}`, money(an.deducciones.total), `Te ahorran ${money(an.ahorroPorDeducciones)} de ISR`] : null,
    ['receipt', 'Gastos con factura', per.facturados == null ? '—' : pct(per.facturados), `${salidas.filter((m) => m.cfdi).length} de ${salidas.length}`],
  ].filter(Boolean);

  main.innerHTML = `<section class="view">
    <div class="page-head"><h1>Indicadores</h1></div>
    <div class="card">${filtroHTML('ind', foto.hoy)}</div>
    <div class="kpis ind">${kpis.map(([i, t, v, s]) => `<div class="kpi"><span class="k-ico">${icon(i)}</span><span class="k-lbl">${t}</span><b class="num">${v}</b><small>${esc(s)}</small></div>`).join('')}</div>
    <div class="grid-2">
      <div class="card"><div class="card-head"><h2>Lo tuyo contra tus gastos</h2></div>${barras(per.porMes)}</div>
      <div class="card"><div class="card-head"><h2>¿En qué se va tu dinero?</h2></div>${categorias(per.porCategoria)}</div>
    </div>
    <div class="card"><div class="card-head"><h2>Modo auditoría</h2><span class="spacer"></span><span class="small muted">${per.movs.length} movimientos</span></div>
      <p class="small muted" style="margin-bottom:10px">Cada movimiento del periodo con su desglose y su estado fiscal. Los totales de abajo son los mismos que ves en Inicio y en Mi declaración.</p>
      <div class="table-wrap"><table class="audit"><thead><tr><th>Fecha</th><th>Concepto</th><th>Estado fiscal</th><th class="n">Monto</th><th class="n">Subtotal</th><th class="n">IVA</th><th class="n">Retenido</th><th class="n">Tuyo</th><th class="n">Del SAT</th><th class="n">Gasto real</th></tr></thead>
      <tbody>${per.movs.map((m) => `<tr><td class="num">${esc(m.fecha)}</td><td>${esc(m.nota || m.contraparte || (m.tipo === 'transferencia' ? 'Transferencia' : categoria(m.categoria).nombre))}</td><td>${chipsFiscales(m)}</td>
        <td class="n num">${m.tipo === 'salida' ? '−' : ''}${money(m.monto)}</td><td class="n num">${money(m.d.subtotal)}</td><td class="n num">${money(m.d.iva)}</td><td class="n num">${money((m.d.isrRet || 0) + (m.d.ivaRet || 0))}</td>
        <td class="n num">${money(m.propio)}</td><td class="n num">${money(m.delSat)}</td><td class="n num">${money(m.gastoReal)}</td></tr>`).join('')}</tbody>
      <tfoot><tr><th colspan="7">Totales</th><th class="n num">${money(per.propios)}</th><th class="n num">${money(per.delSat)}</th><th class="n num">${money(per.gastos)}</th></tr></tfoot></table></div>
    </div>
    <p class="disclaimer">Cálculos estimados con reglas fiscales 2026. No sustituyen la asesoría de un contador.</p>
  </section>`;
  enlazar(main, 'ind', () => render(main));
}
