// Vigencia de regímenes: cada movimiento usa el régimen vigente en su fecha.
import { REGIMENES } from '../data/catalogo.js';

/** ¿El régimen `reg` está vigente en `fecha` (YYYY-MM-DD)? */
export function vigente(perfil, reg, fecha) {
  return (perfil?.regimenes ?? []).some(
    (r) => r.reg === reg && r.desde <= fecha && (!r.hasta || fecha <= r.hasta),
  );
}

/** Regímenes vigentes en una fecha. */
export function regimenesEn(perfil, fecha) {
  return [...new Set((perfil?.regimenes ?? [])
    .filter((r) => r.desde <= fecha && (!r.hasta || fecha <= r.hasta))
    .map((r) => r.reg))];
}

/** ¿El régimen estuvo vigente algún día entre a y b? */
export function vigenteEnRango(perfil, reg, a, b) {
  return (perfil?.regimenes ?? []).some(
    (r) => r.reg === reg && r.desde <= b && (!r.hasta || r.hasta >= a),
  );
}

/** Regímenes que tuvo el usuario en algún momento del rango. */
export function regimenesEnRango(perfil, a, b) {
  return [...new Set((perfil?.regimenes ?? [])
    .filter((r) => r.desde <= b && (!r.hasta || r.hasta >= a))
    .map((r) => r.reg))];
}

/** ¿Hay en la fecha algún régimen con actividad propia cuyo IVA calculamos? */
export function actividadConIvaEn(perfil, fecha) {
  return regimenesEn(perfil, fecha).some((reg) => REGIMENES[reg]?.actividad && REGIMENES[reg]?.calculo);
}

/**
 * Categorías que se muestran al capturar, según los regímenes vigentes en la fecha.
 * Un usuario sin RESICO nunca ve "Cobro RESICO"; uno sin actividad propia no ve "Gasto de mi actividad".
 */
export function categoriasDisponibles(perfil, fecha, tipo, CATEGORIAS, actual) {
  const regs = regimenesEn(perfil, fecha);
  const conActividad = actividadConIvaEn(perfil, fecha) || regs.some((r) => REGIMENES[r]?.actividad);
  return CATEGORIAS.filter((c) => c.tipo === tipo && c.clase !== 'impuestos').filter((c) =>
    c.id === actual ||
    (c.clase === 'ingreso' ? regs.includes(c.reg) : c.clase === 'actividad' ? conActividad : true));
}

/** ¿Tiene (o tuvo en el último año) un régimen con actividad propia que facture? Para mostrar Clientes y cobros. */
export function facturaPorActividad(perfil, fecha) {
  const haceUnAnio = `${+fecha.slice(0, 4) - 1}${fecha.slice(4)}`;
  return regimenesEnRango(perfil, haceUnAnio, fecha).some((r) => REGIMENES[r]?.actividad);
}

/** Categoría de ingreso del régimen con actividad vigente en `fecha` (para registrar un cobro). */
export function categoriaDeCobro(perfil, fecha, CATEGORIAS) {
  const regs = regimenesEn(perfil, fecha).filter((r) => REGIMENES[r]?.actividad);
  const orden = [...regs].sort((a, b) => (REGIMENES[b].calculo ? 1 : 0) - (REGIMENES[a].calculo ? 1 : 0));
  return orden.map((r) => CATEGORIAS.find((c) => c.clase === 'ingreso' && c.reg === r)).find(Boolean) ?? null;
}
