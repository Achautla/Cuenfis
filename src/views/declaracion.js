import { getFoto, getEstado, aplicar } from '../data/store.js';
import { marcarDeclaracion, guardarAcuse } from '../data/acciones.js';
import { REGIMENES, categoria, NIVELES_COLEGIATURA } from '../data/catalogo.js';
import { params, redondeoSat, fechaLimiteMensual } from '../core/fiscal.js';
import { reglas } from '../core/reglas.js';
import { chipFuente, avisoProvisional, leyenda } from '../ui/fuente.js';
import { regimenesEnRango } from '../core/regimen.js';
import { icon } from '../ui/icons.js';
import { $, esc, money, pct, nombreMes, fechaLarga, fechaCorta, toast, descargar } from '../ui/dom.js';
import { confirmar } from '../ui/confirmar.js';
import * as nube from '../data/nube.js';
import { ID_POR_ETIQUETA, CASILLAS, guiaCasilla } from '../ia/casillas.js';
import { iaActiva } from '../ia/consentimiento.js';
import * as conv from '../ia/conversacion.js';
import { abrirFormulario } from './movimiento-form.js';
import '../styles/views/declaracion.css';

let tab = null, mesSel = null, anioSel = null;

// src: [clave del dato fiscal, año] para mostrar "¿De dónde sale?" (ver src/core/params/fuentes.js)
let periodoGuia = null; // periodo de las casillas que se están pintando (AAAA-MM o AAAA)
const preguntaBtn = (label) => {
  const id = ID_POR_ETIQUETA[label];
  return id && iaActiva() ? `<button type="button" class="f-ia" data-casilla="${id}" data-periodo="${periodoGuia}" aria-label="Preguntar al asistente qué poner en ${esc(label)}">${icon('sparkle')}<span>¿Qué pongo aquí?</span></button>` : '';
};
const F = (label, op, v, help = '', tot = false, src = null) => `<div class="f${tot ? ' tot' : ''}"><span>${tot ? `<b>${esc(label)}</b>` : esc(label)}${help ? `<small>${esc(help)}</small>` : ''}${src || ID_POR_ETIQUETA[label] ? `<span class="f-acc">${src ? chipFuente(...src) : ''}${preguntaBtn(label)}</span>` : ''}</span><span class="op">${op}</span><span class="v num">${typeof v === 'number' ? money(v).replace('$', '') : esc(v)}</span></div>`;

const limite = (clave) => fechaLarga(fechaLimiteMensual(clave));

