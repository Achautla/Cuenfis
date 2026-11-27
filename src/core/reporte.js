// Reporte para el contador: un solo armado de datos que usan el PDF (impresión) y el Excel.
// Solo incluye las secciones que aplican a los regímenes que tuvo el usuario en el periodo.
import { periodo } from './motor.js';
import { regimenesEnRango } from './regimen.js';
import { recibidoDeFactura } from './agenda.js';
import { REGIMENES, categoria } from '../data/catalogo.js';
import { r2 } from './fiscal.js';

const suma = (xs, k) => r2(xs.reduce((s, x) => s + (Number(x[k]) || 0), 0));

export function reporteContador(estado, foto, desde, hasta) {
  const per = periodo(foto, desde, hasta);
  const regs = regimenesEnRango(foto.perfil, desde, hasta);
  const ms = foto.movs.filter((m) => m.fecha >= desde && m.fecha <= hasta);
  const cuenta = (id) => foto.cuentas.find((c) => c.id === id)?.nombre ?? '';

  const ingresos = ms.filter((m) => m.tipo === 'entrada' && m.d.clase === 'ingreso').map((m) => ({
    fecha: m.fecha, regimen: REGIMENES[m.d.regimen]?.corto ?? '', cliente: m.contraparte ?? '', concepto: m.nota ?? '',
    uuid: m.uuid ?? '', cfdi: !!m.cfdi, subtotal: m.d.subtotal, iva: m.d.iva, isrRet: m.d.isrRet, ivaRet: m.d.ivaRet,
    recibido: m.monto, cuenta: cuenta(m.cuenta), fiscal: m.d.fiscal, estimado: !!m.d.estimado }));

  const gastosActividad = ms.filter((m) => m.tipo === 'salida' && m.d.clase === 'actividad').map((m) => ({
    fecha: m.fecha, proveedor: m.contraparte ?? '', concepto: m.nota ?? '', uuid: m.uuid ?? '', cfdi: !!m.cfdi,
    formaPago: m.formaPago ?? '', total: m.monto, subtotal: m.d.subtotal, iva: m.d.iva, ivaAcreditable: m.d.ivaAcreditable,
    motivo: m.d.motivos[0] ?? '' }));

  const deducciones = ms.filter((m) => m.tipo === 'salida' && m.d.clase === 'deduccion').map((m) => ({
    fecha: m.fecha, tipo: categoria(m.categoria).nombre, proveedor: m.contraparte ?? '', concepto: m.nota ?? '', uuid: m.uuid ?? '',
    cfdi: !!m.cfdi, formaPago: m.formaPago ?? '', monto: m.monto, deducible: m.d.deducible, motivo: m.d.motivos[0] ?? '' }));

  const meses = Object.values(foto.meses).filter((x) => !x.futuro && `${x.clave}-01` <= hasta && `${x.clave}-31` >= desde)
    .sort((a, b) => a.clave.localeCompare(b.clave)).map((x) => {
      const a = estado.declaraciones?.[x.clave]?.acuse ?? {};
      return { clave: x.clave, ingresos: x.total, tasa: x.tasa, isrDet: x.isrDet, isrRet: x.isrRet, isrCargo: x.isrCargo,
        ivaTrasladado: x.ivaTrasladado, ivaRet: x.ivaRet, ivaAcred: x.ivaAcred, favorAplicado: x.favorAplicado, ivaCargo: x.ivaCargo,
        totalPagar: x.totalPagar, estado: x.estado, numOperacion: a.numOperacion ?? '', lineaCaptura: a.lineaCaptura ?? '' };
    });

  const porCobrar = (estado.facturas ?? []).filter((f) => f.estado !== 'cobrada' && f.estado !== 'cancelada' && f.fecha <= hasta)
    .map((f) => ({ cliente: f.cliente, folio: f.folio ?? '', concepto: f.concepto ?? '', fecha: f.fecha, vence: f.vence ?? '',
      subtotal: Number(f.subtotal), esperado: recibidoDeFactura(f), vencida: !!(f.vence && f.vence < hasta) }));

  const sueldos = ingresos.filter((i) => i.regimen === REGIMENES.sueldos.corto);
  return {
    desde, hasta, perfil: { nombre: foto.perfil?.nombre ?? '', rfc: foto.perfil?.rfc ?? '' },
    regimenes: regs.map((r) => REGIMENES[r].nombre),
    resumen: { entradas: per.entradas, salidas: per.salidas, propios: per.propios, gastos: per.gastos, ahorro: per.ahorro, delSat: per.delSat, retenido: per.retenido },
    ingresos, gastosActividad, deducciones, meses, porCobrar,
    totales: {
      ingresos: { subtotal: suma(ingresos, 'subtotal'), iva: suma(ingresos, 'iva'), isrRet: suma(ingresos, 'isrRet'), ivaRet: suma(ingresos, 'ivaRet'), recibido: suma(ingresos, 'recibido') },
      sueldos: { bruto: suma(sueldos, 'subtotal'), isrRet: suma(sueldos, 'isrRet') },
      gastosActividad: { total: suma(gastosActividad, 'total'), iva: suma(gastosActividad, 'iva'), ivaAcreditable: suma(gastosActividad, 'ivaAcreditable') },
      deducciones: { total: suma(deducciones, 'monto'), deducible: suma(deducciones.filter((d) => d.deducible), 'monto') },
      meses: { isrCargo: suma(meses, 'isrCargo'), ivaCargo: suma(meses, 'ivaCargo'), totalPagar: suma(meses, 'totalPagar') },
      porCobrar: suma(porCobrar, 'esperado'),
    },
    secciones: {
      ingresos: ingresos.length > 0,
      resico: meses.length > 0,
      actividad: gastosActividad.length > 0 || regs.some((r) => REGIMENES[r]?.actividad),
      deducciones: deducciones.length > 0,
      porCobrar: porCobrar.length > 0,
    },
  };
}
