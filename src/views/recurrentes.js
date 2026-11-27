import { getEstado, getFoto, aplicar } from '../data/store.js';
import { CATEGORIAS, categoria, PAGADORES } from '../data/catalogo.js';
import { categoriasDisponibles } from '../core/regimen.js';
import { pendientesRecurrentes, proximaOcurrencia } from '../core/agenda.js';
import { guardarRecurrente, borrarRecurrente, confirmarRecurrente, omitirRecurrente, nuevoId } from '../data/acciones.js';
import { icon } from '../ui/icons.js';
import { $, esc, money, fechaLarga, fechaCorta, toast } from '../ui/dom.js';
import '../styles/views/recurrentes.css';

const FREC = { mensual: 'Cada mes', quincenal: 'Cada quincena', semanal: 'Cada semana' };
let editando = null;

const descFrec = (r) => r.frecuencia === 'mensual' ? `Cada mes, el día ${r.dia}` : r.frecuencia === 'quincenal' ? 'Días 15 y último de cada mes' : 'Cada semana';

function formulario(estado, foto, r) {
  const p = r?.plantilla ?? { tipo: 'salida', cuenta: estado.cuentas.find((c) => c.tipo === 'debito')?.id ?? estado.cuentas[0]?.id, formaPago: 'transferencia', pagador: 'pf' };
  const cats = (t) => categoriasDisponibles(foto.perfil, foto.hoy, t, CATEGORIAS, p.categoria).filter((c) => c.clase !== 'impuestos');
  return `<form id="fRec" class="card">
    <div class="card-head"><h2>${r ? 'Editar recurrente' : 'Nuevo recurrente'}</h2>${r ? `<span class="spacer"></span><button type="button" class="btn ghost sm" data-cancelar>Cancelar</button>` : ''}</div>
    <div class="rec-grid">
      <label class="field"><span>Nombre</span><input name="nombre" required maxlength="60" value="${esc(r?.nombre ?? '')}" placeholder="Renta, Netflix, nómina…" /></label>
      <label class="field"><span>Tipo</span><select name="tipo"><option value="salida" ${p.tipo === 'salida' ? 'selected' : ''}>Salida (pago)</option><option value="entrada" ${p.tipo === 'entrada' ? 'selected' : ''}>Entrada (cobro o nómina)</option></select></label>
      <label class="field"><span>Categoría</span><select name="categoria">${['salida', 'entrada'].map((t) => `<optgroup label="${t === 'salida' ? 'Salidas' : 'Entradas'}" data-tipo="${t}">${cats(t).map((c) => `<option value="${c.id}" ${c.id === p.categoria ? 'selected' : ''}>${esc(c.nombre)}</option>`).join('')}</optgroup>`).join('')}</select></label>
      <label class="field"><span>Monto aproximado</span><input name="monto" type="number" min="0.01" step="0.01" required value="${esc(p.monto ?? '')}" /></label>
      <label class="field"><span>Cuenta</span><select name="cuenta">${estado.cuentas.map((c) => `<option value="${esc(c.id)}" ${c.id === p.cuenta ? 'selected' : ''}>${esc(c.nombre)}</option>`).join('')}</select></label>
      <label class="field"><span>Frecuencia</span><select name="frecuencia">${Object.entries(FREC).map(([k, t]) => `<option value="${k}" ${r?.frecuencia === k ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
      <label class="field"><span>Primera fecha</span><input name="desde" type="date" required value="${esc(r?.desde ?? foto.hoy)}" /><span class="hint">En mensual se repite ese mismo día</span></label>
      <label class="field" data-solo="entrada"><span>¿Quién te paga?</span><select name="pagador">${Object.entries(PAGADORES).map(([k, t]) => `<option value="${k}" ${p.pagador === k ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
    </div>
    <button class="btn primary">${icon('check')}${r ? 'Guardar cambios' : 'Agregar recurrente'}</button>
  </form>`;
}

export function render(main) {
  const estado = getEstado();
  const foto = getFoto();
  const pend = pendientesRecurrentes(estado, foto.hoy);
  const recs = estado.recurrentes ?? [];
  const r = recs.find((x) => x.id === editando);
  const mensual = (x) => (x.plantilla.tipo === 'salida' ? -1 : 1) * x.plantilla.monto * ({ mensual: 1, quincenal: 2, semanal: 52 / 12 })[x.frecuencia];
  const activos = recs.filter((x) => !x.pausado);
  const fijosSal = -activos.filter((x) => x.plantilla.tipo === 'salida').reduce((s, x) => s + mensual(x), 0);
  const fijosEnt = activos.filter((x) => x.plantilla.tipo === 'entrada').reduce((s, x) => s + mensual(x), 0);

  main.innerHTML = `<section class="view recs">
    <div class="page-head"><div><h1>Recurrentes</h1><p class="sub">Lo que se repite: renta, nómina, suscripciones. Nada se registra sin que lo confirmes.</p></div></div>

    ${pend.length ? `<div class="card">
      <div class="card-head"><h2>${icon('clock')} Por confirmar</h2><span class="chip warn">${pend.length}</span></div>
      <ul class="rec-pend">${pend.map(({ rec, fecha }) => { const c = categoria(rec.plantilla.categoria); return `<li data-id="${esc(rec.id)}" data-fecha="${fecha}">
        <span class="avatar sm" style="background:${c.color}">${icon(c.icono)}</span>
        <span class="rp-main"><b>${esc(rec.nombre)}</b><span class="small muted">${esc(fechaLarga(fecha))} · ${esc(c.nombre)}</span></span>
        <label class="rp-monto"><span class="sr-only">Monto real</span><input type="number" step="0.01" min="0.01" value="${rec.plantilla.monto}" inputmode="decimal" /></label>
        <span class="row"><button class="btn sm ${rec.plantilla.tipo === 'entrada' ? 'in' : 'primary'}" data-ok>${icon('check')}Confirmar</button><button class="btn sm ghost" data-skip>Omitir</button></span>
      </li>`; }).join('')}</ul>
      <p class="small muted">Ajusta el monto si cambió (por ejemplo, una nómina con horas extra) antes de confirmar.</p>
    </div>` : ''}

    ${recs.length ? `<div class="card rec-sum"><div><span>Salidas fijas al mes</span><b class="num">${money(fijosSal)}</b></div><div><span>Entradas fijas al mes</span><b class="num pos">${money(fijosEnt)}</b></div><div><span>Diferencia</span><b class="num ${fijosEnt - fijosSal < 0 ? 'neg' : ''}">${money(fijosEnt - fijosSal)}</b></div></div>` : ''}

    <div class="card">
      <div class="card-head"><h2>Mis recurrentes</h2></div>
      ${recs.length ? `<ul class="rec-list">${recs.map((x) => { const c = categoria(x.plantilla.categoria); const prox = proximaOcurrencia(x, foto.hoy); return `<li class="${x.pausado ? 'off' : ''}" data-id="${esc(x.id)}">
        <span class="avatar sm" style="background:${c.color}">${icon(c.icono)}</span>
        <span class="rl-main"><b>${esc(x.nombre)}</b><span class="small muted">${esc(descFrec(x))}${x.pausado ? ' · en pausa' : prox ? ` · próxima: ${esc(fechaCorta(prox))}` : ''}</span></span>
        <span class="num ${x.plantilla.tipo === 'entrada' ? 'pos' : ''}">${x.plantilla.tipo === 'entrada' ? '+' : '−'}${money(x.plantilla.monto)}</span>
        <span class="row"><button class="btn ghost icon sm" data-edit aria-label="Editar">${icon('edit')}</button><button class="btn ghost sm" data-pausa>${x.pausado ? 'Reanudar' : 'Pausar'}</button><button class="btn ghost icon sm" data-del aria-label="Borrar">${icon('trash')}</button></span>
      </li>`; }).join('')}</ul>` : `<div class="empty">${icon('clock')}<p>Aún no tienes recurrentes. Agrega aquí tu renta o tus suscripciones, o elige "Repetir" al registrar un movimiento.</p></div>`}
    </div>
    ${formulario(estado, foto, r)}
  </section>`;

  const f = $('#fRec', main);
  const sync = () => {
    const t = f.tipo.value;
    f.querySelectorAll('optgroup').forEach((g) => { g.hidden = g.dataset.tipo !== t; g.disabled = g.dataset.tipo !== t; });
    if (f.categoria.selectedOptions[0]?.parentElement.dataset.tipo !== t) f.categoria.value = f.querySelector(`optgroup[data-tipo="${t}"] option`)?.value ?? '';
    const cat = categoria(f.categoria.value);
    f.querySelector('[data-solo="entrada"]').hidden = !(t === 'entrada' && cat.clase === 'ingreso' && cat.reg !== 'sueldos');
  };
  sync();
  f.tipo.onchange = sync; f.categoria.onchange = sync;
  f.onsubmit = (ev) => {
    ev.preventDefault();
    const d = new FormData(f);
    const cat = categoria(d.get('categoria'));
    const plantilla = { tipo: d.get('tipo'), categoria: d.get('categoria'), monto: Number(d.get('monto')), cuenta: d.get('cuenta'),
      formaPago: 'transferencia', nota: d.get('nombre').trim(), ...(cat.clase === 'ingreso' ? { cfdi: true, tasaIva: foto.perfil.frontera ? 0.08 : 0.16, pagador: d.get('pagador') } : {}) };
    if (!(plantilla.monto > 0)) { toast('Escribe un monto mayor a cero', icon('alert')); return; }
    const desde = d.get('desde');
    aplicar((s) => guardarRecurrente(s, { ...(r ?? { id: nuevoId() }), nombre: d.get('nombre').trim(), frecuencia: d.get('frecuencia'), dia: +desde.slice(8, 10), desde, plantilla }));
    editando = null;
    toast(r ? 'Recurrente actualizado' : 'Recurrente agregado', icon('check-circle'));
  };
  $('[data-cancelar]', main)?.addEventListener('click', () => { editando = null; render(main); });

  main.querySelectorAll('.rec-pend li').forEach((li) => {
    li.querySelector('[data-ok]').onclick = () => {
      const monto = Number(li.querySelector('input').value);
      if (!(monto > 0)) { toast('Escribe un monto mayor a cero', icon('alert')); return; }
      aplicar((s) => confirmarRecurrente(s, li.dataset.id, li.dataset.fecha, monto));
      toast('Movimiento registrado', icon('check-circle'));
    };
    li.querySelector('[data-skip]').onclick = () => { aplicar((s) => omitirRecurrente(s, li.dataset.id, li.dataset.fecha)); toast('Omitido esta vez'); };
  });
  main.querySelectorAll('.rec-list li').forEach((li) => {
    const id = li.dataset.id;
    li.querySelector('[data-edit]').onclick = () => { editando = id; render(main); $('#fRec', main).scrollIntoView({ behavior: 'smooth' }); };
    li.querySelector('[data-pausa]').onclick = () => { const x = recs.find((y) => y.id === id); aplicar((s) => guardarRecurrente(s, { id, pausado: !x.pausado })); };
    li.querySelector('[data-del]').onclick = () => { aplicar((s) => borrarRecurrente(s, id)); toast('Recurrente borrado. Sus movimientos ya registrados se quedan.', icon('trash')); };
  });
}
