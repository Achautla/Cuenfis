// Avisos del dispositivo. Sin servidor de notificaciones push todavía: se muestran al abrir la app
// (y al volver a ella), una sola vez por aviso y por día.
import { recordatorios } from '../core/recordatorios.js';
import { nativo } from '../native.js';

const CLAVE = 'cuenfis:avisados';
const PREF = 'cuenfis:notif';
const pref = () => { try { return localStorage.getItem(PREF) === '1'; } catch { return false; } };

export const soportadas = () => nativo || 'Notification' in window;
export const activas = () => (nativo ? pref() : soportadas() && Notification.permission === 'granted' && pref());
/** ¿El usuario bloqueó los avisos en el navegador? En Android (WebView) no existe Notification: el permiso lo pide la app. */
export const bloqueadas = () => !nativo && 'Notification' in window && Notification.permission === 'denied';

// El plugin es un Proxy que responde a "then": nunca se debe resolver una promesa con él (si no,
// JavaScript llama a LocalNotifications.then(), que no existe, y todo se queda esperando con un error
// suelto en pantalla). Por eso LN() da el módulo y se usa .LocalNotifications.
const LN = () => import('@capacitor/local-notifications');
const idNum = (s) => { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h) % 2_000_000_000; };

// En Android, tocar una notificación lleva a su pantalla
if (nativo) (async () => {
  try { await (await LN()).LocalNotifications.addListener('localNotificationActionPerformed', (a) => { const r = a.notification?.extra?.ruta; if (r) location.hash = `#/${r}`; }); }
  catch (e) { console.error('avisos: escuchar toques', e); }
})();

/** Último error de avisos, para mostrarlo en la pantalla de Avisos y poder diagnosticarlo. */
export let ultimoError = null;
const guardarPref = (v) => { try { localStorage.setItem(PREF, v); } catch { /* */ } };

/**
 * Pide permiso para avisar. Devuelve 'granted', 'denied', 'no-soportado' o 'error'.
 * Android 13 o más pide el permiso de notificaciones (POST_NOTIFICATIONS); antes viene concedido.
 * Si el usuario lo negó dos veces, Android ya no muestra la pregunta: hay que activarlo en Ajustes del teléfono.
 */
export async function activar() {
  ultimoError = null;
  try {
    if (nativo) {
      const { LocalNotifications: ln } = await LN();
      let p = (await ln.checkPermissions()).display;
      if (p !== 'granted') p = (await ln.requestPermissions()).display;
      if (p === 'granted') guardarPref('1');
      return p === 'granted' ? 'granted' : 'denied';
    }
    if (!soportadas()) return 'no-soportado';
    const p = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
    if (p === 'granted') guardarPref('1');
    return p;
  } catch (e) {
    ultimoError = String(e?.message ?? e).slice(0, 160);
    console.error('avisos: activar', e);
    return 'error';
  }
}
export async function desactivar() {
  guardarPref('0');
  try {
    if (nativo) { const { LocalNotifications: ln } = await LN(); const { notifications } = await ln.getPending(); if (notifications.length) await ln.cancel({ notifications: notifications.map((n) => ({ id: n.id })) }); }
  } catch (e) { console.error('avisos: desactivar', e); }
}

/** Android: programa los avisos aunque la app esté cerrada (a las 9:00 de su fecha, o en unos segundos si ya toca hoy). */
async function programarNativo(lista, ya, hoy) {
  const { LocalNotifications: ln } = await LN();
  const { notifications: pend } = await ln.getPending();
  if (pend.length) await ln.cancel({ notifications: pend.map((n) => ({ id: n.id })) });
  const ahora = Date.now();
  const nuevas = [];
  for (const r of lista) {
    const [y, m, d] = r.fecha.split('-').map(Number);
    const nueve = new Date(y, m - 1, d - (r.fecha > hoy ? 1 : 0), 9, 0, 0).getTime(); // un día antes de la fecha límite
    let at = null;
    if (nueve > ahora + 60_000) at = new Date(nueve);
    else if (ya[r.id] !== hoy) { at = new Date(ahora + 3000); ya[r.id] = hoy; }
    if (at) nuevas.push({ id: idNum(r.id), title: r.titulo, body: r.texto, schedule: { at, allowWhileIdle: true }, extra: { ruta: r.ruta } });
  }
  if (nuevas.length) await ln.schedule({ notifications: nuevas.slice(0, 20) });
}

