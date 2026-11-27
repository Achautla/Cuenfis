import { getEstado, getFoto, aplicar } from '../data/store.js';
import { progresoMeta, fondoSugerido } from '../core/agenda.js';
import { guardarMeta, borrarMeta, nuevoId } from '../data/acciones.js';
import { periodo, rangoMes, ym } from '../core/motor.js';
import { icon } from '../ui/icons.js';
import { $, esc, money, pct, fechaLarga, toast } from '../ui/dom.js';
import '../styles/views/metas.css';

const ICONOS = { emergencia: 'lifebuoy', viaje: 'car', retiro: 'piggy', estudio: 'graduation', compra: 'gift', otra: 'target' };
const TIPOS = { emergencia: 'Fondo de emergencia', viaje: 'Viaje', retiro: 'Retiro', estudio: 'Estudios', compra: 'Compra grande', otra: 'Otra meta' };
let editando = null, abonando = null;

export function render(main) {
  const estado = getEstado();
  const foto = getFoto();
  const metas = estado.metas ?? [];
  const sugerido = fondoSugerido(foto);
  const tieneFondo = metas.some((m) => m.tipo === 'emergencia');
  const meta = Number(estado.preferencias?.metaAhorro) || 0;
  const [a, b] = rangoMes(ym(foto.hoy));
  const mes = periodo(foto, a, b);
  const progs = metas.map((m) => ({ m, p: progresoMeta(m, foto) }));
  const necesario = progs.reduce((s, { p }) => s + (p.porMes ?? 0), 0);
  const ahorro = foto.cuentas.filter((c) => ['ahorro', 'inversion'].includes(c.tipo));
  const e = metas.find((x) => x.id === editando);

  main.innerHTML = `<section class="view metas">
    <div class="page-head"><div><h1>Metas y apartados</h1><p class="sub">Ponle nombre y fecha a tu ahorro. Te decimos cuánto apartar cada mes.</p></div></div>

    <div class="card m-sum">
      <div><span>Ahorro de este mes</span><b class="num ${mes.ahorro < 0 ? 'neg' : ''}">${money(mes.ahorro)}</b><small>Lo tuyo menos tus gastos reales</small></div>
      <div><span>Necesitas apartar al mes</span><b class="num">${money(necesario)}</b><small>Para llegar a tiempo a tus metas con fecha</small></div>
      <form id="fMetaMes"><label class="field"><span>Meta de ahorro mensual</span><input name="metaAhorro" type="number" min="0" step="100" value="${esc(meta || '')}" placeholder="${necesario ? Math.ceil(necesario / 100) * 100 : ''}" /></label></form>
    </div>
    ${necesario && mes.ahorro < necesario && foto.hoy.slice(8) > '20' ? `<div class="notice warn">${icon('alert')}<span><b>Este mes vas ${money(necesario - Math.max(0, mes.ahorro))} abajo de lo que piden tus metas.</b>Revisa tus presupuestos o mueve la fecha de alguna meta.</span></div>` : ''}

    ${!tieneFondo && sugerido ? `<div class="card m-hint"><span class="m-ico">${icon('lifebuoy')}</span><span><b>Empieza por un fondo de emergencia</b><span class="small muted">Con tu gasto promedio, 6 meses son ${money(sugerido)}. Cubre imprevistos sin usar la tarjeta. Si trabajas por tu cuenta, es aún más importante.</span></span>
      <button class="btn primary sm" id="crearFondo">${icon('plus')}Crear</button></div>` : ''}

    <div class="m-grid">${progs.map(({ m, p }) => `<article class="card meta ${p.lograda ? 'lograda' : ''}" data-id="${esc(m.id)}">
      <div class="card-head"><span class="m-ico">${icon(ICONOS[m.tipo] ?? 'target')}</span><div><h2>${esc(m.nombre)}</h2><span class="small muted">${esc(TIPOS[m.tipo] ?? '')}${m.fecha ? ` · para el ${esc(fechaLarga(m.fecha))}` : ''}</span></div></div>
      <div class="m-ring" style="--p:${p.avance * 100}"><b class="num">${pct(p.avance)}</b></div>
      <p class="num m-cant"><b>${money(p.actual)}</b> de ${money(p.objetivo)}</p>
      <p class="small ${p.lograda ? 'pos' : 'muted'}">${p.lograda ? `${icon('check')} ¡Meta lograda!` : p.porMes ? `Aparta ${money(p.porMes)} al mes durante ${p.meses} ${p.meses === 1 ? 'mes' : 'meses'}.` : `Te faltan ${money(p.falta)}.`}</p>
      <p class="small muted">${p.cuenta ? `${icon('lock')} Ligada a ${esc(p.cuenta.nombre)}: avanza con su saldo.` : 'Abonos manuales.'}</p>
      ${abonando === m.id ? `<form class="row m-abono" data-abono><input name="v" type="number" step="0.01" required placeholder="Monto" aria-label="Monto a abonar" /><button class="btn sm primary">Abonar</button><button type="button" class="btn sm ghost" data-cerrar>Cancelar</button></form>` : ''}
      <div class="row m-acc">${!p.cuenta && !p.lograda && abonando !== m.id ? `<button class="btn sm" data-abonar>${icon('plus')}Abonar</button>` : ''}<span class="spacer"></span><button class="btn ghost icon sm" data-edit aria-label="Editar">${icon('edit')}</button><button class="btn ghost icon sm" data-del aria-label="Borrar">${icon('trash')}</button></div>
    </article>`).join('')}</div>
    ${!metas.length && !sugerido ? `<div class="card empty">${icon('target')}<p>Aún no tienes metas. Crea la primera abajo.</p></div>` : ''}

    <form class="card" id="fMeta">
      <div class="card-head"><h2>${e ? 'Editar meta' : 'Nueva meta'}</h2>${e ? '<span class="spacer"></span><button type="button" class="btn ghost sm" data-cancelar>Cancelar</button>' : ''}</div>
      <div class="m-form">
        <label class="field"><span>Nombre</span><input name="nombre" required maxlength="50" value="${esc(e?.nombre ?? '')}" placeholder="Viaje a Oaxaca" /></label>
        <label class="field"><span>Tipo</span><select name="tipo">${Object.entries(TIPOS).map(([k, t]) => `<option value="${k}" ${e?.tipo === k ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
        <label class="field"><span>Cuánto necesitas</span><input name="objetivo" type="number" min="1" step="100" required value="${esc(e?.objetivo ?? '')}" /></label>
        <label class="field"><span>Para cuándo (opcional)</span><input name="fecha" type="date" min="${foto.hoy}" value="${esc(e?.fecha ?? '')}" /></label>
        <label class="field"><span>¿Dónde lo guardas?</span><select name="cuenta"><option value="">Lo registro a mano</option>${ahorro.map((c) => `<option value="${esc(c.id)}" ${e?.cuenta === c.id ? 'selected' : ''}>${esc(c.nombre)} (${money(c.saldo)})</option>`).join('')}</select>
          <span class="hint">${ahorro.length ? 'Si la ligas a una cuenta de ahorro, avanza sola con su saldo.' : 'Agrega una cuenta de ahorro en Ajustes para que avance sola.'}</span></label>
        <label class="field"><span>Ya llevas (si es a mano)</span><input name="aportado" type="number" min="0" step="0.01" value="${esc(e?.aportado ?? '')}" /></label>
      </div>
      <button class="btn primary">${icon('check')}${e ? 'Guardar cambios' : 'Crear meta'}</button>
    </form>
    <div class="notice">${icon('book')}<span><b>¿Para el retiro?</b>Las aportaciones voluntarias a tu AFORE se pueden deducir en tu declaración anual (con tope). Regístralas como salida en la categoría "Ahorro para el retiro" si tu régimen presenta anual.</span></div>
  </section>`;

  $('#fMetaMes', main).addEventListener('change', (ev) => { aplicar((s) => ({ ...s, preferencias: { ...s.preferencias, metaAhorro: Number(ev.target.value) || 0 } })); toast('Meta mensual guardada', icon('check-circle')); });
  $('#fMetaMes', main).onsubmit = (ev) => ev.preventDefault();
  $('#crearFondo', main)?.addEventListener('click', () => {
    const cta = ahorro[0];
    aplicar((s) => guardarMeta(s, { id: nuevoId(), nombre: 'Fondo de emergencia', tipo: 'emergencia', objetivo: sugerido, cuenta: cta?.id }));
    toast('Fondo de emergencia creado', icon('lifebuoy'));
  });
  const f = $('#fMeta', main);
  f.onsubmit = (ev) => {
    ev.preventDefault();
    const d = new FormData(f);
    aplicar((s) => guardarMeta(s, { ...(e ?? { id: nuevoId() }), nombre: d.get('nombre').trim(), tipo: d.get('tipo'), objetivo: Number(d.get('objetivo')),
      fecha: d.get('fecha') || undefined, cuenta: d.get('cuenta') || undefined, aportado: Number(d.get('aportado')) || 0 }));
    editando = null;
    toast(e ? 'Meta actualizada' : 'Meta creada', icon('check-circle'));
  };
  $('[data-cancelar]', main)?.addEventListener('click', () => { editando = null; render(main); });
  main.querySelectorAll('.meta').forEach((card) => {
    const id = card.dataset.id, m = metas.find((x) => x.id === id);
    card.querySelector('[data-edit]').onclick = () => { editando = id; render(main); $('#fMeta', main).scrollIntoView({ behavior: 'smooth' }); };
    card.querySelector('[data-del]').onclick = () => { aplicar((s) => borrarMeta(s, id)); toast('Meta borrada', icon('trash')); };
    card.querySelector('[data-abonar]')?.addEventListener('click', () => { abonando = id; render(main); main.querySelector('[data-abono] input')?.focus(); });
    card.querySelector('[data-cerrar]')?.addEventListener('click', () => { abonando = null; render(main); });
    const fa = card.querySelector('[data-abono]');
    if (fa) fa.onsubmit = (ev) => { ev.preventDefault(); const v = Number(fa.v.value) || 0; abonando = null;
      aplicar((s) => guardarMeta(s, { id, aportado: Math.max(0, (Number(m.aportado) || 0) + v) })); toast(v >= 0 ? `Abonaste ${money(v)}` : `Retiraste ${money(-v)}`, icon('piggy')); };
  });
}
