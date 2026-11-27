import * as nube from '../data/nube.js';
import { primeraVez, resolver, subirAhora, restaurarVersion, conflicto } from '../data/sync.js';
import { getEstado, reiniciar } from '../data/store.js';
import { confirmar } from '../ui/confirmar.js';
import { icon } from '../ui/icons.js';
import { $, esc, toast } from '../ui/dom.js';
import '../styles/views/cuenta.css';

let modo = 'entrar';
let versiones = null;
let ocupado = false;

const FASES = {
  local: ['Solo en este dispositivo', ''], sincronizando: ['Guardando en la nube…', 'info'], 'al-dia': ['Todo guardado en la nube', 'ok'],
  pendiente: ['Cambios por subir', 'warn'], 'sin-conexion': ['Sin conexión: se subirá al volver', 'warn'], conflicto: ['Otro dispositivo guardó cambios', 'warn'], error: ['No se pudo guardar en la nube', 'warn'],
};
export const textoFase = (f) => FASES[f] ?? FASES.local;

const fechaHora = (iso) => new Date(iso).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' });

async function trasEntrar(main) {
  try {
    const r = await primeraVez();
    if (r === 'subido') toast('Sesión iniciada. Tus datos ya se guardan en la nube.', icon('cloud'));
    else if (r === 'traido') { toast('Sesión iniciada. Trajimos tus datos de la nube.', icon('cloud')); location.hash = '#/inicio'; }
    else await elegir(r.elegir, 'Ya tienes datos en la nube y también en este dispositivo');
  } catch (e) { toast(e.message, icon('alert')); }
  render(main);
}

async function elegir(remoto, titulo) {
  const n = remoto.datos?.movimientos?.length ?? 0, l = getEstado().movimientos.length;
  const op = await confirmar({ titulo: `${titulo}. ¿Cuáles usamos?`, peligro: false,
    accion: 'Usar los de la nube', alternativa: 'Usar los de este dispositivo',
    efectos: [`En la nube: ${n} movimiento(s), guardados el ${fechaHora(remoto.actualizado_en)}${remoto.dispositivo ? ` desde ${remoto.dispositivo}` : ''}.`,
      `En este dispositivo: ${l} movimiento(s).`, 'La opción que no elijas queda en el historial de versiones por si la necesitas.'] });
  if (op === true) { await resolver('nube', remoto); toast('Usamos los datos de la nube', icon('cloud')); }
  else if (op === 'alt') { await resolver('local', remoto); toast('Subimos los datos de este dispositivo', icon('cloud')); }
}