/** Programa o muestra los avisos pendientes. Nunca lanza: un fallo aquí no debe romper la pantalla. */
export async function revisar(estado, foto) {
  try { await revisarSinProteger(estado, foto); }
  catch (e) { ultimoError = String(e?.message ?? e).slice(0, 160); console.error('avisos: revisar', e); }
}
async function revisarSinProteger(estado, foto) {
  if (!activas() || !estado.perfil) return;
  const hoy = foto.hoy;
  let ya = {};
  try { ya = JSON.parse(localStorage.getItem(CLAVE)) ?? {}; } catch { /* */ }
  if (nativo) {
    await programarNativo(recordatorios(estado, foto).filter((r) => r.nivel !== 'info'), ya, hoy);
    try { localStorage.setItem(CLAVE, JSON.stringify(ya)); } catch { /* */ }
    return;
  }
  const lista = recordatorios(estado, foto).filter((r) => r.nivel !== 'info' && ya[r.id] !== hoy);
  if (!lista.length) return;
  const reg = await navigator.serviceWorker?.getRegistration?.().catch(() => null);
  for (const r of lista.slice(0, 3)) {
    const opts = { body: r.texto, tag: r.id, icon: (import.meta.env.BASE_URL ?? '/') + 'icons/icon-192.png', data: { ruta: r.ruta } };
    try { if (reg?.showNotification) await reg.showNotification(r.titulo, opts); else new Notification(r.titulo, opts).onclick = () => { window.focus(); location.hash = `#/${r.ruta}`; }; } catch { /* */ }
    ya[r.id] = hoy;
  }
  // Conserva solo lo de los últimos días
  ya = Object.fromEntries(Object.entries(ya).filter(([, d]) => d >= hoy.slice(0, 8) + '01' || d === hoy));
  try { localStorage.setItem(CLAVE, JSON.stringify(ya)); } catch { /* */ }
}

/* ---------- Noticias (opcional, aparte de los avisos de fechas) ---------- */
const PREF_NOT = 'cuenfis:notif:noticias';
const AVISADAS = 'cuenfis:noticias:avisadas';
export const noticiasActivas = () => { try { return localStorage.getItem(PREF_NOT) === '1' && activas(); } catch { return false; } };
export async function activarNoticias(si) {
  if (!si) { localStorage.setItem(PREF_NOT, '0'); return 'off'; }
  const p = activas() ? 'granted' : await activar();
  if (p === 'granted') localStorage.setItem(PREF_NOT, '1');
  return p;
}

/** Muestra en el dispositivo las noticias nuevas (máximo 2 por vez, cada una una sola vez). */
export async function avisarNoticias(lista) {
  if (!noticiasActivas()) return;
  let ya = [];
  try { ya = JSON.parse(localStorage.getItem(AVISADAS)) ?? []; } catch { /* */ }
  const nuevas = lista.filter((n) => !n.leida && !ya.includes(n.id)).slice(0, 2);
  if (!nuevas.length) return;
  if (nativo) {
    try {
      const { LocalNotifications: ln } = await LN();
      await ln.schedule({ notifications: nuevas.map((n) => ({ id: idNum(`not-${n.id}`), title: n.titulo, body: n.resumen.slice(0, 140), schedule: { at: new Date(Date.now() + 2000) }, extra: { ruta: 'noticias' } })) });
    } catch (e) { console.error('avisos: noticias', e); return; }
  } else {
    const reg = await navigator.serviceWorker?.getRegistration?.().catch(() => null);
    for (const n of nuevas) {
      const opts = { body: n.resumen.slice(0, 140), tag: `not-${n.id}`, icon: (import.meta.env.BASE_URL ?? '/') + 'icons/icon-192.png', data: { ruta: 'noticias' } };
      try { if (reg?.showNotification) await reg.showNotification(n.titulo, opts); else new Notification(n.titulo, opts).onclick = () => { window.focus(); location.hash = '#/noticias'; }; } catch { /* */ }
    }
  }
  try { localStorage.setItem(AVISADAS, JSON.stringify([...ya, ...nuevas.map((n) => n.id)].slice(-200))); } catch { /* */ }
}
