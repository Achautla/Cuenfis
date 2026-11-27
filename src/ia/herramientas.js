// Ejecuta en el dispositivo las herramientas que pide el asistente, con el motor de Cuenfis.
// Devuelve datos compactos: al servidor de IA solo llega lo necesario para responder.
import { getFoto, getEstado } from '../data/store.js';
import { CATEGORIAS, categoria, REGIMENES } from '../data/catalogo.js';
import { categoriasDisponibles, regimenesEn, regimenesEnRango } from '../core/regimen.js';
import { reglas, valor, fuente } from '../core/reglas.js';
import { estadoPresupuestos } from '../core/presupuestos.js';
import { guiaCasilla } from './casillas.js';
import { limpiarRecuerdo, paraContexto } from './memoria.js';
import { CLAVES_REGLAS, NOMBRES_HERRAMIENTAS } from '../../supabase/functions/_shared/herramientas.js';

const FECHA = /^\d{4}-\d{2}-\d{2}$/;
const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

/** Fecha límite de la declaración de un mes: el día que marca la ley del mes siguiente. */
function limitesDeMes(mes) {
  const [y, m] = mes.split('-').map(Number);
  return new Date(Date.UTC(y, m, reglas(y).p.diaLimiteMensual)).toISOString().slice(0, 10);
}

function resumen_periodo({ desde, hasta }) {
  if (!FECHA.test(desde) || !FECHA.test(hasta)) return { error: 'Fechas con formato AAAA-MM-DD' };
  const p = getFoto().periodo(desde, hasta);
  return {
    desde, hasta, movimientos: p.movs.length,
    entradas: p.entradas, salidas: p.salidas, ingresos_propios: p.propios, gasto_real: p.gastos, ahorro: p.ahorro,
    tasa_ahorro: r2(p.tasaAhorro * 100) + '%', apartado_para_sat: p.delSat, retenido: p.retenido,
    gasto_por_categoria: Object.entries(p.porCategoria).sort((a, b) => b[1] - a[1]).map(([c, v]) => ({ categoria: categoria(c).nombre, monto: v })),
  };
}

function buscar_movimientos({ desde, hasta, tipo, categoria: cat, texto }) {
  if (!FECHA.test(desde) || !FECHA.test(hasta)) return { error: 'Fechas con formato AAAA-MM-DD' };
  const t = (texto ?? '').toLowerCase();
  const ms = getFoto().movs
    .filter((m) => m.fecha >= desde && m.fecha <= hasta && (!tipo || m.tipo === tipo) && (!cat || m.categoria === cat)
      && (!t || `${m.nota ?? ''} ${m.contraparte ?? ''}`.toLowerCase().includes(t)))
    .sort((a, b) => b.fecha.localeCompare(a.fecha));
  return {
    total: ms.length, mostrados: Math.min(50, ms.length),
    movimientos: ms.slice(0, 50).map((m) => ({ fecha: m.fecha, tipo: m.tipo, categoria: m.categoria ? categoria(m.categoria).nombre : null, monto: m.monto, nota: m.nota ?? '', contraparte: m.contraparte ?? '', con_factura: !!m.cfdi })),
  };
}

function listar_categorias({ tipo }) {
  const hoy = getFoto().hoy;
  return { categorias: categoriasDisponibles(getEstado().perfil, hoy, tipo === 'entrada' ? 'entrada' : 'salida', CATEGORIAS).map((c) => ({ id: c.id, nombre: c.nombre, ayuda: c.tip })) };
}

function estado_financiero({ mes }) {
  if (!/^\d{4}-\d{2}$/.test(mes ?? '')) return { error: 'Mes con formato AAAA-MM' };
  const foto = getFoto();
  const e = getEstado();
  const b = foto.balance;
  const pres = estadoPresupuestos(foto, e.presupuestos ?? {}, mes);
  const aportado = (m) => (m.cuenta ? (foto.cuentas.find((c) => c.id === m.cuenta)?.saldo ?? 0) : Number(m.aportado) || 0);
  return {
    saldos: { tengo: b.tengo, deudas: b.deudas, apartado_para_sat: b.bolsa, disponible_real: b.disponible },
    cuentas: foto.cuentas.map((c) => ({ nombre: c.nombre, saldo: c.saldo, es_deuda: !!c.esDeuda })),
    presupuestos: { mes, total: pres.total, gastado: pres.gastado, restante: r2(pres.total - pres.gastado),
      categorias: pres.filas.map((f) => ({ categoria: categoria(f.categoria).nombre, limite: f.limite, gastado: f.gastado, restante: f.restante, uso: r2(f.uso * 100) + '%', estado: f.nivel })) },
    metas: (e.metas ?? []).map((m) => { const a = r2(aportado(m)); return { nombre: m.nombre, objetivo: Number(m.objetivo), ahorrado: a, avance: r2(Math.min(1, a / (Number(m.objetivo) || 1)) * 100) + '%', fecha: m.fecha ?? null }; }),
    meta_ahorro_mensual: Number(e.preferencias?.metaAhorro) || 0,
  };
}

