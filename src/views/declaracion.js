import { getFoto, getEstado, aplicar } from '../data/store.js';
import { marcarDeclaracion, guardarAcuse } from '../data/acciones.js';
import { REGIMENES } from '../data/catalogo.js';
import { params } from '../core/fiscal.js';
import { regimenesEnRango } from '../core/regimen.js';
import { icon } from '../ui/icons.js';
import { $, esc, money, pct, nombreMes, fechaLarga, toast } from '../ui/dom.js';
import { confirmar } from '../ui/confirmar.js';
import '../styles/views/declaracion.css';

let tab = null, mesSel = null, anioSel = null;

const F = (label, op, v, help = '', tot = false) => `<div class="f${tot ? ' tot' : ''}"><span>${tot ? `<b>${esc(label)}</b>` : esc(label)}${help ? `<small>${esc(help)}</small>` : ''}</span><span class="op">${op}</span><span class="v num">${typeof v === 'number' ? money(v).replace('$', '') : esc(v)}</span></div>`;

function limite(clave) {
  const [y, m] = clave.split('-').map(Number);
  const d = new Date(Date.UTC(y, m, 17));
  return fechaLarga(d.toISOString().slice(0, 10));
}

function estadoMes(m) {
  const cuentas = getEstado().cuentas.filter((c) => !['credito', 'prestamo'].includes(c.tipo)).sort((a, b) => (b.tipo === 'debito') - (a.tipo === 'debito'));
  const chip = { pendiente: '<span class="chip warn">Pendiente</span>', presentada: '<span class="chip info">Presentada</span>', pagada: '<span class="chip ok">Pagada</span>' }[m.estado];
  return `<div class="card estado"><div class="row"><b>Estado de ${esc(nombreMes(m.clave))}</b>${chip}<span class="spacer"></span><span class="small muted">Fecha límite: ${esc(limite(m.clave))}</span></div>
    <p class="small muted">Total a pagar: <b class="num">${money(m.totalPagar)}</b> (ISR ${money(m.isrCargo)} + IVA ${money(m.ivaCargo)}). Al marcarla pagada se registra una salida "Pago al SAT" y la bolsa SAT de Inicio baja.</p>
    <div class="row">
      ${m.estado !== 'pagada' ? `<label class="field inline"><span>Pagar desde</span><select id="ctaPago">${cuentas.map((c) => `<option value="${esc(c.id)}">${esc(c.nombre)}</option>`).join('')}</select></label>` : ''}
      ${m.estado === 'pendiente' ? `<button class="btn" data-est="presentada">${icon('file')}Marcar presentada</button>` : ''}
      ${m.estado !== 'pagada' ? `<button class="btn primary" data-est="pagada">${icon('check')}${m.totalPagar ? 'Marcar pagada' : 'Marcar presentada en ceros'}</button>` : `<button class="btn ghost" data-est="pendiente">Deshacer</button>`}
    </div>${m.estado !== 'pendiente' ? acuseHTML(m.clave) : ''}</div>`;
}

const MAX_ACUSE = 1.5 * 1024 * 1024;

function acuseHTML(clave) {
  const a = getEstado().declaraciones?.[clave]?.acuse ?? {};
  return `<div class="acuse">
    <p class="field-label">${icon('file')} Acuse de recibo</p>
    <div class="acuse-row">
      <label class="field"><span>Número de operación</span><input id="numOp" inputmode="numeric" maxlength="30" value="${esc(a.numOperacion ?? '')}" placeholder="Viene en tu acuse del SAT" /></label>
      <label class="field"><span>Línea de captura (opcional)</span><input id="lineaCap" maxlength="40" value="${esc(a.lineaCaptura ?? '')}" style="text-transform:uppercase" /></label>
    </div>
    <div class="row">
      ${a.archivo ? `<a class="btn sm" href="${a.archivo}" download="${esc(a.nombre ?? `acuse-${clave}`)}">${icon('download')}${esc(a.nombre ?? 'Descargar acuse')}</a><button class="btn ghost sm" id="quitarAcuse">${icon('trash')}Quitar archivo</button>`
        : `<label class="btn sm">${icon('upload')}Adjuntar PDF o foto<input type="file" id="fileAcuse" accept="application/pdf,image/*" hidden /></label><span class="small muted">Hasta 1.5 MB. Se guarda en este dispositivo.</span>`}
    </div></div>`;
}

