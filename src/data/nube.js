// Cuenta y sincronización con Supabase. La app es "primero local": todo funciona sin conexión
// y, con sesión iniciada, cada cambio se sube como un documento con número de versión.
import { createClient } from '@supabase/supabase-js';

const URL = import.meta.env.VITE_SUPABASE_URL;
const KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const META = 'cuenfis:nube';

export const disponible = !!(URL && KEY);
export const sb = disponible ? createClient(URL, KEY, { auth: { persistSession: true, autoRefreshToken: true, storageKey: 'cuenfis:auth', detectSessionInUrl: true } }) : null;

let usuario = null;
const subs = new Set();
let estadoSync = { fase: 'local', version: null, error: null, en: null }; // local | sincronizando | al-dia | pendiente | sin-conexion | conflicto | error

const leerMeta = () => { try { return JSON.parse(localStorage.getItem(META)) ?? {}; } catch { return {}; } };
const guardarMeta = (m) => { try { localStorage.setItem(META, JSON.stringify(m)); } catch { /* */ } };
const avisar = () => subs.forEach((f) => f({ usuario, ...estadoSync }));
const fijar = (cambios) => { estadoSync = { ...estadoSync, ...cambios }; avisar(); };

export const getUsuario = () => usuario;
export const getSync = () => ({ usuario, ...estadoSync });
export const alCambiar = (fn) => (subs.add(fn), () => subs.delete(fn));

/** Mensajes de Supabase en español, sin culpar al usuario. */
function mensaje(error) {
  const m = String(error?.message ?? error ?? '');
  if (/Invalid login credentials/i.test(m)) return 'El correo o la contraseña no coinciden. Revisa e inténtalo otra vez.';
  if (/Email not confirmed/i.test(m)) return 'Falta confirmar tu correo. Abre el enlace que te enviamos.';
  if (/already registered|already exists/i.test(m)) return 'Ese correo ya tiene cuenta. Inicia sesión o recupera tu contraseña.';
  if (/Password should be at least/i.test(m)) return 'La contraseña necesita al menos 8 caracteres.';
  if (/rate limit|too many/i.test(m)) return 'Hubo muchos intentos seguidos. Espera un minuto y vuelve a intentar.';
  if (/Failed to fetch|NetworkError|network/i.test(m)) return 'No hay conexión con el servidor. Tus datos siguen guardados en este dispositivo.';
  if (/relation .* does not exist|schema cache/i.test(m)) return 'La nube todavía no está lista. Tus datos siguen en este dispositivo.';
  return 'No pudimos completar la operación. Inténtalo de nuevo en un momento.';
}

export async function iniciar() {
  if (!sb) return null;
  const { data } = await sb.auth.getSession();
  usuario = data.session?.user ?? null;
  if (usuario) fijar({ fase: leerMeta().pendiente ? 'pendiente' : 'al-dia', version: leerMeta().version ?? null });
  sb.auth.onAuthStateChange((_ev, session) => { usuario = session?.user ?? null; if (!usuario) fijar({ fase: 'local', version: null }); else avisar(); });
  return usuario;
}

export async function entrar(email, password) {
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw new Error(mensaje(error));
  usuario = data.user;
  return usuario;
}

export async function registrarse(email, password) {
  const { data, error } = await sb.auth.signUp({ email, password, options: { emailRedirectTo: location.origin + location.pathname } });
  if (error) throw new Error(mensaje(error));
  usuario = data.session?.user ?? null;
  return { usuario, confirmar: !data.session };
}

export async function recuperar(email) {
  const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname + '#/cuenta?nueva=1' });
  if (error) throw new Error(mensaje(error));
}

export async function cambiarPassword(password) {
  const { error } = await sb.auth.updateUser({ password });
  if (error) throw new Error(mensaje(error));
}

export async function salir() {
  await sb.auth.signOut({ scope: 'local' });
  usuario = null;
  guardarMeta({});
  fijar({ fase: 'local', version: null, error: null });
}

