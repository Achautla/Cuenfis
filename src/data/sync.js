// Orquesta la sincronización: escucha los cambios del almacén local y los sube a la nube.
import { getEstado, suscribir, reemplazar, aplicar } from './store.js';
import * as nube from './nube.js';

let timer = null;
let aplicandoRemoto = false;
let remotoEnConflicto = null;

export const conflicto = () => remotoEnConflicto;

export function arrancar() {
  if (!nube.disponible) return;
  suscribir(() => {
    if (aplicandoRemoto || !nube.getUsuario() || !getEstado().perfil) return;
    nube.marcarPendiente();
    nube.fijarSync({ fase: 'pendiente' });
    clearTimeout(timer);
    timer = setTimeout(subirAhora, 1500);
  });
  window.addEventListener('online', () => { if (nube.getUsuario() && nube.getSync().fase !== 'al-dia') subirAhora(); });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && nube.getSync().fase === 'pendiente') { clearTimeout(timer); subirAhora(); } });
  nube.iniciar().then(async (u) => {
    if (!u) return;
    if (nube.getSync().fase === 'pendiente') subirAhora();
    else await revisarRemoto();
  });
}

/** Al abrir la app: si otro dispositivo guardó algo más nuevo y aquí no hay cambios, lo trae. */
async function revisarRemoto() {
  try {
    const r = await nube.bajar();
    if (r && r.version !== nube.versionLocal()) usarRemoto(r);
    else nube.fijarSync({ fase: 'al-dia', en: new Date().toISOString() });
  } catch (e) { nube.fijarSync({ fase: 'sin-conexion', error: e.message }); }
}

function usarRemoto(r) {
  aplicandoRemoto = true;
  try { reemplazar(r.datos); } finally { aplicandoRemoto = false; }
  nube.adoptar(r);
  remotoEnConflicto = null;
  nube.fijarSync({ fase: 'al-dia', version: r.version, en: new Date().toISOString(), error: null });
}

export async function subirAhora() {
  clearTimeout(timer);
  if (!nube.getUsuario()) return;
  nube.fijarSync({ fase: 'sincronizando' });
  try {
    await migrarAcuses();
    const res = await nube.subir(getEstado());
    if (res.conflicto) { remotoEnConflicto = res.conflicto; nube.fijarSync({ fase: 'conflicto' }); return; }
    nube.fijarSync({ fase: 'al-dia', version: res.version, en: new Date().toISOString(), error: null });
  } catch (e) {
    nube.fijarSync({ fase: navigator.onLine ? 'error' : 'sin-conexion', error: e.message });
  }
}

/**
 * Primera vez que se inicia sesión en este dispositivo. Devuelve:
 * 'subido' (no había nada en la nube), 'traido' (aquí no había datos), o { elegir: remoto } si ambos tienen datos.
 */
export async function primeraVez() {
  const remoto = await nube.bajar();
  const local = getEstado();
  if (!remoto) { if (local.perfil) await subirAhora(); return 'subido'; }
  if (!local.perfil) { usarRemoto(remoto); return 'traido'; }
  return { elegir: remoto };
}

/** Resuelve un conflicto: 'nube' usa la versión remota; 'local' sobrescribe la nube con este dispositivo. */
export async function resolver(opcion, remoto = remotoEnConflicto) {
  if (opcion === 'nube') { usarRemoto(remoto); return; }
  nube.adoptar(remoto); // toma su versión como base para que el update pase
  remotoEnConflicto = null;
  await subirAhora();
}

export async function restaurarVersion(id) {
  const v = await nube.leerVersion(id);
  aplicar(() => ({ ...v.datos })); // se sube como una versión nueva; la actual queda en el historial
}

/** Los acuses guardados sin sesión viven como archivo en el dispositivo: al tener sesión se suben al bucket privado. */
async function migrarAcuses() {
  const decl = getEstado().declaraciones ?? {};
  for (const [clave, d] of Object.entries(decl)) {
    const a = d.acuse;
    if (!a?.archivo || a.ruta) continue;
    const blob = await (await fetch(a.archivo)).blob();
    const file = new File([blob], a.nombre ?? `acuse-${clave}.pdf`, { type: a.tipo || blob.type });
    const ruta = await nube.subirAcuse(clave, file);
    aplicandoRemoto = true;
    try {
      aplicar((s) => ({ ...s, declaraciones: { ...s.declaraciones, [clave]: { ...s.declaraciones[clave], acuse: { ...s.declaraciones[clave].acuse, ruta, archivo: undefined } } } }));
    } finally { aplicandoRemoto = false; }
  }
}
