// Motor único: a partir del estado (perfil, cuentas, movimientos, declaraciones) produce
// una sola "foto" que leen todas las pantallas. Así Inicio, Movimientos, Indicadores,
// Declaración y Reportes nunca se contradicen.
import { categoria, TIPOS_CUENTA, REGIMENES } from '../data/catalogo.js';
import { desglosar } from './desglose.js';
import { params, r2, tasaResicoMensual, isrTarifa, umaAnual } from './fiscal.js';
import { vigente, vigenteEnRango, regimenesEnRango } from './regimen.js';

export const ym = (fecha) => fecha.slice(0, 7);
export function rangoMes(clave) {
  const [y, m] = clave.split('-').map(Number);
  const fin = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return [`${clave}-01`, `${clave}-${String(fin).padStart(2, '0')}`];
}
function sigMes(clave) {
  let [y, m] = clave.split('-').map(Number);
  m += 1; if (m > 12) { m = 1; y += 1; }
  return `${y}-${String(m).padStart(2, '0')}`;
}
const suma = (xs, f) => r2(xs.reduce((s, x) => s + (f(x) || 0), 0));

/**
 * @param {object} estado { perfil, cuentas, movimientos, declaraciones }
 * @param {string} hoy YYYY-MM-DD
 */
export function calcular(estado, hoy) {
  const perfil = estado.perfil ?? { regimenes: [] };
  const cuentas = estado.cuentas ?? [];
  const decls = estado.declaraciones ?? {};
  const avisos = [];

  // 1. Desglose de cada movimiento
  const movs = (estado.movimientos ?? [])
    .map((m) => ({ ...m, monto: Number(m.monto) || 0, d: desglosar(m, perfil) }))
    .sort((a, b) => a.fecha.localeCompare(b.fecha) || String(a.id).localeCompare(String(b.id)));

  // 2. Meses RESICO: ISR e IVA (pagos mensuales definitivos)
  const meses = {};
  const fechasRes = (perfil.regimenes ?? []).filter((r) => r.reg === 'resico').map((r) => r.desde);
  const inicio = [...fechasRes, ...movs.map((m) => m.fecha)].sort()[0];
  const ultimo = [hoy, ...movs.map((m) => m.fecha)].sort().at(-1);
  let favorIva = 0;
  if (inicio) {
    for (let k = ym(inicio); k <= ym(ultimo); k = sigMes(k)) {
      const [a, b] = rangoMes(k);
      const activo = vigenteEnRango(perfil, 'resico', a, b);
      const delMes = movs.filter((m) => m.fecha >= a && m.fecha <= b);
      const cobros = delMes.filter((m) => m.d.fiscal && m.d.regimen === 'resico');
      const p = params(+k.slice(0, 4));
      const total = suma(cobros, (m) => m.d.subtotal);
      const tasa = tasaResicoMensual(total, p);
      const isrDet = r2(total * tasa);
      const isrRet = suma(cobros, (m) => m.d.isrRet);
      const isrCargo = r2(Math.max(0, isrDet - isrRet));
      const porTasa = (t) => suma(cobros.filter((m) => r2(m.d.iva / (m.d.subtotal || 1)) === t), (m) => m.d.subtotal);
      const g16 = porTasa(0.16), g8 = porTasa(0.08);
      const g0 = r2(total - g16 - g8);
      const ivaTrasladado = suma(cobros, (m) => m.d.iva);
      const ivaRet = suma(cobros, (m) => m.d.ivaRet);
      // Entradas del mes que NO se suman a la declaración: "Otro ingreso" o cobros con fecha fuera del régimen
      const noSumadas = activo ? delMes.filter((m) => m.tipo === 'entrada' && !(m.d.fiscal && m.d.regimen === 'resico')
        && ((m.d.clase === 'libre' && vigente(perfil, 'resico', m.fecha)) || (m.d.regimen === 'resico' && !m.d.fiscal))) : [];
      const gastosAct = delMes.filter((m) => m.tipo === 'salida' && m.d.clase === 'actividad');
      const ivaAcred = activo ? suma(gastosAct, (m) => m.d.ivaAcreditable) : 0;
      const ivaNeto = r2(ivaTrasladado - ivaRet - ivaAcred);
      const favorAnterior = favorIva;
      let ivaCargo = 0, favorAplicado = 0;
      if (ivaNeto >= 0) { favorAplicado = Math.min(favorAnterior, ivaNeto); ivaCargo = r2(ivaNeto - favorAplicado); favorIva = r2(favorAnterior - favorAplicado); }
      else favorIva = r2(favorAnterior - ivaNeto);

      // Reparto del ISR del mes entre sus cobros, para el desglose de cada uno
      const extra = r2(Math.max(isrDet, isrRet) - isrRet);
      for (const m of cobros) {
        m.isrPend = total ? r2(extra * m.d.subtotal / total) : 0;
        m.tasaMes = tasa;
      }

      const dec = decls[k];
      const totalPagar = r2(isrCargo + ivaCargo);
      if (dec?.estado === 'pagada' && Math.abs((dec.monto ?? 0) - totalPagar) > 1) {
        avisos.push({ nivel: 'alerta', mes: k, texto: `Cambiaste movimientos de ${k} después de marcar su declaración como pagada. Tal vez debas presentar una complementaria.` });
      }
      if (activo || cobros.length) {
        meses[k] = { clave: k, activo, cobros: cobros.map((m) => m.id), total, tasa, isrDet, isrRet, isrCargo,
          isrFavor: r2(Math.max(0, isrRet - isrDet)), g16, g8, g0, ivaTrasladado, ivaRet, ivaAcred,
          ivaNeto, favorAnterior, favorAplicado, ivaCargo, favorSiguiente: favorIva, totalPagar,
          noSumadas: noSumadas.map((m) => m.id), noSumadasTotal: suma(noSumadas, (m) => m.monto),
          acredNo: gastosAct.filter((m) => !m.d.ivaAcreditable).map((m) => m.id),
          estado: dec?.estado ?? 'pendiente', declaracion: dec ?? null, cerrado: k < ym(hoy), futuro: k > ym(hoy) };
      }
    }
  }

  // 3. Qué es tuyo y qué es del SAT en cada movimiento
  for (const m of movs) {
    const d = m.d;
    m.isrPend ??= 0;
    if (m.tipo === 'entrada') {
      if (d.fiscal && d.regimen === 'resico') {
        m.ivaPend = r2(d.iva - d.ivaRet);
        m.delSat = r2(m.isrPend + m.ivaPend);
        m.retenido = r2(d.isrRet + d.ivaRet);
        m.propio = r2(d.subtotal - d.isrRet - m.isrPend);
      } else {
        m.ivaPend = 0; m.delSat = 0; m.retenido = d.regimen === 'sueldos' ? d.isrRet : 0;
        m.propio = m.monto; // sueldo neto, otros ingresos, o régimen aún sin cálculo
      }
      m.gastoReal = 0;
    } else if (m.tipo === 'salida') {
      m.propio = 0; m.delSat = 0;
      m.gastoReal = d.neutral ? 0 : r2(m.monto - d.ivaAcreditable);
    } else { m.propio = 0; m.gastoReal = 0; m.delSat = 0; }
  }

  // 4. Saldos de cuentas
  const saldoCuentas = cuentas.map((c) => {
    const esDeuda = !(TIPOS_CUENTA[c.tipo]?.activo ?? true);
    let s = Number(c.saldoInicial) || 0;
    for (const m of movs) {
      const sign = esDeuda ? -1 : 1; // en una tarjeta, una salida AUMENTA la deuda
      if (m.tipo === 'entrada' && m.cuenta === c.id) s += sign * m.monto;
      if (m.tipo === 'salida' && m.cuenta === c.id) s -= sign * m.monto;
      if (m.tipo === 'transferencia') {
        if (m.cuenta === c.id) s -= sign * m.monto;
        if (m.cuentaDestino === c.id) s += sign * m.monto;
      }
    }
    return { ...c, esDeuda, saldo: r2(s) };
  });

  // 5. Balance: Tengo, Debo, Disponible real
  const mesesPend = Object.values(meses).filter((x) => !x.futuro && x.estado !== 'pagada');
  const bolsaIsr = suma(mesesPend, (x) => x.isrCargo);
  const bolsaIva = suma(mesesPend, (x) => x.ivaCargo);
  const tengo = suma(saldoCuentas.filter((c) => !c.esDeuda), (c) => c.saldo);
  const deudas = suma(saldoCuentas.filter((c) => c.esDeuda), (c) => c.saldo);
  const bolsa = r2(bolsaIsr + bolsaIva);
  const debo = r2(deudas + bolsa - favorIva);
  const balance = { tengo, deudas, bolsa, bolsaIsr, bolsaIva, favorIva, debo, disponible: r2(tengo - debo),
    inicial: r2(suma(cuentas.filter((c) => TIPOS_CUENTA[c.tipo]?.activo ?? true), (c) => +c.saldoInicial) - suma(cuentas.filter((c) => !(TIPOS_CUENTA[c.tipo]?.activo ?? true)), (c) => +c.saldoInicial)) };

  // 6. Validaciones generales
  for (const m of movs) for (const t of m.d.motivos) if (/no tenías|no estabas/.test(t)) avisos.push({ nivel: 'alerta', movId: m.id, texto: t });
  for (const c of saldoCuentas) if (!c.esDeuda && c.saldo < 0) avisos.push({ nivel: 'alerta', texto: `La cuenta ${c.nombre} quedó en negativo (${c.saldo}). Revisa si falta una entrada.` });
  const pendientesCfdi = movs.filter((m) => !m.cfdi && ((m.tipo === 'salida' && ['deduccion', 'actividad'].includes(m.d.clase)) || (m.tipo === 'entrada' && m.d.fiscal && m.d.regimen !== 'sueldos')));
  const anios = [...new Set(movs.map((m) => +m.fecha.slice(0, 4)))];
  for (const y of anios) {
    const res = suma(movs.filter((m) => m.fecha.startsWith(String(y)) && m.d.fiscal && m.d.regimen === 'resico'), (m) => m.d.subtotal);
    const lim = params(y).resico.limiteAnual;
    if (res > lim) avisos.push({ nivel: 'alerta', texto: `Tus ingresos RESICO de ${y} pasan de $${lim.toLocaleString('es-MX')}. Debes salir del régimen.` });
    else if (res > lim * 0.8) avisos.push({ nivel: 'info', texto: `Llevas el ${Math.round(res / lim * 100)}% del límite anual de RESICO en ${y}.` });
  }

  const foto = { hoy, perfil, movs, meses, cuentas: saldoCuentas, balance, avisos, pendientesCfdi };
  foto.periodo = (a, b) => periodo(foto, a, b);
  foto.anual = (y) => anual(foto, y);
  return foto;
}