function declaracion_mensual({ mes }) {
  if (!/^\d{4}-\d{2}$/.test(mes ?? '')) return { error: 'Mes con formato AAAA-MM' };
  const foto = getFoto();
  if (!regimenesEnRango(foto.perfil, `${mes}-01`, `${mes}-31`).includes('resico')) return { error: 'El usuario no tiene RESICO en ese mes: no hay declaración mensual que calcular.' };
  const m = foto.meses[mes];
  if (!m) return { error: 'No hay datos de ese mes.' };
  const r = reglas(+mes.slice(0, 4));
  return {
    mes, estado: m.estado, fecha_limite: limitesDeMes(mes), reglas_del_anio: r.base, reglas_provisionales: r.provisional,
    isr: { ingresos_cobrados_sin_iva: m.total, tasa: r2(m.tasa * 100) + '%', isr_determinado: m.isrDet, isr_retenido_por_empresas: m.isrRet, isr_a_cargo: m.isrCargo },
    iva: { actividades_16: m.g16, actividades_8: m.g8, actividades_0: m.g0, iva_cobrado: m.ivaTrasladado, iva_retenido: m.ivaRet, iva_acreditable: m.ivaAcred, saldo_a_favor_aplicado: m.favorAplicado, iva_a_cargo: m.ivaCargo },
    total_a_pagar: m.totalPagar,
  };
}

function declaracion_anual({ anio }) {
  const y = Number(anio);
  if (!Number.isInteger(y)) return { error: 'Año inválido' };
  const a = getFoto().anual(y);
  const r = reglas(y);
  const d = a.deducciones;
  return {
    anio: y, reglas_del_anio: r.base, reglas_provisionales: r.provisional, regimenes: a.regs.map((x) => REGIMENES[x]?.corto ?? x), obligado: a.obligado,
    sueldos: a.tieneSueldos ? { ingresos: a.sueldos.ingresos, isr_retenido: a.sueldos.isrRetenido, sueldo_bruto_estimado: a.sueldos.estimado } : null,
    deducciones: a.tieneSueldos ? { gastos_medicos_y_seguros: d.general, tope_general: d.limGeneral, afore: d.afore, donativos: d.donativos, colegiaturas: d.colegiaturas, total_aplicable: d.total, cumplen_requisitos: `${d.deducibles.length} de ${d.lista.length}` } : null,
    calculo: a.tieneSueldos ? { base_gravable: a.base, isr_del_ejercicio: a.isrAnual, saldo_a_favor: a.aFavor, isr_a_cargo: a.aCargo, ahorro_por_deducciones: a.ahorroPorDeducciones } : null,
    resico: a.tieneResico ? { ingresos: a.resico.ingresos, isr_pagos_mensuales: a.resico.isrPagos, meses: a.resico.meses, limite: a.resico.limite } : null,
    regimenes_sin_calculo: a.regimenesSinCalculo,
  };
}

function regla_fiscal({ clave, anio }) {
  if (!CLAVES_REGLAS.includes(clave)) return { error: 'Clave desconocida' };
  const r = reglas(Number(anio));
  const f = fuente(clave, r.anio);
  return { clave, anio: r.anio, reglas_del_anio: r.base, provisional: r.provisional, valor: valor(r.p, clave), fuente: { documento: f.documento, articulo: f.articulo, publicacion: f.publicacion || null, enlace: f.url } };
}

function proponer_movimiento(e) {
  const monto = Number(e.monto);
  if (!(monto > 0) || !FECHA.test(e.fecha ?? '') || !['entrada', 'salida'].includes(e.tipo)) return { error: 'Datos incompletos: tipo, monto mayor a 0 y fecha AAAA-MM-DD.' };
  const cats = categoriasDisponibles(getEstado().perfil, e.fecha, e.tipo, CATEGORIAS).map((c) => c.id);
  if (!cats.includes(e.categoria)) return { error: `Categoría no disponible para este usuario. Usa una de: ${cats.join(', ')}` };
  return { estado: 'mostrado_al_usuario', nota: 'El usuario lo revisará y lo guardará o lo descartará en la app. No digas que ya se guardó.' };
}

const guia_casilla = ({ casilla, periodo }) => guiaCasilla(casilla, periodo);

function proponer_recuerdo({ texto }) {
  try { limpiarRecuerdo(texto); } catch (e) { return { error: e.message }; }
  return { estado: 'mostrado_al_usuario', nota: 'El usuario decide si se guarda. No digas que ya lo recordaste.' };
}

const IMPL = { proponer_recuerdo, guia_casilla, estado_financiero, resumen_periodo, buscar_movimientos, listar_categorias, declaracion_mensual, declaracion_anual, regla_fiscal, proponer_movimiento };

/** Ejecuta una herramienta pedida por el asistente. Nunca lanza: los errores vuelven como datos. */
export function ejecutar(nombre, entrada) {
  if (!NOMBRES_HERRAMIENTAS.includes(nombre) || !IMPL[nombre]) return { error: `Herramienta desconocida: ${nombre}` };
  try { return IMPL[nombre](entrada ?? {}); } catch (err) { return { error: `No se pudo completar: ${err?.message ?? err}` }; }
}

/** Contexto mínimo que acompaña cada pregunta. */
export function contexto() {
  const foto = getFoto();
  return { hoy: foto.hoy, regimenes: regimenesEn(foto.perfil, foto.hoy), frontera: !!foto.perfil?.frontera, ...paraContexto() };
}

export const ETIQUETAS = {
  resumen_periodo: 'Revisando tus números del periodo',
  buscar_movimientos: 'Buscando en tus movimientos',
  listar_categorias: 'Revisando tus categorías',
  estado_financiero: 'Revisando saldos, presupuestos y metas',
  declaracion_mensual: 'Calculando tu declaración mensual',
  declaracion_anual: 'Calculando tu declaración anual',
  guia_casilla: 'Revisando la casilla del portal del SAT',
  regla_fiscal: 'Consultando la regla fiscal y su fuente',
  proponer_movimiento: 'Preparando el movimiento',
  proponer_recuerdo: 'Preparando algo para recordar',
  leer_qr_cfdi: 'Leyendo el QR de la factura en tu dispositivo',
};
