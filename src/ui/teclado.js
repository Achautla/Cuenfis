// Teclado del celular: mientras está abierto se esconden la barra inferior y el botón Registrar
// (le quitan espacio a lo que escribes) y el campo activo se centra en la pantalla.
const UMBRAL = 150; // px que debe achicarse la pantalla para considerar que hay teclado

export function iniciarTeclado() {
  const vv = window.visualViewport;
  // Alto de la pantalla sin teclado, por ancho (cada orientación o ventana tiene el suyo).
  // Se actualiza cada vez que no hay un campo activo, así sigue a la ventana si cambia de tamaño.
  const altos = new Map();
  const ancho = () => Math.round(window.innerWidth);
  // El zoom con dos dedos achica visualViewport.height sin que haya teclado: se descuenta con vv.scale
  const altoVisible = () => (vv ? vv.height * (vv.scale || 1) : window.innerHeight);
  altos.set(ancho(), Math.max(window.innerHeight, altoVisible()));
  const esCampo = (el) => el && (el.tagName === 'TEXTAREA' || (el.tagName === 'INPUT' && !['checkbox', 'radio', 'button', 'submit', 'file', 'range', 'color'].includes(el.type)) || el.isContentEditable);
  const revisar = () => {
    const h = altoVisible();
    const campo = esCampo(document.activeElement);
    if (!campo) altos.set(ancho(), h);
    const abierto = !!campo && (altos.get(ancho()) ?? h) - h > UMBRAL;
    document.documentElement.classList.toggle('teclado', abierto);
    if (abierto) centrar(document.activeElement);
  };
  const centrar = (el) => { try { el.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch { el.scrollIntoView(); } };
  (vv ?? window).addEventListener('resize', revisar);
  window.addEventListener('orientationchange', () => setTimeout(revisar, 400));
  document.addEventListener('focusin', (e) => { if (esCampo(e.target)) setTimeout(() => { revisar(); if (document.documentElement.classList.contains('teclado')) centrar(e.target); }, 350); });
  document.addEventListener('focusout', () => setTimeout(revisar, 100));
}