function enlazarAcuse(main, clave) {
  const guardar = (cambios, msg) => { aplicar((s) => guardarAcuse(s, clave, cambios)); if (msg) toast(msg, icon('check-circle')); };
  $('#numOp', main)?.addEventListener('change', async (e) => {
    const antes = getEstado().declaraciones?.[clave]?.acuse?.numOperacion;
    const nuevo = e.target.value.trim();
    if (antes && antes !== nuevo && !(await confirmar({ titulo: nuevo ? '¿Reemplazar el número de operación?' : '¿Borrar el número de operación?', accion: nuevo ? 'Reemplazar' : 'Borrar', texto: `El guardado es ${antes}. Es tu comprobante ante el SAT.` }))) { e.target.value = antes; return; }
    guardar({ numOperacion: nuevo }, 'Número de operación guardado');
  });
  $('#lineaCap', main)?.addEventListener('change', (e) => guardar({ lineaCaptura: e.target.value.trim().toUpperCase() }, 'Línea de captura guardada'));
  $('#quitarAcuse', main)?.addEventListener('click', async () => {
    if (!(await confirmar({ titulo: '¿Quitar el archivo del acuse?', accion: 'Quitar archivo', texto: 'Se borra de este dispositivo. El número de operación se conserva. Si no tienes otra copia, puedes descargarla de nuevo del portal del SAT.' }))) return;
    guardar({ archivo: undefined, nombre: undefined }, 'Archivo quitado');
  });
  $('#fileAcuse', main)?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > MAX_ACUSE) { toast('El archivo pesa más de 1.5 MB. Prueba con el PDF del SAT o una foto más ligera.', icon('alert')); return; }
    const r = new FileReader();
    r.onload = () => {
      if (aplicar((s) => guardarAcuse(s, clave, { archivo: r.result, nombre: file.name, tipo: file.type, subido: new Date().toISOString() }))) toast('Acuse guardado', icon('check-circle'));
      else { aplicar((s) => guardarAcuse(s, clave, { archivo: undefined, nombre: undefined })); toast('No hay espacio en este dispositivo para el archivo. Guarda solo el número de operación.', icon('alert')); }
    };
    r.readAsDataURL(file);
  });
}

function isr(m) {
  const cobros = getFoto().movs.filter((x) => m.cobros.includes(x.id));
  const pm = cobros.filter((x) => x.pagador === 'pm').length;
  return `<div class="sat"><h3>ISR simplificado de confianza. Personas físicas · ${esc(nombreMes(m.clave))}</h3>
    <p class="tabn">Pestaña Ingresos</p>
    ${F('¿Los ingresos fueron obtenidos a través de copropiedad?', '', 'No', 'Elige No salvo que compartas el negocio o bien con alguien.')}
    ${F('Total de ingresos efectivamente cobrados', '', m.total, `${cobros.length} cobro(s) RESICO del mes, sin IVA. Compáralo con el prellenado del SAT.`)}
    ${F('Descuentos, devoluciones y bonificaciones', '(−)', 0, 'Notas de crédito que emitiste en el mes.')}
    ${F('Ingresos a disminuir', '(−)', 0, 'Solo si el prellenado incluye algo que no cobraste.')}
    ${F('Ingresos adicionales', '(+)', 0, 'Cobros sin factura o que no aparecen en el prellenado.')}
    ${F('Total de ingresos percibidos por la actividad', '(=)', m.total, 'Al capturar, detállalo por concepto (servicios profesionales, actividad empresarial, etc.).', true)}
    <p class="tabn">Pestaña Determinación</p>
    ${F('Tasa aplicable', '(×)', pct(m.tasa, 2), 'Tabla mensual del art. 113-E: se aplica a todo el ingreso del mes.')}
    ${F('ISR determinado', '(=)', m.isrDet)}
    ${F('ISR retenido por personas morales', '(−)', m.isrRet, pm ? `${pm} cobro(s) a empresas: 1.25% de su subtotal.` : 'Solo si te pagó una empresa.')}
    ${F('ISR a cargo', '(=)', m.isrCargo, m.isrFavor ? `Las retenciones superan el impuesto por ${money(m.isrFavor)}.` : '', true)}
    <p class="tabn">Pestaña Pago</p>
    ${F('¿Tienes compensaciones por aplicar?', '', 'No')}
    ${F('¿Tienes estímulos por aplicar?', '', 'No')}
    ${F('Cantidad a pagar', '(=)', m.isrCargo, `Fecha límite: ${limite(m.clave)}.`, true)}
  </div>
  <div class="notice">${icon('info')}<span>El pago mensual de RESICO es definitivo. Si en el mes no cobraste nada, presenta la declaración en ceros: omitir 3 o más meses en un año te saca del régimen (art. 113-I).</span></div>`;
}

