// Puente con Android (Capacitor). En el navegador todo sigue funcionando como siempre.
import { Capacitor, registerPlugin } from '@capacitor/core';

export const nativo = Capacitor.isNativePlatform();

// Plugin propio (android/.../ImpresoraPlugin.java): imprime la pantalla actual o la guarda como PDF
const Impresora = registerPlugin('Impresora');

/** Imprimir o guardar como PDF. En Android abre el diálogo de impresión del sistema. */
export function imprimir(nombre) {
  if (nativo) return Impresora.imprimir({ nombre });
  const t0 = document.title; document.title = nombre; window.print(); document.title = t0;
  return Promise.resolve();
}

const aBase64 = (blob) => new Promise((ok, mal) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(',')[1]); r.onerror = mal; r.readAsDataURL(blob); });

/** En Android no hay "descargas": se guarda el archivo y se abre el menú Compartir (Drive, Archivos, WhatsApp...). */
export async function compartirArchivo(nombre, contenido, tipo) {
  const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem');
  const { Share } = await import('@capacitor/share');
  const texto = typeof contenido === 'string';
  const { uri } = await Filesystem.writeFile({ path: nombre, directory: Directory.Cache, recursive: true,
    data: texto ? contenido : await aBase64(contenido instanceof Blob ? contenido : new Blob([contenido], { type: tipo })),
    ...(texto ? { encoding: Encoding.UTF8 } : {}) });
  await Share.share({ title: nombre, files: [uri], dialogTitle: 'Guardar o enviar' });
}

/** Dirección pública de la app (para enlaces de correo: confirmar cuenta o cambiar contraseña). */
export const URL_PUBLICA = 'https://achautla.github.io/Cuenfis/';