export function render(main) {
  const s = nube.getSync();
  const u = s.usuario;
  const nueva = location.hash.includes('nueva=1');
  const [txt, cls] = textoFase(s.fase);

  if (!nube.disponible) {
    main.innerHTML = `<section class="view"><div class="page-head"><h1>Cuenta y nube</h1></div><div class="card empty">${icon('cloud')}<p>La conexión con la nube no está configurada en esta versión. Tus datos se guardan en este dispositivo.</p></div></section>`;
    return;
  }

  main.innerHTML = `<section class="view cuenta">
    <div class="page-head"><div><h1>Cuenta y nube</h1><p class="sub">Con tu cuenta, tus datos se guardan de forma privada en la nube y los ves en cualquier dispositivo.</p></div></div>
    ${u ? `
    <div class="card cu-estado">
      <span class="cu-ico">${icon('user')}</span>
      <div><b>${esc(u.email)}</b><span class="chip ${cls}">${icon('cloud')}${esc(txt)}</span>
        <span class="small muted">${s.en ? `Último guardado: ${esc(fechaHora(s.en))}` : ''}${s.version ? ` · versión ${s.version}` : ''}</span>
        ${s.error && s.fase !== 'al-dia' ? `<span class="small muted">${esc(s.error)}</span>` : ''}</div>
      <span class="spacer"></span>
      <button class="btn" id="sync" ${ocupado ? 'disabled' : ''}>${icon('cloud')}Guardar ahora</button>
    </div>
    ${s.fase === 'conflicto' ? `<div class="notice warn">${icon('alert')}<span><b>Otro dispositivo guardó cambios mientras usabas este.</b>Para no perder nada, elige qué versión conservar. La otra queda en el historial. <button class="btn sm" id="resolver" style="margin-top:8px">Elegir versión</button></span></div>` : ''}
    ${nueva ? `<form class="card" id="fNueva"><div class="card-head"><h2>Nueva contraseña</h2></div>
      <label class="field"><span>Contraseña nueva</span><input name="p" type="password" minlength="8" required autocomplete="new-password" /><span class="hint">Mínimo 8 caracteres.</span></label>
      <button class="btn primary">${icon('check')}Guardar contraseña</button></form>` : ''}
    <div class="card">
      <div class="card-head"><h2>${icon('history')} Versiones anteriores</h2><span class="spacer"></span>${versiones ? '' : '<button class="btn sm" id="verVers">Ver versiones</button>'}</div>
      <p class="small muted">Guardamos tus últimas 30 versiones. Si borraste o cambiaste algo por error, puedes regresar a una de ellas.</p>
      ${versiones ? (versiones.length ? `<ul class="cu-vers">${versiones.map((v) => `<li><span><b>Versión ${v.version}</b><span class="small muted">${esc(fechaHora(v.guardado_en))}${v.dispositivo ? ` · ${esc(v.dispositivo)}` : ''}</span></span><button class="btn sm" data-ver="${v.id}" data-n="${v.version}">Restaurar</button></li>`).join('')}</ul>` : '<p class="small muted">Aún no hay versiones anteriores.</p>') : ''}
    </div>
    <div class="card">
      <div class="card-head"><h2>Sesión</h2></div>
      <div class="row"><button class="btn" id="salir">${icon('logout')}Cerrar sesión</button><button class="btn danger" id="borrarNube">${icon('trash')}Borrar mis datos de la nube</button></div>
    </div>`
    : `
    <div class="card cu-form">
      <div class="seg full" role="group" aria-label="Acceso">${[['entrar', 'Iniciar sesión'], ['crear', 'Crear cuenta']].map(([k, t]) => `<button data-modo="${k}" aria-pressed="${modo === k}">${t}</button>`).join('')}</div>
      <form id="fAcceso" novalidate>
        <label class="field"><span>Correo</span><input name="email" type="email" required autocomplete="email" inputmode="email" /></label>
        ${modo !== 'recuperar' ? `<label class="field"><span>Contraseña</span><input name="p" type="password" minlength="8" required autocomplete="${modo === 'crear' ? 'new-password' : 'current-password'}" />${modo === 'crear' ? '<span class="hint">Mínimo 8 caracteres. Usa una que no uses en otro lado.</span>' : ''}</label>` : '<p class="small muted" style="margin-bottom:12px">Te enviaremos un enlace para crear una contraseña nueva.</p>'}
        <p class="small neg" id="errAcceso" role="alert"></p>
        <button class="btn primary full" ${ocupado ? 'disabled' : ''}>${icon(modo === 'recuperar' ? 'check' : 'user')}${modo === 'entrar' ? 'Iniciar sesión' : modo === 'crear' ? 'Crear cuenta' : 'Enviar enlace'}</button>
      </form>
      ${modo === 'entrar' ? '<button class="link-btn" data-modo="recuperar">Olvidé mi contraseña</button>' : modo === 'recuperar' ? '<button class="link-btn" data-modo="entrar">Volver a iniciar sesión</button>' : ''}
    </div>
    <div class="notice">${icon('lock')}<span><b>Puedes seguir sin cuenta.</b>Tus datos se quedan solo en este dispositivo. Si inicias sesión después, te preguntaremos qué hacer con ellos antes de mover nada.</span></div>`}
    <p class="disclaimer">Tus datos están protegidos con seguridad por usuario: nadie más puede leerlos. Nunca te pediremos tu contraseña del SAT.</p>
  </section>`;

  main.querySelectorAll('[data-modo]').forEach((b) => (b.onclick = () => { modo = b.dataset.modo; render(main); }));
  const fa = $('#fAcceso', main);
  if (fa) fa.onsubmit = async (ev) => {
    ev.preventDefault();
    const email = fa.email.value.trim(), p = fa.p?.value ?? '';
    const err = $('#errAcceso', main);
    if (!/^\S+@\S+\.\S+$/.test(email)) { err.textContent = 'Escribe un correo válido, por ejemplo nombre@correo.com.'; fa.email.focus(); return; }
    if (modo !== 'recuperar' && p.length < 8) { err.textContent = 'La contraseña necesita al menos 8 caracteres.'; fa.p.focus(); return; }
    ocupado = true; err.textContent = '';
    try {
      if (modo === 'entrar') { await nube.entrar(email, p); ocupado = false; await trasEntrar(main); return; }
      if (modo === 'crear') {
        const r = await nube.registrarse(email, p);
        if (r.confirmar) { toast('Te enviamos un correo. Abre el enlace para activar tu cuenta y luego inicia sesión.', icon('check-circle')); modo = 'entrar'; }
        else { ocupado = false; await trasEntrar(main); return; }
      }
      if (modo === 'recuperar') { await nube.recuperar(email); toast('Si el correo tiene cuenta, te llegará un enlace en unos minutos.', icon('check-circle')); modo = 'entrar'; }
    } catch (e) { err.textContent = e.message; }
    ocupado = false; render(main);
  };

  $('#sync', main)?.addEventListener('click', async () => { ocupado = true; render(main); await subirAhora(); ocupado = false; render(main); });
  $('#resolver', main)?.addEventListener('click', () => elegir(conflicto(), 'Hay una versión más nueva en la nube'));
  const fn = $('#fNueva', main);
  if (fn) fn.onsubmit = async (ev) => { ev.preventDefault(); try { await nube.cambiarPassword(fn.p.value); toast('Contraseña actualizada', icon('check-circle')); location.hash = '#/cuenta'; } catch (e) { toast(e.message, icon('alert')); } };
  $('#verVers', main)?.addEventListener('click', async () => { try { versiones = await nube.versionesAnteriores(); } catch (e) { toast(e.message, icon('alert')); } render(main); });
  main.querySelectorAll('[data-ver]').forEach((b) => (b.onclick = async () => {
    if (!(await confirmar({ titulo: `¿Regresar a la versión ${b.dataset.n}?`, accion: 'Restaurar versión', peligro: false,
      efectos: ['Tus datos de hoy se reemplazan por los de esa versión.', 'Lo que tienes ahora no se pierde: queda guardado como otra versión en esta lista.'] }))) return;
    try { await restaurarVersion(b.dataset.ver); versiones = null; toast('Versión restaurada', icon('history')); } catch (e) { toast(e.message, icon('alert')); }
  }));
  $('#salir', main)?.addEventListener('click', async () => {
    const pend = ['pendiente', 'sin-conexion', 'error', 'conflicto'].includes(nube.getSync().fase);
    const op = await confirmar({ titulo: '¿Cerrar sesión en este dispositivo?', peligro: pend,
      accion: 'Cerrar sesión y borrar de aquí', alternativa: 'Cerrar sesión y dejar mis datos aquí',
      efectos: [...(pend ? ['Hay cambios que no se han subido a la nube. Si borras los datos de aquí, se perderán.'] : ['Todo está guardado en la nube.']),
        'Si es un dispositivo compartido, borra tus datos de aquí: los recuperas al volver a entrar.'] });
    if (!op) return;
    await nube.salir();
    if (op === true) { reiniciar(); location.hash = '#/inicio'; }
    toast('Sesión cerrada', icon('logout'));
    render(main);
  });
  $('#borrarNube', main)?.addEventListener('click', async () => {
    if (!(await confirmar({ titulo: '¿Borrar tus datos de la nube?', accion: 'Borrar de la nube', escribir: 'BORRAR',
      efectos: ['Se borra tu información guardada en la nube. Los datos de este dispositivo se quedan.', 'Tus otros dispositivos ya no podrán sincronizar hasta que vuelvas a guardar.', 'No se puede deshacer.'] }))) return;
    try { await nube.borrarNube(); toast('Datos de la nube borrados', icon('trash')); } catch (e) { toast(e.message, icon('alert')); }
    render(main);
  });
}
