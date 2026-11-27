// Lectura del código QR que trae impreso todo CFDI (factura electrónica).
// El QR es una liga al verificador del SAT con: id (folio fiscal), re (RFC emisor), rr (RFC receptor),
// tt (total) y fe (últimos 8 caracteres del sello). Anexo 20 del CFDI 4.0, representación impresa.
const UUID = /^[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$/i;
const RFC = /^[A-ZÑ&]{3,4}\d{6}[A-Z\d]{3}$/i;

/** Devuelve los datos del CFDI si el texto del QR es una liga válida del verificador del SAT; si no, null. */
export function leerQrCfdi(texto) {
  const t = String(texto ?? '').trim();
  let q;
  try {
    const u = new URL(t.replace(/&amp;/g, '&'));
    if (!/(^|\.)sat\.gob\.mx$/i.test(u.hostname)) return null;
    q = u.searchParams;
  } catch {
    // CFDI 3.3 antiguos traen solo la cadena de parámetros: ?re=...&rr=...&tt=...&id=...
    if (!/[?&]?re=.+&rr=.+&tt=.+&id=/i.test(t)) return null;
    q = new URLSearchParams(t.replace(/^\?/, '').replace(/&amp;/g, '&'));
  }
  const id = (q.get('id') ?? '').trim();
  const re = (q.get('re') ?? '').trim().toUpperCase();
  const rr = (q.get('rr') ?? '').trim().toUpperCase();
  const tt = Number((q.get('tt') ?? '').replace(/,/g, ''));
  if (!UUID.test(id) || !RFC.test(re) || !(tt > 0)) return null;
  return { uuid: id.toUpperCase(), rfcEmisor: re, rfcReceptor: RFC.test(rr) ? rr : '', total: Math.round(tt * 100) / 100, sello: q.get('fe') ?? '' };
}

/** Liga oficial para verificar el CFDI en el portal del SAT. */
export const ligaVerificacion = (c) => `https://verificacfdi.facturaelectronica.sat.gob.mx/default.aspx?id=${c.uuid}&re=${encodeURIComponent(c.rfcEmisor)}&rr=${encodeURIComponent(c.rfcReceptor)}&tt=${c.total}&fe=${encodeURIComponent(c.sello)}`;
