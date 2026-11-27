// Avisos del dispositivo. Sin servidor de notificaciones push todavía: se muestran al abrir la app
// (y al volver a ella), una sola vez por aviso y por día.
import { recordatorios } from '../core/recordatorios.js';

const CLAVE = 'cuenfis:avisados';
const PREF = 'cuenfis:notif';

export const soportadas = () => 'Notification' in window;
export const activas = () => soportadas() && Notification.permission === 'granted' && localStorage.getItem(PREF) === '1';

export async function activar() {
  if (!soportadas()) return 'no-soportado';
  const p = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
  if (p === 'granted') localStorage.setItem(PREF, '1');
  return p;
}
export function desactivar() { localStorage.setItem(PREF, '0'); }

export async function revisar(estado, foto) {
  if (!activas() || !estado.perfil) return;
  const hoy = foto.hoy;
  let ya = {};
  try { ya = JSON.parse(localStorage.getItem(CLAVE)) ?? {}; } catch { /* */ }
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
