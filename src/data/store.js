// Almacén del estado. Hoy guarda en este navegador (localStorage); la sincronización con
// Supabase se conecta aquí mismo en la fase de "App real" sin tocar las pantallas.
import { estadoVacio } from './acciones.js';
import { calcular } from '../core/motor.js';
import { hoyISO } from '../ui/dom.js';

const CLAVE = 'cuenfis:v1';
let estado = cargar();
let foto = null;
const subs = new Set();

function cargar() {
  try {
    const raw = localStorage.getItem(CLAVE);
    if (raw) return { ...estadoVacio(), ...JSON.parse(raw) };
  } catch { /* modo privado o datos dañados */ }
  return estadoVacio();
}

function guardar() {
  try { localStorage.setItem(CLAVE, JSON.stringify(estado)); return true; } catch { return false; /* sin espacio o sin almacenamiento */ }
}

export const getEstado = () => estado;

/** Foto calculada (memorizada hasta el siguiente cambio). */
export function getFoto() {
  const hoy = hoyISO();
  if (!foto || foto.hoy !== hoy) foto = calcular(estado, hoy); // recalcula si cambió el día con la app abierta
  return foto;
}

/** Aplica una acción pura `fn(estado) => estado` y notifica a las pantallas. Devuelve false si no se pudo guardar. */
export function aplicar(fn) {
  estado = fn(estado);
  foto = null;
  const ok = guardar();
  subs.forEach((s) => s());
  return ok;
}

export const suscribir = (fn) => (subs.add(fn), () => subs.delete(fn));

// Pantallas que se vuelven a pintar cuando cambia algo que no son tus datos (p. ej. llegan reglas fiscales nuevas).
const vistas = new Set();
export const alRecalcular = (fn) => (vistas.add(fn), () => vistas.delete(fn));
/** Recalcula la foto sin tocar ni subir tus datos. */
export function recalcular() { foto = null; vistas.forEach((v) => v()); }

export function reemplazar(nuevo) { aplicar(() => ({ ...estadoVacio(), ...nuevo })); }
export function reiniciar() { aplicar(() => estadoVacio()); }
