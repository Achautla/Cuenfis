// Fotos de tickets: se guardan solo en este dispositivo (IndexedDB), nunca en la nube,
// para no llenar el almacenamiento del servidor. La llave es el id del movimiento.
const BD = 'cuenfis-fotos', TABLA = 'fotos';
let abierta = null;

function abrir() {
  if (abierta) return abierta;
  abierta = new Promise((res, rej) => {
    if (typeof indexedDB === 'undefined') { rej(new Error('Este dispositivo no permite guardar fotos.')); return; }
    const r = indexedDB.open(BD, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(TABLA);
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
  return abierta;
}

async function tx(modo, fn) {
  const db = await abrir();
  return new Promise((res, rej) => {
    const t = db.transaction(TABLA, modo);
    const r = fn(t.objectStore(TABLA));
    t.oncomplete = () => res(r?.result);
    t.onerror = () => rej(t.error);
    t.onabort = () => rej(t.error);
  });
}

export const guardarFoto = (id, blob) => tx('readwrite', (s) => s.put({ blob, en: new Date().toISOString() }, id));
export const leerFoto = async (id) => { try { return (await tx('readonly', (s) => s.get(id)))?.blob ?? null; } catch { return null; } };
export const borrarFoto = (id) => tx('readwrite', (s) => s.delete(id)).catch(() => {});
/** Borra todas las fotos de este dispositivo (al cerrar sesión borrando los datos o al eliminar la cuenta). */
export const borrarTodas = () => tx('readwrite', (s) => s.clear()).catch(() => {});
export const idsFotos = async () => { try { return await tx('readonly', (s) => s.getAllKeys()); } catch { return []; } };

/** Borra las fotos que ya no corresponden a ningún movimiento (propuestas descartadas o movimientos borrados). */
export async function limpiarHuerfanas(idsVivos, conservar = []) {
  const vivos = new Set([...idsVivos, ...conservar]);
  for (const id of await idsFotos()) if (!vivos.has(id)) await borrarFoto(id);
}