function iva(m) {
  const foto = getFoto();
  const no = foto.movs.filter((x) => m.acredNo.includes(x.id));
  return `<div class="sat"><h3>IVA simplificado de confianza · ${esc(nombreMes(m.clave))}</h3>
    <p class="tabn">Pestaña Determinación</p>
    ${F('Actividades gravadas a la tasa del 16%', '', m.g16)}
    ${F('Actividades gravadas a la tasa del 8%', '', m.g8, 'Solo con el estímulo de región fronteriza.')}
    ${F('Actividades gravadas a la tasa del 0%, exentas o no objeto', '', m.g0)}
    ${F('Total de IVA a cargo', '(=)', m.ivaTrasladado, '', true)}
    ${F('IVA no cobrado por devoluciones, descuentos y bonificaciones', '(−)', 0)}
    ${F('IVA retenido', '(−)', m.ivaRet, 'Lo que te retuvieron las empresas (2/3 del IVA).')}
    ${F('IVA acreditable del periodo', '(−)', m.ivaAcred, 'Captura manual: IVA de gastos de tu actividad con CFDI y pago bancario (o efectivo hasta $2,000).')}
    ${F('IVA por devoluciones, descuentos y bonificaciones en gastos', '(+)', 0)}
    ${F(m.ivaNeto >= 0 ? 'Cantidad a cargo' : 'Saldo a favor', '(=)', Math.abs(m.ivaNeto), '', true)}
    ${F('Acreditamiento del saldo a favor de periodos anteriores', '(−)', m.favorAplicado, m.favorAnterior ? `Tenías ${money(m.favorAnterior)} a favor de meses anteriores.` : '')}
    ${F('Impuesto a cargo', '(=)', m.ivaCargo, m.favorSiguiente ? `Saldo a favor que pasa al siguiente mes: ${money(m.favorSiguiente)}.` : '', true)}
    <p class="tabn">Pestaña Pago</p>
    ${F('Cantidad a pagar', '(=)', m.ivaCargo, `Fecha límite: ${limite(m.clave)}.`, true)}
  </div>
  ${no.length ? `<div class="notice warn">${icon('alert')}<span><b>${no.length} gasto(s) de tu actividad no cuentan para el IVA.</b>${esc(no.map((x) => x.d.motivos[0]).filter(Boolean)[0] ?? '')}</span></div>` : ''}`;
}

