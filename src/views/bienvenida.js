import { aplicar, reemplazar } from '../data/store.js';
import { REGIMENES } from '../data/catalogo.js';
import { datosDemo } from '../data/demo.js';
import { icon } from '../ui/icons.js';
import { $, esc, hoyISO } from '../ui/dom.js';
import { leyenda } from '../ui/fuente.js';
import '../styles/views/bienvenida.css';

export function render(main) {
  const hoy = hoyISO();
  main.innerHTML = `<section class="view welcome">
    <div class="welcome-card card">
      <img src="${import.meta.env.BASE_URL}icons/icon.svg" alt="" width="48" height="48" />
      <h1>Bienvenido a Cuenfis</h1>
      <p class="muted">Registra lo que entra y sale de tus cuentas. Cuenfis separa solo lo que es tuyo y lo que es del SAT, y te deja los números como los pide tu declaración.</p>
      <form id="fBienv">
        <label class="field"><span>¿Cómo te llamas?</span><input name="nombre" required autocomplete="given-name" /></label>
        <fieldset class="regs"><legend>¿Cómo ganas dinero? Marca todo lo que aplique</legend>
          ${Object.entries(REGIMENES).map(([k, r]) => `<label class="check"><input type="checkbox" name="reg" value="${k}" ${k === 'sueldos' ? 'checked' : ''} /><span>${esc(r.nombre)}<small>${{
            sueldos: 'Tienes un empleo con recibo de nómina.',
            resico: 'Trabajas por tu cuenta, facturas y ganas menos de $3.5 millones al año.',
            honorarios: 'Régimen general de personas físicas con actividad.',
            arrendamiento: 'Rentas una casa, local o departamento.',
            plataformas: 'Vendes o das servicios en apps (Uber, Airbnb, Mercado Libre...).',
          }[k]}${r.calculo ? '' : ' Por ahora solo registro.'}</small></span></label>`).join('')}
        </fieldset>
        <div class="cols-2">
          <label class="field"><span>¿Desde qué fecha empiezas a registrar?</span><input type="date" name="desde" required value="${hoy.slice(0, 4)}-01-01" /></label>
          <label class="field"><span>¿Cuánto tienes hoy en tu cuenta de débito?</span><input type="number" name="saldo" step="0.01" min="0" inputmode="decimal" placeholder="0.00" /></label>
        </div>
        <label class="check"><input type="checkbox" name="frontera" /><span>Vivo en región fronteriza norte o sur<small>Aplica IVA del 8% en tus cobros.</small></span></label>
        <button class="btn primary big">${icon('check')}Empezar</button>
        <button type="button" class="btn ghost" id="demo">${icon('sparkle')}Explorar con datos de ejemplo</button>
        <a class="btn ghost" href="#/cuenta">${icon('cloud')}Ya tengo cuenta: iniciar sesión</a>
      </form>
      <p class="disclaimer">Cuenfis da estimaciones con las ${esc(leyenda(new Date().getFullYear()))}. No sustituye la asesoría de un contador. Sin cuenta, tus datos se quedan solo en este dispositivo.<br /><a href="#/privacidad">Aviso de privacidad</a> · <a href="#/terminos">Términos y condiciones</a> · <a href="#/legal">Información legal</a></p>
    </div></section>`;
  $('#fBienv', main).onsubmit = (ev) => {
    ev.preventDefault();
    const f = new FormData(ev.target);
    const regs = f.getAll('reg');
    if (!regs.length) { ev.target.querySelector('legend').classList.add('neg'); return; }
    aplicar((s) => ({ ...s,
      perfil: { nombre: f.get('nombre').trim(), rfc: '', frontera: f.has('frontera'), regimenes: regs.map((reg) => ({ reg, desde: f.get('desde') })) },
      cuentas: s.cuentas.map((c) => (c.id === 'debito' ? { ...c, saldoInicial: Number(f.get('saldo')) || 0 } : c)) }));
    location.hash = '#/inicio';
  };
  $('#demo', main).onclick = () => { reemplazar(datosDemo(hoy)); location.hash = '#/inicio'; };
}