/** Indicadores de un periodo (todas las pantallas usan esto). */
export function periodo(foto, a, b) {
  const ms = foto.movs.filter((m) => m.fecha >= a && m.fecha <= b);
  const entradas = suma(ms.filter((m) => m.tipo === 'entrada'), (m) => m.monto);
  const salidas = suma(ms.filter((m) => m.tipo === 'salida'), (m) => m.monto);
  const propios = suma(ms, (m) => m.propio);
  const gastos = suma(ms, (m) => m.gastoReal);
  const delSat = suma(ms, (m) => m.delSat);
  const retenido = suma(ms, (m) => m.retenido);
  const porCategoria = {};
  for (const m of ms) if (m.gastoReal) porCategoria[m.categoria] = r2((porCategoria[m.categoria] ?? 0) + m.gastoReal);
  const porMes = {};
  for (const m of ms) {
    const k = ym(m.fecha);
    porMes[k] ??= { propios: 0, gastos: 0 };
    porMes[k].propios = r2(porMes[k].propios + m.propio);
    porMes[k].gastos = r2(porMes[k].gastos + m.gastoReal);
  }
  const ahorro = r2(propios - gastos);
  const conCfdi = ms.filter((m) => m.tipo === 'salida' && m.gastoReal).length;
  return { movs: ms, entradas, salidas, propios, gastos, ahorro, delSat, retenido,
    tasaAhorro: propios > 0 ? ahorro / propios : 0, porCategoria, porMes,
    facturados: conCfdi ? ms.filter((m) => m.tipo === 'salida' && m.gastoReal && m.cfdi).length / conCfdi : null };
}

