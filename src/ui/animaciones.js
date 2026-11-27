// Animaciones ligeras: entrada escalonada de tarjetas, barras que se llenan y números que cuentan.
// Solo al cambiar de pantalla (no en cada guardado) y nunca si el sistema pide reducir movimiento.
const reducir = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const SUAVE = 'cubic-bezier(.2, .7, .2, 1)';
const BLOQUES = ':scope > section > .page-head, :scope > section > .card, :scope > section > .hero, :scope > section > .sat, :scope > section > .notice, :scope > section > .grid > *, :scope > section > .cols > * > .card, :scope > section > div > .card, .rg-lista > *, .ia-rapida, .ia-uso, .ia-chat';

/** Entrada de la pantalla: cada bloque aparece desde abajo, uno tras otro (máximo 14). */
export function entrada(main) {
  if (reducir() || !main?.animate) return;
  const vistos = new Set();
  const bloques = [...main.querySelectorAll(BLOQUES)].filter((el) => {
    if (vistos.has(el) || [...vistos].some((v) => v.contains(el))) return false;
    vistos.add(el);
    return el.getBoundingClientRect().top < innerHeight + 40; // solo lo visible: lo demás ya está listo al bajar
  }).slice(0, 14);
  bloques.forEach((el, i) => el.animate(
    [{ opacity: 0, transform: 'translateY(10px) scale(.985)' }, { opacity: 1, transform: 'none' }],
    { duration: 380, delay: 40 + i * 45, easing: SUAVE, fill: 'backwards' },
  ));
  // Barras de progreso: se llenan de izquierda a derecha
  main.querySelectorAll('.progress i, .ia-uso-bar span').forEach((el, i) => {
    el.style.transformOrigin = 'left';
    el.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: 700, delay: 200 + i * 60, easing: SUAVE, fill: 'backwards' });
  });
}

/** Aparición de un elemento nuevo (por ejemplo, un mensaje del asistente). */
export function aparecer(el, desde = 'abajo') {
  if (reducir() || !el?.animate) return;
  el.animate(
    [{ opacity: 0, transform: desde === 'derecha' ? 'translateX(12px)' : 'translateY(8px)' }, { opacity: 1, transform: 'none' }],
    { duration: 300, easing: SUAVE, fill: 'backwards' },
  );
}

/** Un destello suave para confirmar que algo cambió (un total recalculado, un movimiento guardado). */
export function destello(el) {
  if (reducir() || !el?.animate) return;
  el.animate([{ boxShadow: '0 0 0 0 rgba(63, 95, 224, .45)' }, { boxShadow: '0 0 0 10px rgba(63, 95, 224, 0)' }], { duration: 700, easing: 'ease-out' });
}
