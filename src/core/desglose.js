// Desglose de un movimiento: el usuario captura lo recibido o pagado y aquí se separa
// subtotal, IVA y retenciones. Todo lo demás de la app usa este resultado.
import { categoria, REGIMENES } from '../data/catalogo.js';
import { params, r2, estimarBrutoDesdeNeto, isrRetenidoNomina } from './fiscal.js';
import { vigente, actividadConIvaEn } from './regimen.js';

const tasa = (t) => (t === 'exento' || t == null ? 0 : Number(t));

/** Factor que convierte subtotal en lo recibido, según quién pagó. */
export function factorCobro(t, pagador, p) {
  const ret = pagador === 'pm' ? p.resico.retencionIsrPM + t * p.iva.retencionPM : 0;
  return 1 + t - ret;
}

/**
 * @returns {{
 *  clase:string, subtotal:number, iva:number, isrRet:number, ivaRet:number,
 *  bruto?:number, estimado?:boolean, regimen?:string|null, fiscal:boolean,
 *  ivaAcreditable:number, deducible:boolean, motivos:string[], neutral:boolean
 * }}
 */
export function desglosar(mov, perfil) {
  const p = params(+mov.fecha.slice(0, 4));
  const cat = categoria(mov.categoria);
  const monto = Number(mov.monto) || 0;
  const aj = mov.ajuste ?? {};
  const base = { clase: cat.clase, subtotal: monto, iva: 0, isrRet: 0, ivaRet: 0, fiscal: false,
    ivaAcreditable: 0, deducible: false, motivos: [], neutral: false, regimen: null };

  if (mov.tipo === 'transferencia') return { ...base, clase: 'transferencia', neutral: true };

  if (mov.tipo === 'entrada') {
    if (cat.clase !== 'ingreso') return base;
    const regOk = vigente(perfil, cat.reg, mov.fecha);
    const out = { ...base, regimen: cat.reg, fiscal: regOk };
    if (!regOk) out.motivos.push(`Este cobro tiene fecha en la que no estabas en ${REGIMENES[cat.reg].corto}. No se suma a tus declaraciones hasta que lo corrijas.`);

    if (cat.reg === 'sueldos') {
      const dado = Number(mov.sueldoBruto) > 0;
      const isrDado = mov.isrRetenidoNomina != null && mov.isrRetenidoNomina !== '' && Number.isFinite(Number(mov.isrRetenidoNomina));
      // Con el ISR del recibo pero sin el bruto, el bruto es lo depositado más lo retenido
      const bruto = dado ? Number(mov.sueldoBruto) : isrDado ? r2(monto + Number(mov.isrRetenidoNomina)) : estimarBrutoDesdeNeto(monto, p);
      const isrRet = isrDado ? Number(mov.isrRetenidoNomina) : dado ? isrRetenidoNomina(bruto, p) : r2(bruto - monto);
      return { ...out, subtotal: bruto, bruto, isrRet: r2(isrRet), estimado: !dado && !isrDado };
    }

    const t = tasa(mov.tasaIva ?? (perfil?.frontera ? 0.08 : 0.16));
    const pag = mov.pagador ?? 'pf';
    const subtotal = aj.subtotal ?? r2(monto / factorCobro(t, pag, p));
    const iva = aj.iva ?? r2(subtotal * t);
    const isrRet = aj.isrRet ?? (pag === 'pm' ? r2(subtotal * p.resico.retencionIsrPM) : 0);
    const ivaRet = aj.ivaRet ?? (pag === 'pm' ? r2(iva * p.iva.retencionPM) : 0);
    if (!REGIMENES[cat.reg].calculo) out.motivos.push('El cálculo de impuestos de este régimen llega en una fase posterior.');
    if (!mov.cfdi) out.motivos.push('Emite tu factura (CFDI) por este cobro.');
    return { ...out, subtotal, iva, isrRet, ivaRet, exento: (mov.tasaIva ?? null) === 'exento' };
  }

  // Salidas
  if (cat.clase === 'impuestos') return { ...base, neutral: true };
  const t = mov.cfdi ? tasa(mov.tasaIva ?? 0.16) : 0;
  const subtotal = aj.subtotal ?? r2(monto / (1 + t));
  const iva = aj.iva ?? r2(monto - subtotal);
  const out = { ...base, subtotal, iva };
  const efectivo = mov.formaPago === 'efectivo';

  if (cat.clase === 'actividad') {
    const p0 = params(+mov.fecha.slice(0, 4));
    if (!actividadConIvaEn(perfil, mov.fecha)) out.motivos.push('En esta fecha no tenías un régimen con actividad propia; su IVA no se acredita.');
    else if (!mov.cfdi) out.motivos.push('Sin CFDI su IVA no se acredita. Pide la factura a tu RFC.');
    else if (efectivo && monto > p0.topeEfectivo) out.motivos.push(`Pagado en efectivo por más de $${p0.topeEfectivo.toLocaleString('es-MX')}: su IVA no se acredita.`);
    else out.ivaAcreditable = iva;
  }

  if (cat.clase === 'deduccion') {
    if (!mov.cfdi) out.motivos.push('Sin CFDI a tu RFC no será deducible.');
    else if (efectivo) out.motivos.push('Pagado en efectivo: no será deducible. Usa tarjeta o transferencia.');
    else out.deducible = true;
  }
  return out;
}