/** Colchón: disponible real ÷ promedio de gasto real de los últimos 3 meses cerrados o en curso. */
export function colchon(foto) {
  const k = ym(foto.hoy);
  const ks = [k];
  for (let i = 0; i < 2; i++) { const [y, m] = ks.at(-1).split('-').map(Number); const d = new Date(Date.UTC(y, m - 2, 1)); ks.push(d.toISOString().slice(0, 7)); }
  const conGasto = ks.map((c) => { const [a, b] = rangoMes(c); return periodo(foto, a, b).gastos; }).filter((g) => g > 0);
  if (!conGasto.length) return null;
  const prom = conGasto.reduce((s, g) => s + g, 0) / conGasto.length;
  return foto.balance.disponible / prom;
}

/** Declaración anual: ISR de sueldos (art. 152) con deducciones personales; RESICO informativo. */
export function anual(foto, y) {
  const p = params(y);
  const a = `${y}-01-01`, b = `${y}-12-31`;
  const ms = foto.movs.filter((m) => m.fecha >= a && m.fecha <= b);
  const regs = regimenesEnRango(foto.perfil, a, b);
  const sueldos = ms.filter((m) => m.d.fiscal && m.d.regimen === 'sueldos');
  const ingresosSueldos = suma(sueldos, (m) => m.d.bruto);
  const isrRetenido = suma(sueldos, (m) => m.d.isrRet);
  const estimado = sueldos.some((m) => m.d.estimado);

  const ded = ms.filter((m) => m.tipo === 'salida' && m.d.clase === 'deduccion');
  const ok = ded.filter((m) => m.d.deducible);
  const grupo = (ids) => suma(ok.filter((m) => ids.includes(m.categoria)), (m) => m.monto);
  const general = grupo(['salud', 'seguro_medico']);
  const afore = grupo(['afore']);
  const donativos = grupo(['donativos']);
  const colegiaturas = grupo(['colegiaturas']);
  const ingresos = ingresosSueldos; // ingresos que se acumulan en la anual que calculamos
  const limGeneral = r2(Math.min(umaAnual(p) * p.deducciones.umasAnuales, ingresos * p.deducciones.porcentajeIngresos));
  const limAfore = r2(Math.min(ingresos * p.deducciones.afore.porcentajeIngresos, umaAnual(p) * p.deducciones.afore.umasAnuales));
  const limDonativos = r2(ingresos * p.deducciones.donativos.porcentajeIngresos);
  const topeColegiatura = p.deducciones.colegiaturas.bachillerato; // tope por alumno y nivel; se usa el de bachillerato
  const aplicables = {
    general: Math.min(general, limGeneral),
    afore: Math.min(afore, limAfore),
    donativos: Math.min(donativos, limDonativos),
    colegiaturas: Math.min(colegiaturas, topeColegiatura),
  };
  const totalDeducible = r2(Object.values(aplicables).reduce((s, x) => s + x, 0));
  const base = r2(Math.max(0, ingresos - totalDeducible));
  const isrAnual = isrTarifa(base, p.tarifaAnual);
  const diferencia = r2(isrAnual - isrRetenido);

  // Mismo cálculo sin deducciones: cuánto te ahorran
  const isrSinDed = isrTarifa(ingresos, p.tarifaAnual);

  const mesesRes = Object.values(foto.meses).filter((x) => x.clave.startsWith(String(y)));
  const tieneSueldos = regs.includes('sueldos');
  const tieneResico = regs.includes('resico');
  const otros = regs.filter((r) => r !== 'sueldos');
  const obligado = tieneSueldos && (ingresosSueldos > p.obligacionAnualSueldos || otros.length > 0);

  return {
    anio: y, regs, tieneSueldos, tieneResico,
    sueldos: { ingresos: ingresosSueldos, isrRetenido, estimado, recibos: sueldos.length },
    deducciones: { lista: ded, deducibles: ok, general, afore, donativos, colegiaturas,
      limGeneral, limAfore, limDonativos, topeColegiatura, aplicables, total: totalDeducible },
    base, isrAnual, isrSinDed, ahorroPorDeducciones: r2(isrSinDed - isrAnual), diferencia,
    aCargo: Math.max(0, diferencia), aFavor: Math.max(0, -diferencia), obligado,
    resico: { ingresos: suma(mesesRes, (x) => x.total), isrPagos: suma(mesesRes, (x) => x.isrDet), meses: mesesRes.length,
      limite: p.resico.limiteAnual },
    soloResico: tieneResico && !tieneSueldos && otros.every((r) => r === 'resico'),
    regimenesSinCalculo: regs.filter((r) => !REGIMENES[r]?.calculo),
  };
}

export { vigente };
