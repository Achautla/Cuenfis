// Guía de casillas de la declaración: qué va en cada una, de dónde sale y con qué fundamento.
// La usan la pantalla Mi declaración (botón "¿Qué pongo aquí?"), el asistente real (herramienta guia_casilla)
// y el modo demostración, para que las tres expliquen lo mismo.
import { getFoto } from '../data/store.js';
import { reglas, fuente } from '../core/reglas.js';
import { regimenesEnRango } from '../core/regimen.js';

const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

/** id → [impuesto, pestaña del portal, etiqueta tal como aparece, valor(m|anual), explicación, clave de regla] */
export const CASILLAS = {
  isr_ingresos: ['isr', 'Ingresos', 'Total de ingresos efectivamente cobrados', (m) => m.total,
    'Es la suma de lo que de verdad cobraste en el mes por tu actividad en RESICO, sin IVA. No cuenta lo que facturaste y aún no te pagan. Compáralo con el prellenado del SAT: si el SAT muestra de más, usa «Ingresos a disminuir»; si falta algo, «Ingresos adicionales».', 'resico.mensual'],
  isr_tasa: ['isr', 'Determinación', 'Tasa aplicable', (m) => `${r2(m.tasa * 100)}%`,
    'La tasa depende de cuánto cobraste en el mes, según la tabla mensual del RESICO. Se aplica a todo el ingreso del mes, no por tramos.', 'resico.mensual'],
  isr_determinado: ['isr', 'Determinación', 'ISR determinado', (m) => m.isrDet,
    'Es el total de ingresos cobrados multiplicado por la tasa aplicable. El portal lo calcula solo; revisa que coincida.', 'resico.mensual'],
  isr_retenido: ['isr', 'Determinación', 'ISR retenido por personas morales', (m) => m.isrRet,
    'Cuando te paga una empresa (persona moral), te retiene una parte del ISR y te lo entrega en su factura o CFDI de retenciones. Aquí va la suma de esas retenciones del mes.', 'resico.retencionIsrPM'],
  isr_cargo: ['isr', 'Determinación', 'ISR a cargo', (m) => m.isrCargo,
    'Es el ISR determinado menos lo que ya te retuvieron. Si las retenciones son mayores, queda en cero.', 'resico.mensual'],
  iva_16: ['iva', 'Determinación', 'Actividades gravadas a la tasa del 16%', (m) => m.g16,
    'Lo que cobraste en el mes por actividades con IVA general, sin el IVA. Es la base sobre la que se calcula el IVA a cargo.', 'iva.general'],
  iva_8: ['iva', 'Determinación', 'Actividades gravadas a la tasa del 8%', (m) => m.g8,
    'Solo si tienes el estímulo de región fronteriza y te diste de alta en él. Si no, va en cero.', 'iva.frontera'],
  iva_0: ['iva', 'Determinación', 'Actividades gravadas a la tasa del 0%, exentas o no objeto', (m) => m.g0,
    'Cobros que no llevan IVA o que van a tasa 0%. Casi siempre es cero para servicios profesionales.', 'iva.general'],
  iva_total: ['iva', 'Determinación', 'Total de IVA a cargo', (m) => m.ivaTrasladado,
    'Es el IVA que cobraste a tus clientes en el mes (el que aparece en tus facturas).', 'iva.general'],
  iva_retenido: ['iva', 'Determinación', 'IVA retenido', (m) => m.ivaRet,
    'Si te pagó una empresa, normalmente te retiene dos terceras partes del IVA. Aquí va la suma del mes.', 'iva.retencionPM'],
  iva_acreditable: ['iva', 'Determinación', 'IVA acreditable del periodo', (m) => m.ivaAcred,
    'El IVA que pagaste en gastos de tu actividad, con factura a tu RFC y pagados con medio bancario (o en efectivo por montos pequeños). Se captura a mano y se resta del IVA a cargo.', 'topeEfectivo'],
  iva_favor: ['iva', 'Determinación', 'Acreditamiento del saldo a favor de periodos anteriores', (m) => m.favorAplicado,
    'Si en meses anteriores te quedó IVA a favor, puedes restarlo aquí hasta dejar el impuesto en cero. Lo que sobre pasa al mes siguiente.', 'iva.general'],
  iva_cargo: ['iva', 'Determinación', 'Impuesto a cargo', (m) => m.ivaCargo,
    'Es lo que pagarás de IVA este mes después de restar retenciones, IVA acreditable y saldos a favor.', 'iva.general'],
  anual_ingresos: ['anual', 'Ingresos por sueldos y salarios', 'Ingresos por sueldos', (a) => a.sueldos?.ingresos ?? 0,
    'La suma de tus sueldos del año. Debe coincidir con tu constancia de retenciones o tus recibos de nómina (CFDI).', 'tarifaAnual'],
  anual_retenido: ['anual', 'Ingresos por sueldos y salarios', 'ISR retenido por tu patrón', (a) => a.sueldos?.isrRetenido ?? 0,
    'El ISR que tu patrón te descontó durante el año. Aparece en tu constancia de retenciones.', 'tarifaAnual'],
  anual_deducciones: ['anual', 'Deducciones personales', 'Deducciones aplicables', (a) => a.deducciones?.total ?? 0,
    'La suma de tus deducciones personales que cumplen requisitos (factura a tu RFC y pago con tarjeta o transferencia), ya con sus topes.', 'deducciones'],
  anual_base: ['anual', 'Cálculo', 'Base gravable', (a) => a.base ?? 0,
    'Tus ingresos del año menos tus deducciones personales. Sobre esta cantidad se aplica la tarifa anual.', 'tarifaAnual'],
  anual_isr: ['anual', 'Cálculo', 'ISR del ejercicio (tarifa art. 152)', (a) => a.isrAnual ?? 0,
    'El impuesto del año según la tarifa anual del artículo 152 de la Ley del ISR.', 'tarifaAnual'],
};