function estadoMes(m) {
  const cuentas = getEstado().cuentas.filter((c) => !['credito', 'prestamo'].includes(c.tipo)).sort((a, b) => (b.tipo === 'debito') - (a.tipo === 'debito'));
  const chip = { pendiente: '<span class="chip warn">Pendiente</span>', presentada: '<span class="chip info">Presentada</span>', pagada: '<span class="chip ok">Pagada</span>' }[m.estado];
  return `<div class="card estado"><div class="row"><b>Estado de ${esc(nombreMes(m.clave))}</b>${chip}<span class="spacer"></span><span class="small muted">Fecha límite: ${esc(limite(m.clave))}</span></div>
    <p class="small muted">Total a pagar: <b class="num">${money(m.totalPagar)}</b> (ISR ${money(m.isrCargo)} + IVA ${money(m.ivaCargo)}). Al marcarla pagada se registra una salida "Pago al SAT" y la bolsa SAT de Inicio baja.</p>
    <div class="row">
      ${m.estado !== 'pagada' ? `<label class="field inline"><span>Pagar desde</span><select id="ctaPago">${cuentas.map((c) => `<option value="${esc(c.id)}">${esc(c.nombre)}</option>`).join('')}</select></label>` : ''}
      ${m.estado === 'pendiente' ? `<button class="btn" data-est="presentada">${icon('file')}Marcar presentada</button>` : ''}
      ${m.estado !== 'pagada' ? (m.estado === 'presentada' && !m.totalPagar ? '' : `<button class="btn primary" data-est="pagada">${icon('check')}${m.totalPagar ? 'Marcar pagada' : 'Marcar presentada en ceros'}</button>`) : ''}
      ${m.estado !== 'pendiente' ? `<button class="btn ghost" data-est="pendiente">Deshacer</button>` : ''}
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
      ${a.ruta ? `<button class="btn sm" id="verAcuse">${icon('download')}${esc(a.nombre ?? 'Ver acuse')}</button><button class="btn ghost sm" id="quitarAcuse">${icon('trash')}Quitar archivo</button>`
        : a.archivo ? `<button class="btn sm" id="bajarAcuse">${icon('download')}${esc(a.nombre ?? 'Descargar acuse')}</button><button class="btn ghost sm" id="quitarAcuse">${icon('trash')}Quitar archivo</button>`
        : `<label class="btn sm">${icon('upload')}Adjuntar PDF o foto<input type="file" id="fileAcuse" accept="application/pdf,image/*" hidden /></label><span class="small muted">${nube.getUsuario() ? 'Hasta 5 MB. Se guarda en tu nube privada.' : 'Hasta 1.5 MB. Se guarda en este dispositivo.'}</span>`}
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
    const a = getEstado().declaraciones?.[clave]?.acuse ?? {};
    if (!(await confirmar({ titulo: '¿Quitar el archivo del acuse?', accion: 'Quitar archivo', texto: `Se borra ${a.ruta ? 'de tu nube' : 'de este dispositivo'}. El número de operación se conserva. Si no tienes otra copia, puedes descargarla de nuevo del portal del SAT.` }))) return;
    if (a.ruta && nube.getUsuario()) { try { await nube.borrarAcuse(a.ruta); } catch { /* se limpia la referencia de todos modos */ } }
    guardar({ archivo: undefined, nombre: undefined, ruta: undefined }, 'Archivo quitado');
  });
  $('#bajarAcuse', main)?.addEventListener('click', async () => {
    const a = getEstado().declaraciones?.[clave]?.acuse ?? {};
    descargar(a.nombre ?? `acuse-${clave}.pdf`, await (await fetch(a.archivo)).blob(), a.tipo || 'application/pdf');
  });
  $('#verAcuse', main)?.addEventListener('click', async () => {
    const a = getEstado().declaraciones?.[clave]?.acuse ?? {};
    if (!nube.getUsuario()) { toast('Inicia sesión para ver el acuse guardado en tu nube', icon('cloud')); return; }
    const w = window.open('', '_blank');
    try { const url = await nube.urlAcuse(a.ruta); if (w) w.location = url; else location.href = url; }
    catch (e) { w?.close(); toast(e.message, icon('alert')); }
  });
  $('#fileAcuse', main)?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (nube.getUsuario()) {
      if (file.size > 5 * 1024 * 1024) { toast('El archivo pesa más de 5 MB. Prueba con el PDF del SAT o una foto más ligera.', icon('alert')); return; }
      toast('Subiendo acuse…', icon('cloud'));
      try { const ruta = await nube.subirAcuse(clave, file); guardar({ ruta, nombre: file.name, tipo: file.type, subido: new Date().toISOString(), archivo: undefined }, 'Acuse guardado en tu nube'); }
      catch (err) { toast(err.message, icon('alert')); }
      return;
    }
    if (file.size > MAX_ACUSE) { toast('El archivo pesa más de 1.5 MB. Prueba con el PDF del SAT o una foto más ligera.', icon('alert')); return; }
    const r = new FileReader();
    r.onload = () => {
      if (aplicar((s) => guardarAcuse(s, clave, { archivo: r.result, nombre: file.name, tipo: file.type, subido: new Date().toISOString() }))) toast('Acuse guardado', icon('check-circle'));
      else { aplicar((s) => guardarAcuse(s, clave, { archivo: undefined, nombre: undefined })); toast('No hay espacio en este dispositivo para el archivo. Guarda solo el número de operación.', icon('alert')); }
    };
    r.readAsDataURL(file);
  });
}

const PASOS_MENSUAL = [
  ['Entra al portal', 'En sat.gob.mx busca <b>Declaraciones</b> y elige la de pagos provisionales o definitivos. Inicia sesión con tu RFC y contraseña o con tu e.firma.'],
  ['Configura la declaración', 'Ejercicio y periodo del mes, periodicidad <b>Mensual</b>, tipo <b>Normal</b>. Marca las obligaciones <b>ISR simplificado de confianza</b> e <b>IVA simplificado de confianza</b>.'],
  ['Revisa el prellenado', 'El portal trae tus facturas cobradas. Compara cada casilla con esta pantalla; si algo no coincide, toca «¿Qué pongo aquí?».'],
  ['Captura sin centavos', 'El portal pide pesos enteros. Usa «Copiar cifras» para tenerlas a la mano ya redondeadas.'],
  ['Envía y paga', 'Envía la declaración, descarga la línea de captura y págala en tu banco antes de la fecha límite.'],
  ['Guarda tu acuse aquí', 'Marca el mes como presentado o pagado y guarda el número de operación y el acuse más abajo.'],
];

function guia(m) {
  const filas = Object.values(CASILLAS).filter((c) => c[0] === 'isr' || c[0] === 'iva');
  const cifras = filas.map((c) => [c[0].toUpperCase(), c[2], c[3](m)]).filter(([, , v]) => typeof v === 'number');
  const texto = `Declaración ${nombreMes(m.clave)} (estimación Cuenfis)\n` + cifras.map(([t, l, v]) => `${t} · ${l}: ${redondeoSat(v)}`).join('\n') + `\nTotal a pagar: ${redondeoSat(m.isrCargo) + redondeoSat(m.ivaCargo)}`;
  return `<details class="card guia" ${m.estado === 'pendiente' ? 'open' : ''}>
    <summary><span class="guia-ico">${icon('file')}</span><span><b>Guía para presentarla en el portal del SAT</b><small>${PASOS_MENSUAL.length} pasos · total estimado a pagar ${money(m.totalPagar)}</small></span></summary>
    <ol class="guia-pasos">${PASOS_MENSUAL.map(([t, d]) => `<li><b>${t}</b><span>${d}</span></li>`).join('')}</ol>
    <div class="row"><button type="button" class="btn" id="copiarCifras" data-texto="${esc(texto)}">${icon('download')}Copiar cifras</button>
      ${iaActiva() ? `<button type="button" class="btn primary" id="guiaIa">${icon('sparkle')}Que el asistente me guíe</button>` : '<a class="btn ghost" href="#/ajustes">Activar el asistente para que te guíe</a>'}</div>
    <p class="small muted">Los nombres de las secciones pueden cambiar en el portal. Si algo no coincide, guíate por el nombre de la casilla.</p>
  </details>`;
}

function isr(m) {
  const y = +m.clave.slice(0, 4);
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
    ${F('Tasa aplicable', '(×)', pct(m.tasa, 2), 'Tabla mensual del art. 113-E: se aplica a todo el ingreso del mes.', false, ['resico.mensual', y])}
    ${F('ISR determinado', '(=)', m.isrDet)}
    ${F('ISR retenido por personas morales', '(−)', m.isrRet, pm ? `${pm} cobro(s) a empresas: ${pct(params(y).resico.retencionIsrPM, 2)} de su subtotal.` : 'Solo si te pagó una empresa.', false, ['resico.retencionIsrPM', y])}
    ${F('ISR a cargo', '(=)', m.isrCargo, m.isrFavor ? `Las retenciones superan el impuesto por ${money(m.isrFavor)}.` : '', true)}
    <p class="tabn">Pestaña Pago</p>
    ${F('¿Tienes compensaciones por aplicar?', '', 'No')}
    ${F('¿Tienes estímulos por aplicar?', '', 'No')}
    ${F('Cantidad a pagar', '(=)', m.isrCargo, `Fecha límite: ${limite(m.clave)}.`, true, ['diaLimiteMensual', y])}
  </div>
  <div class="notice">${icon('info')}<span>El pago mensual de RESICO es definitivo. Si en el mes no cobraste nada, presenta la declaración en ceros: omitir 3 o más meses en un año te saca del régimen (art. 113-I).</span></div>`;
}

