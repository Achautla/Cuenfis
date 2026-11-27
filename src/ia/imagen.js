// Fotos de tickets: se achican en el dispositivo antes de guardarlas o enviarlas, y se busca el QR del CFDI.
import jsQR from 'jsqr';

async function cargar(file) {
  if ('createImageBitmap' in window) { try { return await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch { /* sigue con <img> */ } }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally { URL.revokeObjectURL(url); }
}

function lienzo(img, max) {
  const w0 = img.width, h0 = img.height;
  const k = Math.min(1, max / Math.max(w0, h0));
  const c = document.createElement('canvas');
  c.width = Math.round(w0 * k); c.height = Math.round(h0 * k);
  c.getContext('2d', { willReadFrequently: true }).drawImage(img, 0, 0, c.width, c.height);
  return c;
}

const aBlob = (c, calidad) => new Promise((r) => c.toBlob(r, 'image/jpeg', calidad));

/** Prepara una foto: versión ligera para guardar (≈1280 px) y el texto del QR si lo encuentra. */
export async function prepararFoto(file) {
  if (!file?.type?.startsWith('image/')) throw new Error('Elige una imagen (foto del ticket o de la factura).');
  const img = await cargar(file);
  const c = lienzo(img, 1280);
  const blob = await aBlob(c, 0.72);
  const qr = await buscarQr(img, c);
  img.close?.();
  return { blob, qr, ancho: c.width, alto: c.height };
}

async function buscarQr(img, c) {
  // 1) Lector nativo del sistema (Android y la mayoría de los celulares)
  if ('BarcodeDetector' in window) {
    try {
      const det = new window.BarcodeDetector({ formats: ['qr_code'] });
      const r = await det.detect(img);
      if (r[0]?.rawValue) return r[0].rawValue;
    } catch { /* sigue con jsQR */ }
  }
  // 2) jsQR, a dos tamaños (los QR pequeños se leen mejor en la imagen más grande)
  for (const max of [1280, 2000]) {
    const cv = max === 1280 ? c : lienzo(img, max);
    const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height);
    const r = jsQR(d.data, d.width, d.height, { inversionAttempts: 'attemptBoth' });
    if (r?.data) return r.data;
  }
  return null;
}

/** Base64 de un Blob, para mandarlo al asistente. */
export function aBase64(blob) {
  return new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(String(fr.result).split(',')[1]); fr.onerror = rej; fr.readAsDataURL(blob); });
}
