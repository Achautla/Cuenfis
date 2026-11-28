import { getFoto } from '../data/store.js';
import { TIPOS_CUENTA } from '../data/catalogo.js';
import { vigenteEnRango } from '../core/regimen.js';
import { icon } from '../ui/icons.js';
import { esc, money, nombreMes, countTo, $ } from '../ui/dom.js';
import { leyenda } from '../ui/fuente.js';
import '../styles/views/balance.css';

export function render(main) {
  const foto = getFoto();
  const b = foto.balance;
  const activos = foto.cuentas.filter((c) => !c.esDeuda);
  const deudas = foto.cuentas.filter((c) => c.esDeuda);
  const extraPagada = (m) => Math.max(0, Math.round((m.totalPagar - (Number(m.declaracion?.monto) || 0)) * 100) / 100);
  const pendientes = Object.values(foto.meses).filter((m) => !m.futuro && (m.estado !== 'pagada' ? m.totalPagar > 0 : extraPagada(m) > 1)).sort((x, y) => x.clave.localeCompare(y.clave));
  const tuvoResico = Object.keys(foto.meses).length > 0;
  const y = +foto.hoy.slice(0, 4);
  // Anual de sueldos: el ejercicio que se presenta en el próximo abril
  const anioAnual = +foto.hoy.slice(5, 7) <= 4 ? y - 1 : y;
  const an = vigenteEnRango(foto.perfil, 'sueldos', `${anioAnual}-01-01`, `${anioAnual}-12-31`) ? foto.anual(anioAnual) : null;
  const total = Math.max(1, b.tengo + b.debo);

  const fila = (ico, nombre, sub, monto, cls = '') => `<li><span class="b-ico">${icon(ico)}</span><span><b>${esc(nombre)}</b>${sub ? `<span class="small muted" style="display:block">${sub}</span>` : ''}</span><span class="num ${cls}">${money(monto)}</span></li>`;

  main.innerHTML = `<section class="view balance">
    <div class="page-head"><div><h1>Balance</h1><p class="sub">Lo que tienes, lo que debes y lo que de verdad puedes gastar.</p></div></div>

    <div class="card bal-sum">
      <div class="bal-eq">
        <div><span>Tengo</span><b class="num">${money(b.tengo)}</b></div><span class="op">−</span>
        <div><span>Debo</span><b class="num">${money(b.debo)}</b></div><span class="op">=</span>
        <div class="res"><span>Disponible real</span><b class="num ${b.disponible < 0 ? 'neg' : ''}" id="balDisp">${money(b.disponible)}</b></div>
      </div>
      <div class="bal-bar" role="img" aria-label="Proporción de lo que tienes contra lo que debes"><i class="t" style="--w:${b.tengo / total * 100}%"></i><i class="d" style="--w:${Math.max(0, b.debo) / total * 100}%"></i></div>
    </div>

    <div class="grid-2">
      <div class="card">
        <div class="card-head"><h2>Lo que tengo</h2><span class="spacer"></span><b class="num">${money(b.tengo)}</b></div>
        <ul class="b-list">${activos.map((c) => fila(TIPOS_CUENTA[c.tipo]?.icono ?? 'wallet', c.nombre, esc(TIPOS_CUENTA[c.tipo]?.nombre ?? ''), c.saldo, c.saldo < 0 ? 'neg' : '')).join('') || '<li class="muted">Sin cuentas.</li>'}</ul>
      </div>
      <div class="card">
        <div class="card-head"><h2>Lo que debo</h2><span class="spacer"></span><b class="num">${money(b.debo)}</b></div>
        <ul class="b-list">
          ${deudas.map((c) => fila(TIPOS_CUENTA[c.tipo]?.icono ?? 'credit-card', c.nombre, esc(TIPOS_CUENTA[c.tipo]?.nombre ?? ''), c.saldo)).join('')}
          ${pendientes.map((m) => fila('landmark', `SAT · ${nombreMes(m.clave)}`, m.estado === 'pagada' ? 'Cambió después de pagarla: quizá debas presentar una complementaria' : `ISR ${money(m.isrCargo)} · IVA ${money(m.ivaCargo)}${m.estado === 'presentada' ? ' · presentada, falta pagar' : ''}${m.futuro ? '' : m.cerrado ? '' : ' · mes en curso'}`, m.estado === 'pagada' ? extraPagada(m) : m.totalPagar)).join('')}
          ${!deudas.length && !pendientes.length ? '<li class="muted">No debes nada. Muy bien.</li>' : ''}
          ${b.favorIva ? fila('check-circle', 'Saldo a favor de IVA (aparte)', 'No es dinero disponible: se descuenta de tu IVA de los próximos meses o puedes pedir su devolución.', b.favorIva, 'pos') : ''}
        </ul>
        ${pendientes.length ? `<a class="btn sm" href="#/declaracion" style="margin-top:12px">${icon('file')}Ir a Mi declaración</a>` : ''}
      </div>
    </div>

    ${tuvoResico ? `<div class="card">
      <div class="card-head"><h2>${icon('landmark')} Bolsa SAT</h2></div>
      <p class="small muted" style="margin-bottom:12px">Cada cobro aparta solo su ISR y su IVA en esta bolsa. Se vacía cuando marcas la declaración del mes como pagada.</p>
      <div class="table-wrap"><table><thead><tr><th>Mes</th><th class="n">Cobrado sin IVA</th><th class="n">ISR</th><th class="n">IVA</th><th class="n">Total</th><th>Estado</th></tr></thead><tbody>
        ${Object.values(foto.meses).filter((m) => !m.futuro).sort((x, y) => y.clave.localeCompare(x.clave)).slice(0, 12).map((m) => `<tr><td>${esc(nombreMes(m.clave))}</td><td class="n num">${money(m.total)}</td><td class="n num">${money(m.isrCargo)}</td><td class="n num">${money(m.ivaCargo)}</td><td class="n num"><b>${money(m.totalPagar)}</b></td>
          <td>${{ pendiente: '<span class="chip warn">Por pagar</span>', presentada: '<span class="chip info">Presentada</span>', pagada: '<span class="chip ok">Pagada</span>' }[m.estado]}</td></tr>`).join('')}
      </tbody></table></div></div>` : ''}

    ${an && (an.aCargo || an.aFavor) ? `<div class="notice ${an.aCargo ? 'warn' : ''}">${icon(an.aCargo ? 'alert' : 'info')}<span><b>Anual ${an.anio} de sueldos: ${an.aCargo ? `a cargo estimado ${money(an.aCargo)}` : `saldo a favor estimado ${money(an.aFavor)}`}.</b>No se suma a "Debo" hasta que presentes la anual en abril. Revísala en Mi declaración.</span></div>` : ''}
    <p class="disclaimer">Cálculos estimados con ${esc(leyenda(+getFoto().hoy.slice(0, 4)))}. No sustituyen la asesoría de un contador.</p>
  </section>`;
  const el = $('#balDisp', main); el.dataset.v = 0; countTo(el, b.disponible);
}