function anual(y) {
  const foto = getFoto();
  const an = foto.anual(y);
  const p = params(y);
  const ded = an.deducciones;
  let h = '';
  if (an.tieneSueldos) {
    h += `<div class="sat"><h3>Declaración anual ${y} · se presenta en abril de ${y + 1}</h3>
      <p class="tabn">Ingresos por sueldos y salarios</p>
      ${F('Ingresos por sueldos', '', an.sueldos.ingresos, an.sueldos.estimado ? 'Incluye sueldos brutos estimados. Compáralo con tu constancia de retenciones.' : 'Compáralo con tu constancia de retenciones o tus CFDI de nómina.')}
      ${F('ISR retenido por tu patrón', '', an.sueldos.isrRetenido)}
      <p class="tabn">Deducciones personales</p>
      ${F('Médicas, dentales, hospital y seguro', '', ded.general, `Tope: el menor entre 5 UMA anuales y 15% de tus ingresos = ${money(ded.limGeneral)}.`)}
      ${ded.afore ? F('Aportaciones voluntarias al retiro', '', ded.afore, `Tope propio: ${money(ded.limAfore)}.`) : ''}
      ${ded.donativos ? F('Donativos', '', ded.donativos, `Tope: 7% de tus ingresos = ${money(ded.limDonativos)}.`) : ''}
      ${ded.colegiaturas ? F('Colegiaturas (estímulo)', '', ded.colegiaturas, `Tope por alumno y nivel; se aplica el de bachillerato (${money(ded.topeColegiatura)}). Confirma el nivel.`) : ''}
      ${F('Deducciones aplicables', '(=)', ded.total, `${ded.deducibles.length} de ${ded.lista.length} gastos cumplen requisitos (CFDI y pago bancario).`, true)}
      <p class="tabn">Cálculo</p>
      ${F('Base gravable', '(=)', an.base, 'Ingresos menos deducciones.')}
      ${F('ISR del ejercicio (tarifa art. 152)', '', an.isrAnual)}
      ${F('ISR retenido', '(−)', an.sueldos.isrRetenido)}
      ${F(an.aFavor ? 'Saldo a favor' : 'ISR a cargo', '(=)', an.aFavor || an.aCargo, an.ahorroPorDeducciones ? `Tus deducciones te ahorran ${money(an.ahorroPorDeducciones)} de ISR.` : '', true)}
    </div>
    <div class="notice ${an.obligado ? 'warn' : ''}">${icon(an.obligado ? 'alert' : 'info')}<span>${an.obligado
      ? `<b>Estás obligado a presentar la anual ${y}.</b>${an.sueldos.ingresos > p.obligacionAnualSueldos ? 'Tus sueldos pasan de $400,000.' : 'Además de sueldos, tuviste ingresos de otro régimen.'}`
      : `<b>Quizá no estés obligado</b> (sueldos de un solo patrón por menos de $400,000), pero ${an.aFavor ? 'te conviene presentarla para recuperar tu saldo a favor.' : 'revísalo con tu constancia.'}`}</span></div>`;
  }
  if (an.tieneResico) {
    h += `<div class="sat"><h3>RESICO ${y} (informativo)</h3>
      ${F('Ingresos RESICO del año', '', an.resico.ingresos, `Límite del régimen: ${money(an.resico.limite)}.`)}
      ${F('ISR de tus pagos mensuales', '', an.resico.isrPagos, `${an.resico.meses} mes(es) con declaración.`)}
    </div>
    <div class="notice">${icon('info')}<span>${an.soloResico
      ? 'Si presentaste todas tus declaraciones mensuales, la regla 3.13.7 de la RMF 2026 te releva de la anual por RESICO. Puedes presentarla de forma opcional para aplicar deducciones personales (reglas 3.13.20 y 3.13.21): consúltalo con un contador.'
      : 'Tus ingresos RESICO se informan, pero no se suman a la base de tus sueldos: sus pagos mensuales son definitivos.'}</span></div>`;
  }
  if (an.regimenesSinCalculo.length) h += `<div class="notice warn">${icon('clock')}<span>El cálculo de ${esc(an.regimenesSinCalculo.map((r) => REGIMENES[r].corto).join(', '))} llega en una fase posterior. Sus movimientos ya se guardan.</span></div>`;
  return h || `<div class="empty">${icon('file')}<p>No tuviste régimenes con declaración en ${y}.</p></div>`;
}

