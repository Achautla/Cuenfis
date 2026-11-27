// Recordatorios: lo que el usuario debe atender pronto, según SU régimen y sus datos.
// Funciones puras: sirven para la pantalla de Avisos y para las notificaciones del dispositivo.
import { vigente, vigenteEnRango } from './regimen.js';
import { estadoTarjeta } from './deudas.js';
import { pendientesRecurrentes, resumenClientes } from './agenda.js';
import { estadoPresupuestos } from './presupuestos.js';
import { ym } from './motor.js';
import { r2, params } from './fiscal.js';

const dias = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 864e5);
const pad = (n) => String(n).padStart(2, '0');
const nombreMesCorto = (k) => ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'][+k.slice(5) - 1];
const fmt = (n) => '$' + r2(n).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/**
 * @returns {{id, nivel: 'urgente'|'pronto'|'info', titulo, texto, fecha, ruta}[]} ordenados por urgencia y fecha
 */
export function recordatorios(estado, foto, hoy = foto.hoy) {
  const out = [];
  const [y, m] = hoy.split('-').map(Number);

  // Declaraciones mensuales RESICO: vencen el día 17 del mes siguiente (art. 113-E)
  for (const mes of Object.values(foto.meses)) {
    if (mes.futuro || mes.estado === 'pagada' || !mes.cerrado) continue;
    if (mes.estado === 'presentada' && !mes.totalPagar) continue; // presentada en ceros: ya no hay nada que hacer
    const [my, mm] = mes.clave.split('-').map(Number);
    const limite = `${mm === 12 ? my + 1 : my}-${pad(mm === 12 ? 1 : mm + 1)}-17`;
    const d = dias(hoy, limite);
    const vencida = d < 0;
    if (!vencida && d > 10) continue;
    out.push({ id: `decl-${mes.clave}-${mes.estado}`, nivel: vencida || d <= 3 ? 'urgente' : 'pronto', fecha: limite, ruta: 'declaracion',
      titulo: vencida ? `Declaración de ${nombreMesCorto(mes.clave)} vencida` : `Declaración de ${nombreMesCorto(mes.clave)}: ${d === 0 ? 'vence hoy' : `faltan ${d} días`}`,
      texto: mes.estado === 'presentada' ? `Ya la presentaste; falta pagar ${fmt(mes.totalPagar)}.` : mes.totalPagar ? `Total estimado ${fmt(mes.totalPagar)} (ISR + IVA).` : 'Preséntala en ceros aunque no hayas cobrado.' });
  }

  // Tarjetas: fecha límite de pago
  for (const c of foto.cuentas.filter((x) => x.tipo === 'credito')) {
    const t = estadoTarjeta(foto, c, hoy);
    if (!t.configurada || t.cubierto || t.pagoSinIntereses <= 0) continue;
    if (t.diasParaPagar > 5) continue;
    out.push({ id: `tdc-${c.id}-${t.limitePago}`, nivel: t.diasParaPagar <= 2 ? 'urgente' : 'pronto', fecha: t.limitePago, ruta: 'deudas',
      titulo: t.diasParaPagar < 0 ? `Pago de ${c.nombre} vencido` : `Paga ${c.nombre} ${t.diasParaPagar === 0 ? 'hoy' : `en ${t.diasParaPagar} días`}`,
      texto: `${fmt(t.pagoSinIntereses)} para no generar intereses.` });
  }

  // Recurrentes por confirmar
  const pend = pendientesRecurrentes(estado, hoy);
  if (pend.length) out.push({ id: `rec-${pend.map((p) => p.rec.id + p.fecha).join('|')}`, nivel: 'pronto', fecha: pend[0].fecha, ruta: 'recurrentes',
    titulo: pend.length === 1 ? `Confirma ${pend[0].rec.nombre}` : `${pend.length} recurrentes por confirmar`,
    texto: pend.slice(0, 3).map((p) => p.rec.nombre).join(', ') });

  // Facturas vencidas (solo a quien factura)
  if ((estado.facturas ?? []).length) {
    const cx = resumenClientes(estado, hoy);
    if (cx.vencido > 0) out.push({ id: `cxc-${cx.vencido}`, nivel: 'pronto', fecha: hoy, ruta: 'clientes',
      titulo: `Te deben ${fmt(cx.vencido)} vencidos`, texto: 'Da seguimiento a tus clientes.' });
  }

  // Presupuestos excedidos este mes
  const pres = estadoPresupuestos(foto, estado.presupuestos ?? {}, ym(hoy));
  const exc = pres.filas.filter((f) => f.nivel === 'excedido');
  if (exc.length) out.push({ id: `pres-${ym(hoy)}-${exc.map((f) => f.categoria).join('|')}`, nivel: 'info', fecha: hoy, ruta: 'presupuestos',
    titulo: `${exc.length} presupuesto(s) excedido(s)`, texto: 'Revisa en qué categorías te pasaste este mes.' });

  // Anual de personas físicas: abril. Se avisa en marzo y abril a quien tuvo sueldos (u otro régimen que la presenta)
  const anioAnual = y - 1;
  if ((m === 3 || m === 4) && vigenteEnRango(foto.perfil, 'sueldos', `${anioAnual}-01-01`, `${anioAnual}-12-31`)) {
    const an = foto.anual(anioAnual);
    if (an.obligado || an.aFavor) out.push({ id: `anual-${anioAnual}`, nivel: m === 4 ? 'pronto' : 'info', fecha: `${y}-04-30`, ruta: 'declaracion',
      titulo: `Declaración anual ${anioAnual}: hasta el 30 de abril`,
      texto: an.aFavor ? `Saldo a favor estimado ${fmt(an.aFavor)}: preséntala para recuperarlo.` : `A cargo estimado ${fmt(an.aCargo)}.` });
  }

  // RESICO cerca del límite anual de ingresos
  if (vigente(foto.perfil, 'resico', hoy)) {
    const ing = Object.values(foto.meses).filter((x) => x.clave.startsWith(String(y))).reduce((s, x) => s + x.total, 0);
    const lim = params(y).resico.limiteAnual;
    if (ing > lim * 0.8) out.push({ id: `limite-resico-${y}`, nivel: 'urgente', fecha: hoy, ruta: 'declaracion',
      titulo: 'Te acercas al límite de RESICO', texto: `Llevas ${fmt(ing)} de ${fmt(lim)} este año. Si lo pasas, sales del régimen.` });
  }

  const peso = { urgente: 0, pronto: 1, info: 2 };
  return out.sort((a, b) => peso[a.nivel] - peso[b.nivel] || a.fecha.localeCompare(b.fecha));
}
