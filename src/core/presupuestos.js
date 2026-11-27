// Presupuestos mensuales por categoría, medidos con el gasto real (sin IVA que recuperas).
import { periodo, rangoMes } from './motor.js';
import { r2 } from './fiscal.js';

export const UMBRAL_AVISO = 0.8;

/** Estado de cada presupuesto en el mes `clave` (YYYY-MM). */
export function estadoPresupuestos(foto, presupuestos = {}, clave) {
  const [a, b] = rangoMes(clave);
  const per = periodo(foto, a, b);
  const filas = Object.entries(presupuestos)
    .filter(([, limite]) => Number(limite) > 0)
    .map(([categoria, limite]) => {
      const gastado = per.porCategoria[categoria] ?? 0;
      const uso = gastado / limite;
      return { categoria, limite: Number(limite), gastado, restante: r2(limite - gastado), uso,
        nivel: uso > 1 ? 'excedido' : uso >= UMBRAL_AVISO ? 'aviso' : 'ok' };
    })
    .sort((x, y) => y.uso - x.uso);
  const total = filas.reduce((s, f) => s + f.limite, 0);
  const gastado = filas.reduce((s, f) => s + f.gastado, 0);
  return { filas, total, gastado: r2(gastado), alertas: filas.filter((f) => f.nivel !== 'ok') };
}

/** ¿Este movimiento hizo cruzar un umbral (80% o 100%) a su presupuesto? Para avisar al guardar. */
export function cruceDeUmbral(fotoAntes, fotoDespues, presupuestos, clave, categoria) {
  if (!presupuestos?.[categoria]) return null;
  const antes = estadoPresupuestos(fotoAntes, presupuestos, clave).filas.find((f) => f.categoria === categoria);
  const despues = estadoPresupuestos(fotoDespues, presupuestos, clave).filas.find((f) => f.categoria === categoria);
  if (!despues || despues.nivel === 'ok' || despues.nivel === antes?.nivel) return null;
  return despues;
}