export function render(main) {
  const foto = getFoto();
  const meses = Object.values(foto.meses).filter((m) => !m.futuro).sort((a, b) => b.clave.localeCompare(a.clave));
  const anios = [...new Set([...(foto.perfil.regimenes ?? []).map((r) => +r.desde.slice(0, 4)), +foto.hoy.slice(0, 4)])].sort((a, b) => b - a)
    .filter((y) => regimenesEnRango(foto.perfil, `${y}-01-01`, `${y}-12-31`).some((r) => ['sueldos', 'resico'].includes(r)) || regimenesEnRango(foto.perfil, `${y}-01-01`, `${y}-12-31`).length);
  const tabs = [];
  if (meses.length) tabs.push(['isr', 'ISR RESICO'], ['iva', 'IVA']);
  if (anios.length) tabs.push(['anual', 'Anual']);
  if (!tabs.some(([k]) => k === tab)) tab = tabs[0]?.[0];
  if (!meses.some((m) => m.clave === mesSel)) mesSel = meses[0]?.clave;
  if (!anios.includes(anioSel)) anioSel = anios.find((y) => y < +foto.hoy.slice(0, 4) && foto.anual(y).tieneSueldos) ?? anios[0];
  const m = foto.meses[mesSel];

  main.innerHTML = `<section class="view decl">
    <div class="page-head"><div><h1>Mi declaración</h1><p class="sub">Casillas en el orden del portal del SAT. Revisa el prellenado contra estos números. El portal pide pesos sin centavos: redondea al capturar.</p></div></div>
    ${tabs.length ? `<div class="card toolbar"><div class="seg" role="group" aria-label="Declaración">${tabs.map(([k, t]) => `<button data-tab="${k}" aria-pressed="${tab === k}">${t}</button>`).join('')}</div>
      <span class="spacer"></span>
      ${tab !== 'anual' ? `<label class="field inline"><span>Periodo</span><select id="selMes">${meses.map((x) => `<option value="${x.clave}" ${x.clave === mesSel ? 'selected' : ''}>${esc(nombreMes(x.clave))}${x.estado === 'pagada' ? ' · pagada' : ''}</option>`).join('')}</select></label>`
        : `<label class="field inline"><span>Ejercicio</span><select id="selAnio">${anios.map((y) => `<option ${y === anioSel ? 'selected' : ''}>${y}</option>`).join('')}</select></label>`}
    </div>` : `<div class="empty card">${icon('file')}<p>Tu perfil no tiene un régimen con declaraciones. Agrégalo en Ajustes.</p><a class="btn" href="#/ajustes">Ir a Ajustes</a></div>`}
    ${tab === 'isr' && m ? isr(m) + estadoMes(m) : ''}
    ${tab === 'iva' && m ? iva(m) + estadoMes(m) : ''}
    ${tab === 'anual' ? anual(anioSel) : ''}
    <p class="disclaimer">Cálculos estimados con reglas fiscales 2026. Confírmalos con el SAT o con un contador antes de declarar.</p>
  </section>`;

  main.querySelectorAll('[data-tab]').forEach((b) => (b.onclick = () => { tab = b.dataset.tab; render(main); }));
  $('#selMes', main)?.addEventListener('change', (e) => { mesSel = e.target.value; render(main); });
  $('#selAnio', main)?.addEventListener('change', (e) => { anioSel = +e.target.value; render(main); });
  if (m && tab !== 'anual') enlazarAcuse(main, mesSel);
  main.querySelectorAll('[data-est]').forEach((b) => (b.onclick = async () => {
    const est = b.dataset.est === 'pagada' && !m.totalPagar ? 'presentada' : b.dataset.est;
    const cta = getEstado().cuentas.find((c) => c.id === $('#ctaPago', main)?.value);
    const mesN = nombreMes(mesSel);
    const tieneAcuse = !!getEstado().declaraciones?.[mesSel]?.acuse;
    const conf = est === 'pagada'
      ? { titulo: `¿Marcar ${mesN} como pagada?`, accion: `Registrar pago de ${money(m.totalPagar)}`, peligro: false,
          efectos: [`Se registra una salida "Pago al SAT" por ${money(m.totalPagar)} desde ${cta?.nombre ?? 'tu cuenta'} con fecha de hoy.`, 'Tu bolsa SAT de ese mes queda en cero.', 'Hazlo solo cuando el banco ya haya cobrado tu línea de captura.'] }
      : est === 'presentada'
        ? { titulo: `¿Marcar ${mesN} como presentada?`, accion: 'Marcar presentada', peligro: false,
            efectos: [m.totalPagar ? `Queda pendiente el pago de ${money(m.totalPagar)}.` : 'Es una declaración en ceros: no hay nada que pagar.', 'Podrás guardar el número de operación y el acuse.'] }
        : { titulo: `¿Regresar ${mesN} a pendiente?`, accion: 'Regresar a pendiente',
            efectos: [...(m.estado === 'pagada' && m.totalPagar ? [`Se borra la salida "Pago al SAT" de ${money(m.declaracion?.monto ?? m.totalPagar)} y tu saldo vuelve a subir.`] : []), tieneAcuse ? 'Tu acuse y número de operación se conservan.' : 'No tienes acuse guardado para ese mes.', 'Úsalo solo si lo marcaste por error.'] };
    if (!(await confirmar(conf))) return;
    aplicar((s) => marcarDeclaracion(s, mesSel, est, { cuenta: $('#ctaPago', main)?.value, fecha: foto.hoy, hoy: foto.hoy }));
    toast(est === 'pagada' ? 'Declaración pagada: se registró el pago al SAT' : est === 'presentada' ? 'Declaración marcada como presentada' : 'Declaración regresó a pendiente', icon('check-circle'));
  }));
}