export const ID_POR_ETIQUETA = Object.fromEntries(Object.entries(CASILLAS).map(([id, c]) => [c[2], id]));
export const IDS_CASILLAS = Object.keys(CASILLAS);

/** Datos de una casilla para un periodo (AAAA-MM para ISR/IVA, AAAA para la anual). */
export function guiaCasilla(id, periodo) {
  const c = CASILLAS[id];
  if (!c) return { error: 'Casilla desconocida' };
  const [impuesto, pestana, etiqueta, valorDe, explicacion, claveRegla] = c;
  const foto = getFoto();
  let datos, anio;
  if (impuesto === 'anual') {
    anio = Number(String(periodo).slice(0, 4));
    if (!Number.isInteger(anio)) return { error: 'Periodo AAAA' };
    datos = foto.anual(anio);
    if (!datos.tieneSueldos) return { error: `No hay sueldos registrados en ${anio}.` };
  } else {
    if (!/^\d{4}-\d{2}$/.test(periodo ?? '')) return { error: 'Periodo AAAA-MM' };
    anio = +periodo.slice(0, 4);
    if (!regimenesEnRango(foto.perfil, `${periodo}-01`, `${periodo}-31`).includes('resico')) return { error: 'El usuario no tiene RESICO en ese mes.' };
    datos = foto.meses[periodo];
    if (!datos) return { error: 'No hay datos de ese mes.' };
  }
  const valor = valorDe(datos);
  const f = fuente(claveRegla, anio);
  return {
    casilla: etiqueta, declaracion: impuesto === 'anual' ? `Anual ${anio}` : `${impuesto.toUpperCase()} simplificado de confianza ${periodo}`, pestana,
    valor, valor_en_portal: typeof valor === 'number' ? Math.round(valor) : valor, explicacion,
    fuente: { documento: f.documento, articulo: f.articulo, enlace: f.url }, reglas_provisionales: reglas(anio).provisional,
  };
}
