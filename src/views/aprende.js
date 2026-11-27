import { getFoto } from '../data/store.js';
import { periodo, rangoMes, ym } from '../core/motor.js';
import { regimenesEn } from '../core/regimen.js';
import { icon } from '../ui/icons.js';
import { esc, money, pct } from '../ui/dom.js';
import '../styles/views/aprende.css';

// Cada tarjeta declara para qué regímenes aplica ('*' = todos). Así nadie ve consejos de un régimen que no tiene.
const TARJETAS = [
  { regs: '*', i: 'piggy', t: 'Págate primero', p: 'El día que cobres, aparta tu ahorro antes de gastar. Una meta sana es al menos 10% de lo que es tuyo.' },
  { regs: '*', i: 'lifebuoy', t: 'Fondo de emergencia', p: 'Junta de 3 a 6 meses de tus gastos en una cuenta aparte. En Inicio, "Colchón" te dice cuántos meses llevas.' },
  { regs: '*', i: 'credit-card', t: 'Tu tarjeta de crédito no es dinero extra', p: 'Cada compra con tarjeta aumenta lo que debes. Paga el total antes de la fecha límite para no generar intereses.' },
  { regs: '*', i: 'receipt', t: '¿Qué es un CFDI?', p: 'Es la factura electrónica. Sin ella el SAT no reconoce un gasto como deducible ni su IVA como acreditable. Pídela siempre a tu RFC.' },
  { regs: '*', i: 'shield', t: 'Opinión de cumplimiento', p: 'Revísala en el portal del SAT: muestra si tienes declaraciones pendientes. Mantenerla positiva te evita multas y problemas con clientes.' },
  { regs: ['sueldos'], i: 'briefcase', t: 'Tu recibo de nómina', p: 'Tu patrón ya te retiene el ISR cada quincena. Guarda tus CFDI de nómina: con ellos se calcula tu anual.' },
  { regs: ['sueldos'], i: 'heart', t: 'Deducciones personales', p: 'Médicos, dentista, seguro de gastos médicos, colegiaturas y aportaciones voluntarias al retiro bajan tu ISR en la anual. Paga con tarjeta o transferencia y pide CFDI.' },
  { regs: ['sueldos'], i: 'calendar', t: 'Saldo a favor en abril', p: 'Si en el año te retuvieron más ISR del que te toca, la declaración anual te lo regresa. Las deducciones personales lo aumentan.' },
  { regs: ['resico'], i: 'landmark', t: 'El IVA no es tuyo', p: 'En RESICO cobras IVA a tus clientes, pero ese dinero es del SAT: solo pasa por tus manos. Por eso Cuenfis lo separa en la bolsa SAT.' },
  { regs: ['resico'], i: 'file', t: 'Declara cada mes, aunque sea en ceros', p: 'Tu pago de RESICO es mensual y definitivo, a más tardar el día 17. Omitir 3 meses en un año te saca del régimen.' },
  { regs: ['resico'], i: 'building', t: 'Cuando te paga una empresa', p: 'Una persona moral te retiene 1.25% de ISR y 2/3 del IVA. Captura lo que te llegó y Cuenfis calcula lo retenido.' },
  { regs: ['resico'], i: 'laptop', t: 'Gastos de tu actividad', p: 'Equipo, internet o software con CFDI bajan tu IVA del mes. Si pasan de $2,000, págalos con tarjeta o transferencia.' },
];

export function render(main) {
  const foto = getFoto();
  const regs = regimenesEn(foto.perfil, foto.hoy);
  const [a, b] = rangoMes(ym(foto.hoy));
  const mes = periodo(foto, a, b);
  const din = [];
  if (mes.propios && mes.tasaAhorro < 0.1) din.push({ i: 'trending', t: `Este mes ahorras ${pct(mes.tasaAhorro)}`, p: 'Estás por debajo del 10%. Revisa en Indicadores en qué categoría se va más tu dinero.', alerta: true });
  const dedMal = foto.movs.filter((m) => m.d.clase === 'deduccion' && !m.d.deducible).length;
  if (dedMal && regs.includes('sueldos')) din.push({ i: 'alert', t: `${dedMal} gasto(s) deducibles no cumplen requisitos`, p: 'Les falta CFDI o se pagaron en efectivo. Pide la factura y paga con medios bancarios para deducirlos.', alerta: true });
  if (foto.pendientesCfdi.length) din.push({ i: 'receipt', t: `${foto.pendientesCfdi.length} factura(s) pendiente(s)`, p: 'Tienes movimientos que necesitan CFDI. Búscalos en Movimientos con la etiqueta "Sin CFDI".', alerta: true });
  if (foto.balance.bolsa > 0) din.push({ i: 'landmark', t: `Aparta ${money(foto.balance.bolsa)} para el SAT`, p: 'Es lo que llevas de ISR e IVA sin pagar. Ya está restado de tu disponible real.', alerta: true });
  const tarjetas = TARJETAS.filter((x) => x.regs === '*' || x.regs.some((r) => regs.includes(r)));

  main.innerHTML = `<section class="view">
    <div class="page-head"><div><h1>Aprende</h1><p class="sub">Consejos para tu situación${regs.length ? `: ${esc(regs.map((r) => ({ sueldos: 'sueldos', resico: 'RESICO' })[r] ?? r).join(' y '))}` : ''}.</p></div></div>
    ${din.length ? `<div class="tips">${din.map((x) => `<article class="card tip alerta"><span class="tip-ico">${icon(x.i)}</span><h2>${esc(x.t)}</h2><p>${esc(x.p)}</p></article>`).join('')}</div>` : ''}
    <div class="tips">${tarjetas.map((x) => `<article class="card tip"><span class="tip-ico">${icon(x.i)}</span><h2>${esc(x.t)}</h2><p>${esc(x.p)}</p></article>`).join('')}</div>
  </section>`;
}
