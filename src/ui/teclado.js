// Teclado del celular: mientras está abierto se esconden la barra inferior y el botón Registrar
// (le quitan espacio a lo que escribes) y el campo activo se centra en la pantalla.
const UMBRAL = 150; // px que debe achicarse la pantalla para considerar que hay teclado

export function iniciarTeclado() {
  const vv = window.visualViewport;
  let alto = Math.max(window.innerHeight, vv?.height ?? 0);
  const esCampo = (el) => el && (el.tagName === 'TEXTAREA' || (el.tagName === 'INPUT' && !['checkbox', 'radio', 'button', 'submit', 'file', 'range', 'color'].includes(el.type)) || el.isContentEditable);
  const revisar = () => {
    const h = vv?.height ?? window.innerHeight;
    if (!esCampo(document.activeElement)) alto = Math.max(alto, h);
    const abierto = esCampo(document.activeElement) && alto - h > UMBRAL;
    document.documentElement.classList.toggle('teclado', abierto);
    if (abierto) centrar(document.activeElement);
  };
  const centrar = (el) => { try { el.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch { el.scrollIntoView(); } };
  (vv ?? window).addEventListener('resize', revisar);
  window.addEventListener('orientationchange', () => { alto = 0; setTimeout(() => { alto = Math.max(window.innerHeight, vv?.height ?? 0); revisar(); }, 400); });
  document.addEventListener('focusin', (e) => { if (esCampo(e.target)) setTimeout(() => { revisar(); if (document.documentElement.classList.contains('teclado')) centrar(e.target); }, 350); });
  document.addEventListener('focusout', () => setTimeout(revisar, 100));
}