function iva(m) {
  const y = +m.clave.slice(0, 4);
  const foto = getFoto();
  const no = foto.movs.filter((x) => m.acredNo.includes(x.id));
  return `<div class="sat"><h3>IVA simplificado de confianza · ${esc(nombreMes(m.clave))}</h3>
    <p class="tabn">Pestaña Determinación</p>
    ${F('Actividades gravadas a la tasa del 16%', '', m.g16, '', false, ['iva.general', y])}
    ${F('Actividades gravadas a la tasa del 8%', '', m.g8, 'Solo con el estímulo de región fronteriza.', false, ['iva.frontera', y])}
    ${F('Actividades gravadas a la tasa del 0%, exentas o no objeto', '', m.g0)}
    ${F('Total de IVA a cargo', '(=)', m.ivaTrasladado, '', true)}
    ${F('IVA no cobrado por devoluciones, descuentos y bonificaciones', '(−)', 0)}
    ${F('IVA retenido', '(−)', m.ivaRet, 'Lo que te retuvieron las empresas (2/3 del IVA).', false, ['iva.retencionPM', y])}
    ${F('IVA acreditable del periodo', '(−)', m.ivaAcred, `Captura manual: IVA de gastos de tu actividad con CFDI y pago bancario (o efectivo hasta ${money(params(y).topeEfectivo)}).${m.ivaAcredNoProporcional ? ` Como parte de tus cobros es exenta, solo se acredita el ${Math.round(m.proporcionAcreditable * 100)}% (no se acreditan ${money(m.ivaAcredNoProporcional)}).` : ''}`, false, ['topeEfectivo', y])}
    ${F('IVA por devoluciones, descuentos y bonificaciones en gastos', '(+)', 0)}
    ${F(m.ivaNeto >= 0 ? 'Cantidad a cargo' : 'Saldo a favor', '(=)', Math.abs(m.ivaNeto), '', true)}
    ${F('Acreditamiento del saldo a favor de periodos anteriores', '(−)', m.favorAplicado, m.favorAnterior ? `Tenías ${money(m.favorAnterior)} a favor de meses anteriores.` : '')}
    ${F('Impuesto a cargo', '(=)', m.ivaCargo, m.favorSiguiente ? `Saldo a favor que pasa al siguiente mes: ${money(m.favorSiguiente)}.` : '', true)}
    <p class="tabn">Pestaña Pago</p>
    ${F('Cantidad a pagar', '(=)', m.ivaCargo, `Fecha límite: ${limite(m.clave)}.`, true, ['diaLimiteMensual', y])}
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
      ${F('Médicas, dentales, hospital y seguro', '', ded.general, `Tope: el menor entre ${p.deducciones.umasAnuales} UMA anuales y ${pct(p.deducciones.porcentajeIngresos)} de tus ingresos = ${money(ded.limGeneral)}.`, false, ['deducciones', y])}
      ${ded.afore ? F('Aportaciones voluntarias al retiro', '', ded.afore, `Tope propio: ${money(ded.limAfore)}.`, false, ['deducciones.afore', y]) : ''}
      ${ded.donativos ? F('Donativos', '', ded.donativos, `Tope: ${pct(p.deducciones.donativos.porcentajeIngresos)} de tus ingresos = ${money(ded.limDonativos)}.`, false, ['deducciones.donativos', y]) : ''}
      ${ded.colegiaturas ? F('Colegiaturas (estímulo)', '', ded.aplicables.colegiaturas, `Pagaste ${money(ded.colegiaturas)}. Tope por alumno y nivel: ${ded.alumnos.map((a) => `${a.alumno || 'sin nombre'} (${a.nivel ? NIVELES_COLEGIATURA[a.nivel] : 'sin nivel, se usa bachillerato'}) ${money(a.aplicable)} de ${money(a.tope)}`).join('; ')}.${ded.alumnos.some((a) => !a.alumno || !a.nivel) ? ' Anota alumno y nivel en cada colegiatura para aplicar el tope correcto.' : ''}`, false, ['deducciones.colegiaturas', y]) : ''}
      ${F('Deducciones aplicables', '(=)', ded.total, `${ded.deducibles.length} de ${ded.lista.length} gastos cumplen requisitos (CFDI y pago bancario).`, true)}
      <p class="tabn">Cálculo</p>
      ${F('Base gravable', '(=)', an.base, 'Ingresos menos deducciones.')}
      ${F('ISR del ejercicio (tarifa art. 152)', '', an.isrAnual, '', false, ['tarifaAnual', y])}
      ${F('ISR retenido', '(−)', an.sueldos.isrRetenido)}
      ${F(an.aFavor ? 'Saldo a favor' : 'ISR a cargo', '(=)', an.aFavor || an.aCargo, an.ahorroPorDeducciones ? `Tus deducciones te ahorran ${money(an.ahorroPorDeducciones)} de ISR.` : '', true)}
    </div>
    <div class="notice ${an.obligado ? 'warn' : ''}">${icon(an.obligado ? 'alert' : 'info')}<span>${an.obligado
      ? `<b>Estás obligado a presentar la anual ${y}.</b>${an.sueldos.ingresos > p.obligacionAnualSueldos ? `Tus sueldos pasan de ${money(p.obligacionAnualSueldos)}.` : 'Además de sueldos, tuviste ingresos de otro régimen.'}`
      : `<b>Quizá no estés obligado</b> (sueldos de un solo patrón por menos de ${money(p.obligacionAnualSueldos)}), pero ${an.aFavor ? 'te conviene presentarla para recuperar tu saldo a favor.' : 'revísalo con tu constancia.'}`}</span></div>`;
  }
  if (an.tieneResico) {
    h += `<div class="sat"><h3>RESICO ${y} (informativo)</h3>
      ${F('Ingresos RESICO del año', '', an.resico.ingresos, `Límite del régimen: ${money(an.resico.limite)}.`, false, ['resico.limiteAnual', y])}
      ${F('ISR de tus pagos mensuales', '', an.resico.isrPagos, `${an.resico.meses} mes(es) con declaración.`)}
    </div>
    <div class="notice">${icon('info')}<span>${an.soloResico
      ? `Si presentaste todas tus declaraciones mensuales, la regla 3.13.7 de la ${esc(reglas(y).p.publicaciones?.rmf ?? 'RMF')} te releva de la anual por RESICO. Puedes presentarla de forma opcional para aplicar deducciones personales (reglas 3.13.20 y 3.13.21): consúltalo con un contador.`
      : 'Tus ingresos RESICO se informan, pero no se suman a la base de tus sueldos: sus pagos mensuales son definitivos.'}</span></div>`;
  }
  h += otrosIngresos(an, y);
  if (an.regimenesSinCalculo.length) h += `<div class="notice warn">${icon('clock')}<span>El cálculo de ${esc(an.regimenesSinCalculo.map((r) => REGIMENES[r].corto).join(', '))} llega en una fase posterior. Sus movimientos ya se guardan.</span></div>`;
  return h || `<div class="empty">${icon('file')}<p>No tuviste régimenes con declaración en ${y}.</p></div>`;
}

