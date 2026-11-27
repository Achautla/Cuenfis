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
  return { ...estado, movimientos: estado.movimientos.filter((m) => m.id !== id) };
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
  else declaraciones[clave] = { estado: nuevoEstado, monto: mes.totalPagar, isr: mes.isrCargo, iva: mes.ivaCargo, fecha: fecha ?? hoy };
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
    preferencias: { metaAhorro: 0, diaAviso: 10 },
  };
}
