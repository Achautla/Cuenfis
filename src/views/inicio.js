import { getFoto, getEstado } from '../data/store.js';
import { periodo, rangoMes, ym, colchon } from '../core/motor.js';
import { vigente, vigenteEnRango } from '../core/regimen.js';
import { TIPOS_CUENTA } from '../data/catalogo.js';
import { icon } from '../ui/icons.js';
import { $, esc, money, pct, Mes, nombreMes, countTo, fechaCorta } from '../ui/dom.js';
import { listaAgrupada } from './comun.js';
import { estadoPresupuestos } from '../core/presupuestos.js';
import { categoria } from '../data/catalogo.js';
import { abrirFormulario } from './movimiento-form.js';
import { estadoTarjeta } from '../core/deudas.js';
import { pendientesRecurrentes, progresoMeta, resumenClientes } from '../core/agenda.js';
import { leyenda } from '../ui/fuente.js';
import '../styles/views/inicio.css';

function proximasFechas(foto) {
  const hoy = new Date(foto.hoy + 'T12:00:00');
  const out = [];
  const tieneMensual = vigente(foto.perfil, 'resico', foto.hoy) || Object.values(foto.meses).some((m) => m.estado !== 'pagada' && m.cerrado && m.totalPagar > 0);
  if (tieneMensual) {
    const lim = new Date(hoy.getFullYear(), hoy.getMonth() + (hoy.getDate() > 17 ? 1 : 0), 17);
    const mesDecl = new Date(lim.getFullYear(), lim.getMonth() - 1, 1);
    const clave = `${mesDecl.getFullYear()}-${String(mesDecl.getMonth() + 1).padStart(2, '0')}`;
    const m = foto.meses[clave];
    const hecha = m?.estado === 'presentada' && !m.totalPagar; // presentada en ceros: ya no hay nada que hacer
    out.push({ t: `Declaración mensual de ${Mes(mesDecl.getMonth()).toLowerCase()}`, s: m ? `ISR + IVA: ${money(m.totalPagar)}${m.estado === 'pagada' ? ' · pagada' : hecha ? ' · presentada en ceros' : ''}` : 'RESICO', f: lim, ok: m?.estado === 'pagada' || hecha });
  }
  const y = hoy.getFullYear();
  const anioAnual = hoy.getMonth() > 3 ? y : y - 1;
  const tuvoSueldos = vigenteEnRango(foto.perfil, 'sueldos', `${anioAnual}-01-01`, `${anioAnual}-12-31`) || vigenteEnRango(foto.perfil, 'sueldos', `${y}-01-01`, `${y}-12-31`);
  if (tuvoSueldos) {
    const an = foto.anual(hoy.getMonth() > 3 ? y : y - 1);
    out.push({ t: `Declaración anual ${an.anio}`, s: an.aFavor ? `Saldo a favor estimado ${money(an.aFavor)}` : an.aCargo ? `A cargo estimado ${money(an.aCargo)}` : 'Sueldos y salarios', f: new Date(an.anio + 1, 3, 30) });
  }
  for (const c of foto.cuentas.filter((x) => x.tipo === 'credito')) {
    const t = estadoTarjeta(foto, c);
    if (!t.configurada || t.saldoCorte <= 0) continue;
    out.push({ t: `Pago de ${c.nombre}`, s: t.cubierto ? 'Saldo del corte cubierto' : `Para no generar intereses: ${money(t.pagoSinIntereses)}`, f: new Date(t.limitePago + 'T12:00:00'), ok: t.cubierto, link: '#/deudas' });
  }
  out.sort((a, b) => a.f - b.f);
  return out.map((x) => {
    const dias = Math.ceil((x.f - hoy) / 864e5);
    return `<li class="date-item ${dias <= 7 && !x.ok ? 'soon' : ''}"><span class="cal"><b>${x.f.getDate()}</b>${esc(Mes(x.f.getMonth()).slice(0, 3))}</span>
      <span><b>${esc(x.t)}</b><span class="small muted" style="display:block">${esc(x.s)}</span></span>
      <span class="small ${dias <= 7 && !x.ok ? 'neg' : 'muted'} num">${x.ok ? icon('check') : dias === 0 ? 'Hoy' : `${dias} días`}</span></li>`;
  }).join('');
}