/** Otros ingresos (préstamos, regalos, ventas personales...): qué se informa o se declara en la anual. Estimado. */
function otrosIngresos(an, y) {
  const o = an.otrosIngresos;
  if (!o?.total) return '';
  const puntos = [];
  if (o.informarArt90) puntos.push(`Tus préstamos, regalos y premios de ${y} suman ${money(o.art90)}: pasan de ${money(o.limiteArt90)}, así que <b>debes informarlos en tu anual</b> (art. 90 LISR).`);
  if (o.informarExentos) puntos.push(`Tus ingresos exentos (regalos, herencias, venta de tu casa) suman ${money(o.exentos)}: pasan de ${money(o.limiteExentos)}, así que <b>se informan en tu anual</b> (art. 150 LISR).`);
  if (o.regaloGravado > 0) puntos.push(`Los regalos de personas que no son tu familia directa suman ${money(o.regaloOtro)}. Solo están exentos ${money(o.topeRegalo)} (3 UMA anuales); <b>${money(o.regaloGravado)} serían ingreso que se declara en la anual</b>.`);
  if (o.intereses) puntos.push('Registraste intereses o rendimientos: pide la constancia de tu banco; los intereses reales se consideran en la anual.');
  if (o.comoActividad) puntos.push(`${o.comoActividad === 1 ? 'Una entrada marcada' : `${o.comoActividad} entradas marcadas`} como «pago por mi trabajo» siguen como Otro ingreso: cámbialas a la categoría de cobro de tu régimen para que cuenten.`);
  if (o.sinExplicar) puntos.push(`${o.sinExplicar === 1 ? 'Una entrada' : `${o.sinExplicar} entradas`} de Otro ingreso no dicen qué son. Ábrelas y elige «¿Qué es este dinero?»: si el SAT ve depósitos que no declaras, puede pedirte que los expliques (art. 91 LISR).`);
  if (!puntos.length) return `<div class="notice">${icon('info')}<span>Tus otros ingresos de ${y} (${money(o.total)}) están explicados y no pasan de los límites para informarlos en la anual.</span></div>`;
  const grave = o.informarArt90 || o.informarExentos || o.regaloGravado > 0;
  return `<div class="notice ${grave ? 'warn' : ''}">${icon(grave ? 'alert' : 'info')}<span><b>Otros ingresos de ${y}: ${money(o.total)}</b><ul class="decl-nosum-lista">${puntos.map((t) => `<li><span>${t}</span></li>`).join('')}</ul></span></div>`;
}