/* ---------- Documento en la nube ---------- */

export async function bajar() {
  const { data, error } = await sb.from('espacios').select('datos, version, actualizado_en, dispositivo').eq('user_id', usuario.id).maybeSingle();
  if (error) throw new Error(mensaje(error));
  return data;
}

const dispositivo = () => `${navigator.platform || 'web'} · ${navigator.userAgent.match(/(Chrome|Firefox|Safari|Edg)\/[\d.]+/)?.[0] ?? 'navegador'}`;

/** Sube el estado. Si otro dispositivo guardó una versión más nueva, no la pisa: devuelve { conflicto: remoto }. */
export async function subir(estado) {
  const meta = leerMeta();
  const datos = sinArchivos(estado);
  if (meta.version == null) {
    const { data, error } = await sb.from('espacios').insert({ datos, dispositivo: dispositivo() }).select('version').single();
    if (error) {
      if (error.code === '23505') return { conflicto: await bajar() };
      throw new Error(mensaje(error));
    }
    guardarMeta({ version: data.version, pendiente: false, user: usuario.id });
    return { version: data.version };
  }
  const { data, error } = await sb.from('espacios').update({ datos, dispositivo: dispositivo() })
    .eq('user_id', usuario.id).eq('version', meta.version).select('version');
  if (error) throw new Error(mensaje(error));
  if (!data.length) return { conflicto: await bajar() };
  guardarMeta({ version: data[0].version, pendiente: false, user: usuario.id });
  return { version: data[0].version };
}

/** Adopta el documento de la nube como la versión de este dispositivo. */
export function adoptar(remoto) { guardarMeta({ version: remoto.version, pendiente: false, user: usuario.id }); }
export function marcarPendiente() { const m = leerMeta(); guardarMeta({ ...m, pendiente: true }); }
export const versionLocal = () => leerMeta().version ?? null;

export async function versionesAnteriores() {
  const { data, error } = await sb.from('espacios_historial').select('id, version, guardado_en, dispositivo').eq('user_id', usuario.id).order('version', { ascending: false }).limit(30);
  if (error) throw new Error(mensaje(error));
  return data;
}
export async function leerVersion(id) {
  const { data, error } = await sb.from('espacios_historial').select('datos, version').eq('id', id).single();
  if (error) throw new Error(mensaje(error));
  return data;
}

/** Borra el documento en la nube (y con él, el historial queda solo para el usuario hasta que se borre la cuenta). */
export async function borrarNube() {
  const { error } = await sb.from('espacios').delete().eq('user_id', usuario.id);
  if (error) throw new Error(mensaje(error));
  guardarMeta({});
}

/* ---------- Acuses en Storage ---------- */

// Los archivos no viajan dentro del documento: van a un bucket privado por usuario
function sinArchivos(estado) {
  const decl = Object.fromEntries(Object.entries(estado.declaraciones ?? {}).map(([k, d]) =>
    [k, d.acuse?.archivo ? { ...d, acuse: { ...d.acuse, archivo: undefined } } : d]));
  return { ...estado, declaraciones: decl };
}

export async function subirAcuse(clave, file) {
  const ext = (file.name.split('.').pop() || 'pdf').toLowerCase().replace(/[^a-z0-9]/g, '');
  const ruta = `${usuario.id}/${clave}-${Date.now()}.${ext}`;
  const { error } = await sb.storage.from('acuses').upload(ruta, file, { contentType: file.type, upsert: false });
  if (error) throw new Error(mensaje(error));
  return ruta;
}
export async function urlAcuse(ruta) {
  const { data, error } = await sb.storage.from('acuses').createSignedUrl(ruta, 300);
  if (error) throw new Error(mensaje(error));
  return data.signedUrl;
}
export async function borrarAcuse(ruta) { await sb.storage.from('acuses').remove([ruta]); }

export { mensaje, fijar as fijarSync };
