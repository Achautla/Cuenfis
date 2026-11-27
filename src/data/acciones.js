// Acciones puras sobre el estado. Devuelven un estado nuevo; la persistencia vive en store.js.
import { calcular } from '../core/motor.js';

export const nuevoId = () => (globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`);

const ahora = () => new Date().toISOString();

export function agregarMovimiento(estado, mov) {
  const m = { id: mov.id ?? nuevoId(), ...mov, historial: [{ en: ahora(), accion: 'creado' }] };
  return { ...estado, movimientos: [...estado.movimientos, m] };
}

export function editarMovimiento(estado, id, cambios) {
  return {
    ...estado,
    movimientos: estado.movimientos.map((m) => {
      if (m.id !== id) return m;
      const antes = Object.fromEntries(Object.keys(cambios).filter((k) => m[k] !== cambios[k]).map((k) => [k, m[k]]));
      return { ...m, ...cambios, historial: [...(m.historial ?? []), { en: ahora(), accion: 'editado', antes }] };
    }),
  };
}

export function borrarMovimiento(estado, id) {
  return {
    ...estado,
    movimientos: estado.movimientos.filter((m) => m.id !== id),
    // Si era el cobro de una factura, la factura vuelve a "por cobrar"
    facturas: (estado.facturas ?? []).map((f) => (f.movId === id ? { ...f, estado: 'pendiente', movId: undefined, cobradaEl: undefined } : f)),
  };
}

/* ---------- Recurrentes ---------- */

export function guardarRecurrente(estado, rec) {
  const lista = estado.recurrentes ?? [];
  const existe = lista.some((r) => r.id === rec.id);
  const nuevo = { hechas: [], ...rec, id: rec.id ?? nuevoId() };
  return { ...estado, recurrentes: existe ? lista.map((r) => (r.id === rec.id ? { ...r, ...rec } : r)) : [...lista, nuevo] };
}

export function borrarRecurrente(estado, id) {
  return { ...estado, recurrentes: (estado.recurrentes ?? []).filter((r) => r.id !== id) };
}

/** Confirma una ocurrencia: crea el movimiento (con el monto que diga el usuario) y la marca como hecha. */
export function confirmarRecurrente(estado, id, fecha, monto) {
  const rec = (estado.recurrentes ?? []).find((r) => r.id === id);
  if (!rec) return estado;
  const conMov = agregarMovimiento(estado, { ...rec.plantilla, id: nuevoId(), fecha, monto: Number(monto ?? rec.plantilla.monto), recurrente: id });
  return { ...conMov, recurrentes: conMov.recurrentes.map((r) => (r.id === id ? { ...r, hechas: [...(r.hechas ?? []), fecha] } : r)) };
}

export function omitirRecurrente(estado, id, fecha) {
  return { ...estado, recurrentes: (estado.recurrentes ?? []).map((r) => (r.id === id ? { ...r, hechas: [...(r.hechas ?? []), fecha] } : r)) };
}

/* ---------- Metas ---------- */

export function guardarMeta(estado, meta) {
  const lista = estado.metas ?? [];
  return { ...estado, metas: lista.some((m) => m.id === meta.id) ? lista.map((m) => (m.id === meta.id ? { ...m, ...meta } : m)) : [...lista, { ...meta, id: meta.id ?? nuevoId() }] };
}
export function borrarMeta(estado, id) { return { ...estado, metas: (estado.metas ?? []).filter((m) => m.id !== id) }; }

/* ---------- Facturas por cobrar ---------- */

export function guardarFactura(estado, f) {
  const lista = estado.facturas ?? [];
  return { ...estado, facturas: lista.some((x) => x.id === f.id) ? lista.map((x) => (x.id === f.id ? { ...x, ...f } : x)) : [...lista, { estado: 'pendiente', ...f, id: f.id ?? nuevoId() }] };
}

/**
 * Marca una factura como cobrada: genera la entrada (lo que llegó a tu cuenta) con la categoría
 * del régimen vigente ese día. Solo lo cobrado cuenta para tus impuestos.
 */
export function cobrarFactura(estado, id, { fecha, cuenta, monto, categoria }) {
  const f = (estado.facturas ?? []).find((x) => x.id === id);
  if (!f || f.estado === 'cobrada') return estado;
  const movId = nuevoId();
  const conMov = agregarMovimiento(estado, { id: movId, tipo: 'entrada', categoria, fecha, monto: Number(monto), cuenta,
    formaPago: 'transferencia', pagador: f.pagador ?? 'pf', tasaIva: f.tasaIva ?? 0.16, cfdi: true, uuid: f.uuid, contraparte: f.cliente,
    nota: f.concepto || `Factura ${f.folio ?? ''}`.trim(), factura: id });
  return { ...conMov, facturas: conMov.facturas.map((x) => (x.id === id ? { ...x, estado: 'cobrada', movId, cobradaEl: fecha } : x)) };
}

export function cancelarFactura(estado, id) {
  return { ...estado, facturas: (estado.facturas ?? []).map((x) => (x.id === id && x.estado !== 'cobrada' ? { ...x, estado: 'cancelada' } : x)) };
}

/* ---------- Acuses ---------- */

export function guardarAcuse(estado, clave, acuse) {
  const dec = estado.declaraciones?.[clave] ?? { estado: 'presentada' };
  return { ...estado, declaraciones: { ...estado.declaraciones, [clave]: { ...dec, acuse: { ...(dec.acuse ?? {}), ...acuse } } } };
}

/**
 * Marca la declaración de un mes. Al marcarla "pagada" genera una salida a "Pago al SAT"
 * por el total calculado, desde la cuenta indicada. Así el pago baja Tengo y vacía la bolsa SAT.
 */
export function marcarDeclaracion(estado, clave, nuevoEstado, { cuenta, fecha, hoy }) {
  const foto = calcular(estado, hoy);
  const mes = foto.meses[clave];
  if (!mes) return estado;
  let movimientos = estado.movimientos.filter((m) => !(m.categoria === 'impuestos' && m.declaracion === clave));
  const declaraciones = { ...estado.declaraciones };
  if (nuevoEstado === 'pendiente') delete declaraciones[clave];
  else declaraciones[clave] = { ...(declaraciones[clave] ?? {}), estado: nuevoEstado, monto: mes.totalPagar, isr: mes.isrCargo, iva: mes.ivaCargo, fecha: fecha ?? hoy };
  if (nuevoEstado === 'pagada' && mes.totalPagar > 0) {
    movimientos = [...movimientos, { id: nuevoId(), tipo: 'salida', categoria: 'impuestos', declaracion: clave,
      monto: mes.totalPagar, fecha: fecha ?? hoy, cuenta, formaPago: 'transferencia', cfdi: false,
      nota: `Declaración ${clave} (ISR ${mes.isrCargo} + IVA ${mes.ivaCargo})`, historial: [{ en: ahora(), accion: 'creado' }] }];
  }
  return { ...estado, movimientos, declaraciones };
}

export function estadoVacio() {
  return {
    version: 1,
    perfil: null,
    cuentas: [
      { id: 'efectivo', nombre: 'Efectivo', tipo: 'efectivo', saldoInicial: 0 },
      { id: 'debito', nombre: 'Cuenta de débito', tipo: 'debito', saldoInicial: 0 },
    ],
    movimientos: [],
    declaraciones: {},
    presupuestos: {},
    recurrentes: [],
    metas: [],
    facturas: [],
    preferencias: { metaAhorro: 0, diaAviso: 10 },
  };
}