/** Entradas del mes que no entran a la declaración: el usuario decide si son cobros de su actividad. */
function noSumadas(m, foto) {
  if (!m.noSumadas?.length) return '';
  const movs = m.noSumadas.map((id) => foto.movs.find((x) => x.id === id)).filter(Boolean);
  return `<div class="notice warn decl-nosum">${icon('alert')}<span>
    <b>${movs.length === 1 ? 'Una entrada' : `${movs.length} entradas`} de ${esc(nombreMes(m.clave))} por ${money(m.noSumadasTotal)} no ${movs.length === 1 ? 'se suma' : 'se suman'} a esta declaración.</b>
    Solo cuentan los movimientos con la categoría «Cobro RESICO» y con fecha dentro de tu régimen. Si alguna es un pago por tu trabajo o tus ventas, ábrela y cámbiala a Cobro RESICO; si dice «fecha fuera de tu régimen», corrige su fecha o la fecha de alta del régimen en Ajustes. Si es un regalo, un préstamo o una venta personal, ábrela y elige qué es: dejará de aparecer aquí.
    <ul class="decl-nosum-lista">${movs.map((x) => `<li><span>${esc(fechaCorta(x.fecha))} · ${esc(x.nota || x.contraparte || categoria(x.categoria).nombre)}${x.d.clase === 'ingreso' && !x.d.fiscal ? ` · <i>${x.d.regimen === 'resico' ? 'fecha fuera de tu régimen' : `no estabas en ${esc(REGIMENES[x.d.regimen]?.corto ?? 'ese régimen')} en esa fecha`}</i>` : ''}</span><b>${money(x.monto)}</b><button type="button" class="btn sm" data-revisar="${esc(x.id)}">Revisar</button></li>`).join('')}</ul>
  </span></div>`;
}

