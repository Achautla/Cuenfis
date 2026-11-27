import { getEstado, getFoto, aplicar, reemplazar, reiniciar } from '../data/store.js';
import { REGIMENES, TIPOS_CUENTA, categoria } from '../data/catalogo.js';
import { confirmar } from '../ui/confirmar.js';
import { nuevoId } from '../data/acciones.js';
import { datosDemo } from '../data/demo.js';
import { icon } from '../ui/icons.js';
import { $, esc, money, fechaLarga, toast, descargar, hoyISO } from '../ui/dom.js';
import '../styles/views/ajustes.css';


export function render(main) {
  const e = getEstado();
  const foto = getFoto();
  const p = e.perfil;
  const regs = [...(p.regimenes ?? [])].sort((a, b) => a.desde.localeCompare(b.desde));

  main.innerHTML = `<section class="view ajustes">
    <div class="page-head"><h1>Ajustes</h1></div>
    <div class="grid-2">
      <div class="card">
        <div class="card-head"><h2>Perfil fiscal</h2></div>
        <form id="fPerfil">
          <label class="field"><span>Nombre</span><input name="nombre" required value="${esc(p.nombre)}" autocomplete="name" /></label>
          <label class="field"><span>RFC (opcional)</span><input name="rfc" maxlength="13" value="${esc(p.rfc ?? '')}" style="text-transform:uppercase" /></label>
          <label class="check"><input type="checkbox" name="frontera" ${p.frontera ? 'checked' : ''}/><span>Vivo en región fronteriza norte o sur<small>Tus cobros usarán IVA del 8% por omisión.</small></span></label>
          <button class="btn primary">${icon('check')}Guardar perfil</button>
        </form>
      </div>
      <div class="card">
        <div class="card-head"><h2>Mis regímenes</h2></div>
        <p class="small muted" style="margin-bottom:10px">Cada movimiento usa el régimen vigente en su fecha. Si cambias de régimen, termina el anterior y agrega el nuevo.</p>
        <ul class="timeline">${regs.map((r, i) => `<li><span class="dot ${r.hasta && r.hasta < foto.hoy ? 'off' : ''}"></span><span><b>${esc(REGIMENES[r.reg]?.nombre)}</b><span class="small muted" style="display:block">Desde ${esc(fechaLarga(r.desde))}${r.hasta ? ` hasta ${esc(fechaLarga(r.hasta))}` : ' · vigente'}</span>
          ${REGIMENES[r.reg]?.calculo ? '' : '<span class="chip warn" style="margin-top:4px">Cálculo en fase posterior</span>'}</span>
          <span class="row">${r.hasta ? '' : `<input type="date" data-fin="${i}" aria-label="Fecha de fin" value="${foto.hoy}" /><button class="btn sm" data-terminar="${i}">Terminar</button>`}<button class="btn ghost icon sm" data-quitar="${i}" aria-label="Quitar">${icon('trash')}</button></span></li>`).join('')}</ul>
        <form id="fReg" class="row add-row">
          <select name="reg" aria-label="Régimen">${Object.entries(REGIMENES).map(([k, r]) => `<option value="${k}">${esc(r.corto)}</option>`).join('')}</select>
          <input type="date" name="desde" required value="${foto.hoy}" aria-label="Desde" />
          <button class="btn">${icon('plus')}Agregar</button>
        </form>
      </div>
    </div>

    <div class="card">
      <div class="card-head"><h2>Cuentas</h2></div>
      <p class="small muted" style="margin-bottom:10px">En una tarjeta de crédito o préstamo, el saldo es lo que debes: una compra lo aumenta y un pago lo baja. El límite, el día de corte y la tasa se capturan en <a href="#/deudas">Tarjetas y deudas</a>.</p>
      <div class="table-wrap"><table class="acc-table"><thead><tr><th>Nombre</th><th>Tipo</th><th class="n">Saldo inicial</th><th class="n">Saldo hoy</th><th></th></tr></thead><tbody>
      ${foto.cuentas.map((c) => { const usada = e.movimientos.some((m) => m.cuenta === c.id || m.cuentaDestino === c.id); return `<tr data-cta="${esc(c.id)}">
        <td><input name="nombre" value="${esc(c.nombre)}" aria-label="Nombre" /></td>
        <td><select name="tipo" aria-label="Tipo">${Object.entries(TIPOS_CUENTA).map(([k, t]) => `<option value="${k}" ${c.tipo === k ? 'selected' : ''}>${esc(t.nombre)}</option>`).join('')}</select></td>
        <td class="n"><input name="saldoInicial" type="number" step="0.01" value="${esc(c.saldoInicial)}" aria-label="Saldo inicial" /></td>
        <td class="n num">${money(c.saldo)}</td>
        <td>${usada ? '' : `<button class="btn ghost icon sm" data-borrar-cta aria-label="Borrar cuenta">${icon('trash')}</button>`}</td></tr>`; }).join('')}
      </tbody></table></div>
      <form id="fCta" class="row add-row">
        <input name="nombre" required placeholder="Nombre, p. ej. Nu o BBVA" aria-label="Nombre de la nueva cuenta" />
        <select name="tipo" aria-label="Tipo">${Object.entries(TIPOS_CUENTA).map(([k, t]) => `<option value="${k}">${esc(t.nombre)}</option>`).join('')}</select>
        <input name="saldoInicial" type="number" step="0.01" placeholder="Saldo inicial" aria-label="Saldo inicial" />
        <button class="btn">${icon('plus')}Agregar cuenta</button>
      </form>
    </div>

    <div>
      <div class="card">
        <div class="card-head"><h2>Tus datos</h2></div>
        <p class="small muted" style="margin-bottom:12px">${icon('lock')} Por ahora tus datos se guardan solo en este dispositivo. Descarga un respaldo de vez en cuando.</p>
        <div class="row">
          <button class="btn" id="exp">${icon('download')}Descargar respaldo</button>
          <label class="btn">${icon('upload')}Restaurar<input type="file" id="imp" accept="application/json" hidden /></label>
          <button class="btn" id="demo">${icon('sparkle')}Cargar datos de ejemplo</button>
          <button class="btn danger" id="borrar">${icon('trash')}Borrar todo</button>
        </div>
      </div>
    </div>
  </section>`;

  const editarPerfil = (fn) => aplicar((s) => ({ ...s, perfil: fn(s.perfil) }));
  $('#fPerfil', main).onsubmit = (ev) => { ev.preventDefault(); const f = new FormData(ev.target);
    editarPerfil((pp) => ({ ...pp, nombre: f.get('nombre').trim(), rfc: f.get('rfc').trim().toUpperCase(), frontera: f.has('frontera') })); toast('Perfil guardado', icon('check-circle')); };
  $('#fReg', main).onsubmit = (ev) => { ev.preventDefault(); const f = new FormData(ev.target);
    editarPerfil((pp) => ({ ...pp, regimenes: [...pp.regimenes, { reg: f.get('reg'), desde: f.get('desde') }] })); toast('Régimen agregado', icon('check-circle')); };
  // Movimientos que dependen de un régimen en un rango de fechas
  const movsDe = (reg, desde, hasta) => e.movimientos.filter((m) => categoria(m.categoria).reg === reg && m.fecha >= desde && (!hasta || m.fecha <= hasta)).length;
  main.querySelectorAll('[data-terminar]').forEach((b) => (b.onclick = async () => {
    const i = +b.dataset.terminar, fin = main.querySelector(`[data-fin="${i}"]`).value, r = regs[i];
    if (!fin || fin < r.desde) { toast('La fecha de fin debe ser posterior al inicio del régimen', icon('alert')); return; }
    const despues = e.movimientos.filter((m) => categoria(m.categoria).reg === r.reg && m.fecha > fin).length;
    const ok = await confirmar({ titulo: `¿Terminar ${REGIMENES[r.reg].corto} el ${fechaLarga(fin)}?`, accion: 'Terminar régimen',
      texto: 'Úsalo cuando presentaste tu aviso de baja o cambio ante el SAT.',
      efectos: [`Desde el día siguiente ya no verás categorías ni cálculos de ${REGIMENES[r.reg].corto}.`,
        ...(despues ? [`${despues} movimiento(s) con fecha posterior quedarán marcados como fuera de régimen y no se sumarán a tus declaraciones.`] : []),
        'Puedes deshacerlo quitando la fecha de fin con un régimen nuevo.'] });
    if (!ok) return;
    editarPerfil((pp) => ({ ...pp, regimenes: regs.map((x, j) => (j === i ? { ...x, hasta: fin } : x)) }));
    toast('Régimen terminado', icon('check-circle'));
  }));
  main.querySelectorAll('[data-quitar]').forEach((b) => (b.onclick = async () => {
    const r = regs[+b.dataset.quitar], n = movsDe(r.reg, r.desde, r.hasta);
    const ok = await confirmar({ titulo: `¿Quitar ${REGIMENES[r.reg].corto} de tus regímenes?`, accion: 'Quitar régimen',
      texto: 'Quitar no es lo mismo que terminar: es como si nunca lo hubieras tenido. Si dejaste el régimen, mejor usa "Terminar" con la fecha de baja.',
      efectos: [n ? `${n} movimiento(s) de ese régimen dejarán de sumarse a tus impuestos y declaraciones.` : 'No tienes movimientos registrados en ese régimen.',
        `Dejarás de ver sus categorías, declaraciones y consejos.`] });
    if (!ok) return;
    editarPerfil((pp) => ({ ...pp, regimenes: regs.filter((_, j) => j !== +b.dataset.quitar) }));
    toast('Régimen quitado', icon('trash'));
  }));

  main.querySelectorAll('tr[data-cta]').forEach((tr) => tr.addEventListener('change', async (ev) => {
    const id = tr.dataset.cta, k = ev.target.name, v = k === 'saldoInicial' ? Number(ev.target.value) || 0 : ev.target.value;
    const c = e.cuentas.find((x) => x.id === id);
    const usada = e.movimientos.filter((m) => m.cuenta === id || m.cuentaDestino === id).length;
    if (k === 'tipo' && usada && TIPOS_CUENTA[c.tipo]?.activo !== TIPOS_CUENTA[v]?.activo) {
      const ok = await confirmar({ titulo: `¿Cambiar ${c.nombre} a ${TIPOS_CUENTA[v].nombre}?`, accion: 'Cambiar tipo',
        texto: TIPOS_CUENTA[v].activo ? 'Pasará de ser una deuda a ser dinero que tienes.' : 'Pasará de ser dinero que tienes a ser una deuda.',
        efectos: [`Sus ${usada} movimiento(s) se recalculan con el sentido contrario: lo que antes sumaba, ahora resta.`, 'Cambian tu Balance y tu Disponible real.'] });
      if (!ok) { ev.target.value = c.tipo; return; }
    }
    if (k === 'saldoInicial' && usada && v !== Number(c.saldoInicial)) {
      const ok = await confirmar({ titulo: `¿Cambiar el saldo inicial de ${c.nombre}?`, accion: 'Cambiar saldo', peligro: false,
        texto: `De ${money(c.saldoInicial)} a ${money(v)}. Se recalcula el saldo de hoy y tu Disponible real; tus movimientos no cambian.` });
      if (!ok) { ev.target.value = c.saldoInicial; return; }
    }
    aplicar((s) => ({ ...s, cuentas: s.cuentas.map((x) => (x.id === id ? { ...x, [k]: v } : x)) }));
  }));
  main.querySelectorAll('[data-borrar-cta]').forEach((b) => (b.onclick = async () => {
    const id = b.closest('tr').dataset.cta, c = e.cuentas.find((x) => x.id === id);
    if (!(await confirmar({ titulo: `¿Borrar la cuenta ${c.nombre}?`, accion: 'Borrar cuenta', texto: 'No tiene movimientos, así que no cambia ningún cálculo. Recurrentes o metas ligadas a ella dejarán de tener cuenta.' }))) return;
    aplicar((s) => ({ ...s, cuentas: s.cuentas.filter((x) => x.id !== id) }));
    toast('Cuenta borrada', icon('trash'));
  }));
  $('#fCta', main).onsubmit = (ev) => { ev.preventDefault(); const f = new FormData(ev.target);
    aplicar((s) => ({ ...s, cuentas: [...s.cuentas, { id: nuevoId(), nombre: f.get('nombre').trim(), tipo: f.get('tipo'), saldoInicial: Number(f.get('saldoInicial')) || 0 }] })); toast('Cuenta agregada', icon('check-circle')); };

  $('#exp', main).onclick = () => descargar(`cuenfis-respaldo-${hoyISO()}.json`, JSON.stringify(getEstado(), null, 2), 'application/json');
  $('#imp', main).onchange = async (ev) => {
    let data;
    try { data = JSON.parse(await ev.target.files[0].text()); if (!data.perfil || !Array.isArray(data.movimientos)) throw new Error(); }
    catch { toast('No pudimos leer ese archivo. Elige un respaldo de Cuenfis (.json).', icon('alert')); ev.target.value = ''; return; }
    const ok = await confirmar({ titulo: '¿Restaurar este respaldo?', accion: 'Reemplazar mis datos',
      efectos: [`Trae ${data.movimientos.length} movimiento(s) de ${data.perfil.nombre || 'un perfil sin nombre'}.`, `Reemplaza todo lo que tienes ahora (${e.movimientos.length} movimiento(s)). Descarga antes un respaldo si lo quieres conservar.`] });
    ev.target.value = '';
    if (!ok) return;
    reemplazar(data); toast('Respaldo restaurado', icon('check-circle'));
  };
  $('#demo', main).onclick = async () => {
    if (e.movimientos.length && !(await confirmar({ titulo: '¿Cargar datos de ejemplo?', accion: 'Reemplazar con ejemplo',
      efectos: [`Tus ${e.movimientos.length} movimiento(s), cuentas y regímenes se reemplazan por datos ficticios.`, 'Descarga antes un respaldo si quieres conservarlos.'] }))) return;
    reemplazar(datosDemo(hoyISO())); location.hash = '#/inicio'; toast('Datos de ejemplo cargados', icon('sparkle'));
  };
  $('#borrar', main).onclick = async () => {
    const ok = await confirmar({ titulo: '¿Borrar todos tus datos?', accion: 'Borrar todo', escribir: 'BORRAR',
      efectos: [`Se borran ${e.movimientos.length} movimiento(s), tus cuentas, regímenes, metas, recurrentes y acuses de este dispositivo.`, 'No se puede deshacer. Descarga antes un respaldo si lo quieres conservar.'] });
    if (!ok) return;
    reiniciar(); location.hash = '#/inicio';
  };
}
