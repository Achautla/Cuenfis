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
  try { localStorage.setItem(CLAVE, JSON.stringify(estado)); } catch { /* sin almacenamiento */ }
}

export const getEstado = () => estado;

/** Foto calculada (memorizada hasta el siguiente cambio). */
export function getFoto() {
  if (!foto) foto = calcular(estado, hoyISO());
  return foto;
}

/** Aplica una acción pura `fn(estado) => estado` y notifica a las pantallas. */
export function aplicar(fn) {
  estado = fn(estado);
  foto = null;
  guardar();
  subs.forEach((s) => s());
}

export const suscribir = (fn) => (subs.add(fn), () => subs.delete(fn));

export function reemplazar(nuevo) { aplicar(() => ({ ...estadoVacio(), ...nuevo })); }
export function reiniciar() { aplicar(() => estadoVacio()); }