export function render(main) {
  const foto = getFoto();
  const meses = Object.values(foto.meses).filter((m) => !m.futuro).sort((a, b) => b.clave.localeCompare(a.clave));
  const primerAnio = Math.min(+foto.hoy.slice(0, 4), ...(foto.perfil.regimenes ?? []).map((r) => +r.desde.slice(0, 4)));
  const anios = Array.from({ length: +foto.hoy.slice(0, 4) - primerAnio + 1 }, (_, i) => +foto.hoy.slice(0, 4) - i)
    .filter((y) => regimenesEnRango(foto.perfil, `${y}-01-01`, `${y}-12-31`).some((r) => ['sueldos', 'resico'].includes(r)) || regimenesEnRango(foto.perfil, `${y}-01-01`, `${y}-12-31`).length);
  const tabs = [];
  if (meses.length) tabs.push(['isr', 'ISR RESICO'], ['iva', 'IVA']);
  if (anios.length) tabs.push(['anual', 'Anual']);
  if (!tabs.some(([k]) => k === tab)) tab = tabs[0]?.[0];
  if (!meses.some((m) => m.clave === mesSel)) mesSel = meses[0]?.clave;
  if (!anios.includes(anioSel)) anioSel = anios.find((y) => y < +foto.hoy.slice(0, 4) && foto.anual(y).tieneSueldos) ?? anios[0];
  const m = foto.meses[mesSel];

  periodoGuia = tab === 'anual' ? String(anioSel) : mesSel;
  main.innerHTML = `<section class="view decl">
    <div class="page-head"><div><h1>Mi declaración</h1><p class="sub">Casillas en el orden del portal del SAT. Revisa el prellenado contra estos números. El portal pide pesos sin centavos: redondea al capturar.</p></div></div>
    ${tabs.length ? `<div class="card toolbar"><div class="seg" role="group" aria-label="Declaración">${tabs.map(([k, t]) => `<button data-tab="${k}" aria-pressed="${tab === k}">${t}</button>`).join('')}</div>
      <span class="spacer"></span>
      ${tab !== 'anual' ? `<label class="field inline"><span>Periodo</span><select id="selMes">${meses.map((x) => `<option value="${x.clave}" ${x.clave === mesSel ? 'selected' : ''}>${esc(nombreMes(x.clave))}${x.estado === 'pagada' ? ' · pagada' : ''}</option>`).join('')}</select></label>`
        : `<label class="field inline"><span>Ejercicio</span><select id="selAnio">${anios.map((y) => `<option ${y === anioSel ? 'selected' : ''}>${y}</option>`).join('')}</select></label>`}
    </div>` : `<div class="empty card">${icon('file')}<p>Tu perfil no tiene un régimen con declaraciones. Agrégalo en Ajustes.</p><a class="btn" href="#/ajustes">Ir a Ajustes</a></div>`}
    ${avisoProvisional(tab === 'anual' ? anioSel : +(mesSel ?? foto.hoy).slice(0, 4))}
    ${tab !== 'anual' && m ? noSumadas(m, foto) : ''}
    ${tab !== 'anual' && m ? guia(m) : ''}
    ${tab === 'isr' && m ? isr(m) + estadoMes(m) : ''}
    ${tab === 'iva' && m ? iva(m) + estadoMes(m) : ''}
    ${tab === 'anual' ? anual(anioSel) : ''}
    <p class="disclaimer">Cálculos estimados con ${esc(leyenda(tab === 'anual' ? anioSel : +(mesSel ?? foto.hoy).slice(0, 4)))}. Confírmalos con el SAT o con un contador antes de declarar. <a href="#/reglas">Ver reglas fiscales</a></p>
  </section>`;

  main.querySelectorAll('[data-revisar]').forEach((b) => (b.onclick = () => {
    const mov = getEstado().movimientos.find((x) => x.id === b.dataset.revisar);
    if (mov) abrirFormulario({ mov });
  }));
  main.querySelectorAll('[data-tab]').forEach((b) => (b.onclick = () => { tab = b.dataset.tab; render(main); }));
  $('#selMes', main)?.addEventListener('change', (e) => { mesSel = e.target.value; render(main); });
  $('#selAnio', main)?.addEventListener('change', (e) => { anioSel = +e.target.value; render(main); });
  if (m && tab !== 'anual') enlazarAcuse(main, mesSel);
  // Asistencia: cada casilla abre el asistente en modo declaración con la pregunta ya hecha
  main.querySelectorAll('[data-casilla]').forEach((b) => (b.onclick = () => {
    const g = guiaCasilla(b.dataset.casilla, b.dataset.periodo);
    const cuando = /^\d{4}$/.test(b.dataset.periodo) ? `mi anual ${b.dataset.periodo}` : `mi declaración de ${nombreMes(b.dataset.periodo)}`;
    conv.fijarModo('declaracion');
    location.hash = '#/asistente';
    conv.preguntar(`¿Qué pongo en «${g.casilla ?? b.dataset.casilla}» de ${cuando}?`);
  }));
  $('#guiaIa', main)?.addEventListener('click', () => {
    conv.fijarModo('declaracion');
    location.hash = '#/asistente';
    conv.preguntar(`Guíame paso a paso con ${tab === 'iva' ? 'el IVA' : 'el ISR'} de mi declaración de ${nombreMes(mesSel)}.`);
  });
  $('#copiarCifras', main)?.addEventListener('click', async (ev) => {
    try { await navigator.clipboard.writeText(ev.currentTarget.dataset.texto); toast('Cifras copiadas, ya redondeadas a pesos', icon('check-circle')); }
    catch { toast('No se pudo copiar en este navegador. Toma las cifras de la pantalla.', icon('alert')); }
  });
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
