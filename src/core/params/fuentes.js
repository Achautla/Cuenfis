// De dónde sale cada dato fiscal. Las leyes cambian poco; lo que cambia cada año
// (tarifas, UMA, subsidio, RMF) se toma de `publicaciones` del año correspondiente.

const LEY = {
  LISR: { nombre: 'Ley del Impuesto sobre la Renta', url: 'https://www.diputados.gob.mx/LeyesBiblio/pdf/LISR.pdf' },
  LIVA: { nombre: 'Ley del Impuesto al Valor Agregado', url: 'https://www.diputados.gob.mx/LeyesBiblio/pdf/LIVA.pdf' },
  CFF: { nombre: 'Código Fiscal de la Federación', url: 'https://www.diputados.gob.mx/LeyesBiblio/pdf/CFF.pdf' },
  RLIVA: { nombre: 'Reglamento de la Ley del IVA', url: 'https://www.diputados.gob.mx/LeyesBiblio/regley/Reg_LIVA.pdf' },
  INEGI: { nombre: 'INEGI, Unidad de Medida y Actualización', url: 'https://www.inegi.org.mx/temas/uma/' },
  DOF: { nombre: 'Diario Oficial de la Federación', url: 'https://www.dof.gob.mx/' },
};

/**
 * clave: ruta del dato dentro de los parámetros del año.
 * regs: regímenes a los que aplica (para mostrarlo solo a quien le sirve).
 * pub: qué publicación anual lo actualiza (clave de `publicaciones`).
 */
export const FUENTES = {
  'resico.mensual': { titulo: 'Tasas mensuales de RESICO', ley: 'LISR', art: 'art. 113-E', regs: ['resico'], formato: 'tasas',
    nota: 'La tasa del tramo se aplica a todo lo cobrado en el mes.' },
  'resico.limiteAnual': { titulo: 'Límite de ingresos para seguir en RESICO', ley: 'LISR', art: 'art. 113-E', regs: ['resico'], formato: 'dinero' },
  'resico.retencionIsrPM': { titulo: 'Retención de ISR cuando te paga una empresa', ley: 'LISR', art: 'art. 113-J', regs: ['resico'], formato: 'porcentaje' },
  'iva.general': { titulo: 'Tasa general de IVA', ley: 'LIVA', art: 'art. 1', regs: ['resico', 'honorarios', 'arrendamiento', 'plataformas'], formato: 'porcentaje' },
  'iva.frontera': { titulo: 'IVA en región fronteriza (estímulo)', ley: 'DOF', art: 'Decreto de estímulos fiscales para la región fronteriza', regs: ['resico', 'honorarios', 'arrendamiento', 'plataformas'], formato: 'porcentaje' },
  'iva.retencionPM': { titulo: 'Parte del IVA que retiene una empresa', ley: 'LIVA', art: 'art. 1-A, y art. 3 del Reglamento', regs: ['resico', 'honorarios', 'arrendamiento'], formato: 'fraccion' },
  diaLimiteMensual: { titulo: 'Día límite de las declaraciones mensuales', ley: 'LISR', art: 'art. 113-E y art. 5-D de la LIVA', regs: ['resico', 'honorarios', 'arrendamiento', 'plataformas'], formato: 'dia' },
  topeEfectivo: { titulo: 'Pago máximo en efectivo para deducir o acreditar', ley: 'LISR', art: 'art. 27 fr. III', regs: ['resico', 'honorarios', 'arrendamiento', 'plataformas', 'sueldos'], formato: 'dinero' },
  tarifaMensual: { titulo: 'Tarifa mensual de ISR (retención de nómina)', ley: 'LISR', art: 'art. 96', pub: 'anexo8', regs: ['sueldos'], formato: 'tarifa' },
  subsidioEmpleo: { titulo: 'Subsidio para el empleo', ley: 'DOF', art: 'Decreto del subsidio para el empleo', pub: 'subsidio', regs: ['sueldos'], formato: 'subsidio' },
  obligacionAnualSueldos: { titulo: 'Sueldos a partir de los que es obligatoria la anual', ley: 'LISR', art: 'art. 98 fr. III', regs: ['sueldos'], formato: 'dinero' },
  tarifaAnual: { titulo: 'Tarifa anual de ISR', ley: 'LISR', art: 'art. 152', pub: 'anexo8', regs: ['sueldos', 'honorarios', 'arrendamiento', 'plataformas'], formato: 'tarifa' },
  uma: { titulo: 'Unidad de Medida y Actualización (UMA) diaria', ley: 'INEGI', art: 'valor publicado en el DOF', pub: 'uma', regs: ['sueldos', 'honorarios', 'arrendamiento', 'plataformas'], formato: 'dinero' },
  deducciones: { titulo: 'Tope general de deducciones personales', ley: 'LISR', art: 'art. 151, último párrafo', regs: ['sueldos', 'honorarios', 'arrendamiento', 'plataformas'], formato: 'topeDeducciones' },
  'deducciones.afore': { titulo: 'Tope de aportaciones voluntarias al retiro', ley: 'LISR', art: 'art. 151 fr. V', regs: ['sueldos', 'honorarios', 'arrendamiento', 'plataformas'], formato: 'topeAfore' },
  'deducciones.donativos': { titulo: 'Tope de donativos', ley: 'LISR', art: 'art. 151 fr. III', regs: ['sueldos', 'honorarios', 'arrendamiento', 'plataformas'], formato: 'topeDonativos' },
  'deducciones.colegiaturas': { titulo: 'Topes anuales de colegiaturas por nivel', ley: 'DOF', art: 'Decreto que compila diversos beneficios fiscales (DOF 26-dic-2013), art. 1.8', regs: ['sueldos', 'honorarios', 'arrendamiento', 'plataformas'], formato: 'colegiaturas' },
};

/** Fuente completa de un dato para un año: documento, artículo, publicación anual y enlace. */
export function fuenteDe(clave, p) {
  const f = FUENTES[clave];
  if (!f) return null;
  const ley = LEY[f.ley];
  return {
    clave, titulo: f.titulo, documento: ley.nombre, articulo: f.art, url: ley.url, nota: f.nota ?? '',
    publicacion: f.pub ? p?.publicaciones?.[f.pub] ?? '' : '',
    rmf: p?.publicaciones?.rmf ?? '',
  };
}
