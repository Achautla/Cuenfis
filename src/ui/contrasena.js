// Ojito para ver la contraseña mientras se escribe. Se aplica a todos los campos de contraseña de un contenedor.
import { icon } from './icons.js';

export function ojitos(raiz = document) {
  raiz.querySelectorAll('input[type="password"]:not([data-ojito])').forEach((inp) => {
    inp.dataset.ojito = '1';
    const caja = document.createElement('span');
    caja.className = 'pw';
    inp.replaceWith(caja);
    caja.append(inp);
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'pw-ver';
    const pintar = (ver) => {
      b.innerHTML = icon(ver ? 'eye-off' : 'eye');
      b.setAttribute('aria-label', ver ? 'Ocultar contraseña' : 'Mostrar contraseña');
      b.setAttribute('aria-pressed', String(ver));
      b.title = b.getAttribute('aria-label');
    };
    pintar(false);
    // mousedown: que el campo no pierda el foco (el teclado del celular no se cierra)
    b.addEventListener('mousedown', (e) => e.preventDefault());
    b.addEventListener('click', () => {
      const ver = inp.type === 'password';
      const { selectionStart: a, selectionEnd: z } = inp;
      inp.type = ver ? 'text' : 'password';
      pintar(ver);
      inp.focus();
      try { inp.setSelectionRange(a, z); } catch { /* */ }
    });
    // Al enviar el formulario se vuelve a ocultar (el navegador no la guarda como texto visible)
    inp.form?.addEventListener('submit', () => { if (inp.type === 'text') { inp.type = 'password'; pintar(false); } });
    caja.append(b);
  });
}