export function render(main) {
  const foto = getFoto();
  const estado = getEstado();
  const b = foto.balance;
  const k = ym(foto.hoy);
  const [a, z] = rangoMes(k);
  const mes = periodo(foto, a, z);
  const meta = Number(estado.preferencias?.metaAhorro) || 0;
  const conResico = vigente(foto.perfil, 'resico', foto.hoy) || b.bolsa > 0;
  const col = colchon(foto);
  const mesRes = foto.meses[k];
  const fechas = proximasFechas(foto);
  const pres = estadoPresupuestos(foto, estado.presupuestos ?? {}, k);
  const ultimos = [...foto.movs].reverse().slice(0, 6);
  const nombre = foto.perfil?.nombre?.split(' ')[0] ?? '';
  const pendRec = pendientesRecurrentes(estado, foto.hoy);
  const metasP = (estado.metas ?? []).map((m) => ({ m, p: progresoMeta(m, foto) })).filter(({ p }) => !p.lograda).slice(0, 3);
  const cxc = (estado.facturas ?? []).length ? resumenClientes(estado, foto.hoy) : null;

  main.innerHTML = `<section class="view inicio">
    <div class="page-head"><div><h1>Hola${nombre ? `, ${esc(nombre)}` : ''}</h1><p class="sub">${esc(nombreMes(k))}</p></div><span class="spacer"></span>
      <div class="row desk-actions"><button class="btn in" data-nuevo="entrada">${icon('arrow-down-left')}Entrada</button><button class="btn out" data-nuevo="salida">${icon('arrow-up-right')}Salida</button><button class="btn" data-nuevo="transferencia">${icon('swap')}Transferir</button></div></div>

    <div class="hero">
      <div class="hero-main">
        <p class="hero-label">Disponible real ${icon('info')}<span class="tooltip">Lo que de verdad puedes gastar: lo que tienes en tus cuentas menos lo que debes, incluidos los impuestos que ya generaste.</span></p>
        <p class="hero-amount num" id="heroDisp">${money(b.disponible)}</p>
        <p class="hero-formula num"><span>Tengo ${money(b.tengo)}</span><span>−</span><span>Debo ${money(b.debo)}</span><span>=</span><span>${money(b.disponible)}</span></p>
      </div>
      <div class="hero-side">
        <div><span>${icon('wallet')}En cuentas</span><b class="num">${money(b.tengo)}</b></div>
        <div><span>${icon('credit-card')}Tarjetas y préstamos</span><b class="num">${money(b.deudas)}</b></div>
        ${conResico ? `<div><span>${icon('landmark')}Bolsa SAT por pagar</span><b class="num">${money(b.bolsa)}</b></div>` : ''}
        ${b.favorIva ? `<div><span>${icon('check-circle')}Saldo a favor de IVA</span><b class="num">−${money(b.favorIva)}</b></div>` : ''}
      </div>
    </div>

    ${pendRec.length ? `<a class="notice action" href="#/recurrentes">${icon('clock')}<span><b>${pendRec.length === 1 ? `Confirma "${esc(pendRec[0].rec.nombre)}"` : `Tienes ${pendRec.length} movimientos recurrentes por confirmar`}</b>${pendRec.length === 1 ? `Tocaba el ${esc(fechaCorta(pendRec[0].fecha))} por ${money(pendRec[0].rec.plantilla.monto)}. Confírmalo para que tu saldo cuadre.` : `${esc(pendRec.slice(0, 3).map((x) => x.rec.nombre).join(', '))}. Revisa los montos y confírmalos para que tu saldo cuadre.`}</span></a>` : ''}
    ${cxc?.vencido ? `<a class="notice warn action" href="#/clientes">${icon('receipt')}<span><b>Te deben ${money(cxc.vencido)} de facturas vencidas.</b>Da seguimiento a tus clientes. Recuerda: para tus impuestos solo cuenta lo que ya cobraste.</span></a>` : ''}
    ${foto.avisos.filter((x) => x.nivel === 'alerta').slice(0, 3).map((x) => `<div class="notice warn">${icon('alert')}<span>${esc(x.texto)}</span></div>`).join('')}

    <div class="kpis">
      <div class="kpi"><span class="k-ico in">${icon('arrow-down-left')}</span><span class="k-lbl">Lo tuyo este mes</span><b class="num" id="kPropios">${money(mes.propios)}</b><small>${mes.delSat ? `Además entraron ${money(mes.delSat)} del SAT` : 'Ingresos sin IVA ni impuestos'}</small></div>
      <div class="kpi"><span class="k-ico out">${icon('arrow-up-right')}</span><span class="k-lbl">Gastos del mes</span><b class="num">${money(mes.gastos)}</b><small>Sin pagos al SAT ni transferencias</small></div>
      <div class="kpi"><span class="k-ico">${icon('piggy')}</span><span class="k-lbl">Ahorro del mes</span><b class="num ${mes.ahorro < 0 ? 'neg' : ''}">${money(mes.ahorro)}</b><small>${mes.propios ? `Tasa de ahorro ${pct(mes.tasaAhorro)}` : '—'}</small></div>
      <div class="kpi"><span class="k-ico">${icon('lifebuoy')}</span><span class="k-lbl">Colchón</span><b class="num">${col == null ? '—' : `${col.toFixed(1)} meses`}</b><small>Meses que cubres con tu disponible</small></div>
    </div>
    ${meta ? `<div class="card goal"><div class="row"><b>${icon('target')} Meta de ahorro mensual</b><span class="spacer"></span><span class="num small">${money(Math.max(0, mes.ahorro))} de ${money(meta)}</span></div><div class="progress"><i style="width:${Math.min(100, Math.max(0, mes.ahorro) / meta * 100)}%"></i></div></div>` : ''}

    ${metasP.length ? `<div class="card">
      <div class="card-head"><h2>Mis metas</h2><span class="spacer"></span><a class="link" href="#/metas">Ver todas</a></div>
      <ul class="pres-mini">${metasP.map(({ m, p }) => `<li class="ok"><span>${esc(m.nombre)}</span><span class="pm-track"><i style="width:${p.avance * 100}%"></i></span><span class="num small">${money(p.actual)} / ${money(p.objetivo)}</span></li>`).join('')}</ul>
    </div>` : ''}

    ${pres.filas.length ? `<div class="card">
      <div class="card-head"><h2>Presupuestos de ${esc(nombreMes(k).split(' ')[0].toLowerCase())}</h2><span class="spacer"></span><a class="link" href="#/presupuestos">Ver todos</a></div>
      <ul class="pres-mini">${pres.filas.slice(0, 4).map((f) => `<li class="${f.nivel}"><span>${esc(categoria(f.categoria).nombre)}</span><span class="pm-track"><i style="width:${Math.min(100, f.uso * 100)}%"></i></span><span class="num small">${money(f.gastado)} / ${money(f.limite)}</span></li>`).join('')}</ul>
    </div>` : ''}

    <div class="grid-2">
      <div class="card">
        <div class="card-head"><h2>Mis cuentas</h2><span class="spacer"></span><a class="link" href="#/ajustes">Administrar</a></div>
        <ul class="acc-list">${foto.cuentas.map((c) => {
          const ms = foto.movs.filter((m) => m.cuenta === c.id || m.cuentaDestino === c.id);
          const ent = ms.filter((m) => m.tipo === 'entrada').reduce((s, m) => s + m.monto, 0);
          const sal = ms.filter((m) => m.tipo === 'salida').reduce((s, m) => s + m.monto, 0);
          const trf = ms.filter((m) => m.tipo === 'transferencia').reduce((s, m) => s + (m.cuentaDestino === c.id ? m.monto : -m.monto), 0);
          return `<li><details><summary><span class="acc-ico">${icon(TIPOS_CUENTA[c.tipo]?.icono ?? 'wallet')}</span><span><b>${esc(c.nombre)}</b><span class="small muted" style="display:block">${esc(TIPOS_CUENTA[c.tipo]?.nombre ?? '')}${c.esDeuda ? ' · lo que debes' : ''}</span></span><span class="num ${c.esDeuda && c.saldo > 0 ? 'neg' : ''}">${money(c.saldo)}</span></summary>
            <p class="formula small num">${c.esDeuda
              ? `Deuda inicial ${money(c.saldoInicial)} + compras ${money(sal)} − pagos y abonos ${money(ent + trf)} = ${money(c.saldo)}`
              : `Saldo inicial ${money(c.saldoInicial)} + entradas ${money(ent)} − salidas ${money(sal)} ${trf >= 0 ? '+' : '−'} transferencias ${money(Math.abs(trf))} = ${money(c.saldo)}`}</p></details></li>`;
        }).join('')}</ul>
      </div>
      <div class="card">
        <div class="card-head"><h2>Próximas fechas</h2></div>
        ${fechas ? `<ul class="dates">${fechas}</ul>` : `<div class="empty">${icon('calendar')}<p>Sin fechas próximas para tu régimen.</p></div>`}
        ${conResico && mesRes ? `<div class="sat-strip"><span>${icon('landmark')}</span><span><b>Este mes llevas ${money(mesRes.totalPagar)} para el SAT</b><span class="small muted" style="display:block">ISR ${money(mesRes.isrCargo)} · IVA ${money(mesRes.ivaCargo)} · tasa RESICO ${pct(mesRes.tasa, 1)}</span></span><a class="btn sm" href="#/declaracion">Ver</a></div>` : ''}
      </div>
    </div>

    <div class="card">
      <div class="card-head"><h2>Últimos movimientos</h2><span class="spacer"></span><a class="link" href="#/movimientos">Ver todos</a></div>
      ${listaAgrupada(ultimos, foto, 'Aún no hay movimientos. Registra tu primera entrada o salida.')}
    </div>
    <p class="disclaimer">Cálculos estimados con ${esc(leyenda(+getFoto().hoy.slice(0, 4)))}. Confírmalos con el SAT o con un contador antes de declarar.</p>
  </section>`;

  const el = $('#heroDisp', main);
  el.dataset.v = 0;
  countTo(el, b.disponible);
  main.querySelectorAll('[data-nuevo]').forEach((x) => (x.onclick = () => abrirFormulario({ tipo: x.dataset.nuevo })));
}

