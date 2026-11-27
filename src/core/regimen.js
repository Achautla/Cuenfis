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
