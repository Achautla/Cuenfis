// Catálogo de regímenes y categorías. El trato fiscal vive aquí, no en las pantallas.

export const REGIMENES = {
  sueldos: { nombre: 'Sueldos y salarios', corto: 'Sueldos', actividad: false, calculo: true },
  resico: { nombre: 'Régimen Simplificado de Confianza (RESICO)', corto: 'RESICO', actividad: true, calculo: true },
  honorarios: { nombre: 'Actividad empresarial y profesional', corto: 'Act. empresarial', actividad: true, calculo: false },
  arrendamiento: { nombre: 'Arrendamiento', corto: 'Arrendamiento', actividad: true, calculo: false },
  plataformas: { nombre: 'Plataformas tecnológicas', corto: 'Plataformas', actividad: true, calculo: false },
};

/**
 * clase:
 *  - ingreso:     ingreso fiscal del régimen `reg`
 *  - libre:       ingreso no fiscal (regalo, venta personal ocasional)
 *  - personal:    gasto personal, solo presupuesto
 *  - deduccion:   deducción personal de la anual
 *  - actividad:   gasto de la actividad (IVA acreditable en regímenes con actividad)
 *  - impuestos:   pago al SAT (liquida la bolsa SAT, no es gasto de vida)
 */
export const CATEGORIAS = [
  { id: 'sueldo', tipo: 'entrada', nombre: 'Sueldo', clase: 'ingreso', reg: 'sueldos', icono: 'briefcase', color: '#0f766e',
    tip: 'Captura lo que te depositaron. Si tienes tu recibo de nómina (CFDI), anota el sueldo bruto y el ISR retenido para que la anual sea exacta.' },
  { id: 'cobro_resico', tipo: 'entrada', nombre: 'Cobro RESICO', clase: 'ingreso', reg: 'resico', icono: 'receipt', color: '#1d4ed8',
    tip: 'Captura lo que llegó a tu cuenta. Si te pagó una empresa, la app calcula sola el 1.25% de ISR y los 2/3 de IVA que te retuvo.' },
  { id: 'cobro_honorarios', tipo: 'entrada', nombre: 'Honorarios', clase: 'ingreso', reg: 'honorarios', icono: 'briefcase', color: '#6d28d9',
    tip: 'Se registra para tu historial. El cálculo de pagos provisionales de este régimen llega en una fase posterior.' },
  { id: 'renta_cobrada', tipo: 'entrada', nombre: 'Renta cobrada', clase: 'ingreso', reg: 'arrendamiento', icono: 'building', color: '#b45309',
    tip: 'Se registra para tu historial. El cálculo de arrendamiento llega en una fase posterior.' },
  { id: 'plataformas', tipo: 'entrada', nombre: 'Plataformas', clase: 'ingreso', reg: 'plataformas', icono: 'smartphone', color: '#be185d',
    tip: 'Se registra para tu historial. La plataforma suele retenerte ISR e IVA; revisa su constancia mensual.' },
  { id: 'otro_ingreso', tipo: 'entrada', nombre: 'Otro ingreso', clase: 'libre', icono: 'gift', color: '#475569',
    tip: 'Regalos, préstamos, reembolsos o ventas personales ocasionales. Dinos qué es: así sabes si se declara, si está exento o si solo se informa en la anual.' },

  { id: 'comida', tipo: 'salida', nombre: 'Comida', clase: 'personal', icono: 'utensils', color: '#c2410c', tip: 'Gasto personal: sirve para tu presupuesto.' },
  { id: 'transporte', tipo: 'salida', nombre: 'Transporte', clase: 'personal', icono: 'car', color: '#64748b', tip: 'Gasto personal: sirve para tu presupuesto.' },
  { id: 'vivienda', tipo: 'salida', nombre: 'Vivienda', clase: 'personal', icono: 'home', color: '#7c3aed', tip: 'La renta de tu casa no es deducible. Los intereses reales de un crédito hipotecario sí, con la constancia del banco.' },
  { id: 'servicios', tipo: 'salida', nombre: 'Servicios', clase: 'personal', icono: 'zap', color: '#0369a1', tip: 'Luz, agua, teléfono, internet de casa.' },
  { id: 'ocio', tipo: 'salida', nombre: 'Entretenimiento', clase: 'personal', icono: 'film', color: '#db2777', tip: 'Gasto personal: sirve para tu presupuesto.' },
  { id: 'salud', tipo: 'salida', nombre: 'Salud', clase: 'deduccion', icono: 'heart', color: '#e11d48',
    tip: 'Deducible en tu anual: médicos, dentistas, psicólogos, nutriólogos, hospital y lentes. Requiere CFDI a tu RFC y pago con tarjeta o transferencia.' },
  { id: 'seguro_medico', tipo: 'salida', nombre: 'Seguro médico', clase: 'deduccion', icono: 'shield', color: '#b91c1c', tip: 'La prima de gastos médicos mayores es deducible con CFDI y pago bancario.' },
  { id: 'colegiaturas', tipo: 'salida', nombre: 'Colegiaturas', clase: 'deduccion', icono: 'graduation', color: '#1e40af', tip: 'Deducible de preescolar a bachillerato, con tope anual por alumno y nivel. CFDI con la CURP del alumno.' },
  { id: 'afore', tipo: 'salida', nombre: 'Ahorro para el retiro', clase: 'deduccion', icono: 'piggy', color: '#15803d', tip: 'Las aportaciones voluntarias a tu AFORE se deducen en la anual (tope propio: 10% de tus ingresos, hasta 5 UMA anuales).' },
  { id: 'donativos', tipo: 'salida', nombre: 'Donativos', clase: 'deduccion', icono: 'hand-heart', color: '#a21caf', tip: 'Solo a donatarias autorizadas y con CFDI.' },
  { id: 'gasto_actividad', tipo: 'salida', nombre: 'Gasto de mi actividad', clase: 'actividad', icono: 'laptop', color: '#0e7490',
    tip: 'Equipo, internet, software o papelería de tu trabajo independiente. Con CFDI, su IVA baja tu pago mensual. Si pasa de $2,000, págalo con tarjeta o transferencia.' },
  { id: 'impuestos', tipo: 'salida', nombre: 'Pago al SAT', clase: 'impuestos', icono: 'landmark', color: '#0a2540', tip: 'Se genera solo al marcar una declaración como pagada.' },
  { id: 'otro_gasto', tipo: 'salida', nombre: 'Otro gasto', clase: 'personal', icono: 'more', color: '#475569', tip: 'Gasto personal.' },
];

/**
 * "¿Qué es este dinero?" para un Otro ingreso. trato:
 *  - no_ingreso: no es ingreso (no se declara)
 *  - exento:     ingreso exento; puede tener que informarse en la anual
 *  - informar:   lo paga o retiene alguien más, pero se considera en la anual
 *  - actividad:  en realidad es un cobro de tu actividad: debe ir como cobro
 *  - revisar:    no sabemos: conviene revisarlo
 * grupo: para los avisos de la anual (art. 90 LISR: préstamos, donativos y premios; art. 150: exentos).
 */
export const ORIGENES_LIBRE = {
  prestamo: { nombre: 'Préstamo que me dieron', trato: 'no_ingreso', grupo: 'prestamos',
    texto: 'Un préstamo no es ingreso. Si en el año tus préstamos, regalos y premios pasan de $600,000, se informan en la anual.' },
  pago_prestamo: { nombre: 'Me pagaron un préstamo que hice', trato: 'no_ingreso',
    texto: 'Recuperar lo que prestaste no es ingreso. Solo los intereses que te paguen lo serían.' },
  traspaso: { nombre: 'Dinero mío de otra cuenta o de ahorro', trato: 'no_ingreso',
    texto: 'Mover tu propio dinero no es ingreso. Si las dos cuentas están en la app, regístralo como transferencia.' },
  reembolso: { nombre: 'Reembolso o devolución', trato: 'no_ingreso',
    texto: 'Que te devuelvan lo que pagaste no es ingreso.' },
  regalo_familia: { nombre: 'Regalo de mis padres, hijos o pareja', trato: 'exento', grupo: 'donativos',
    texto: 'Exento (art. 93 fr. XXIII LISR). Se informa en la anual si en el año tus préstamos, regalos y premios pasan de $600,000.' },
  regalo_otro: { nombre: 'Regalo de otra persona', trato: 'exento', grupo: 'donativos',
    texto: 'Exento solo hasta 3 UMA anuales en el año (unos $128,000 en 2026). Lo que pase de ahí es ingreso y se declara en la anual.' },
  venta_personal: { nombre: 'Venta de algo personal (muebles, auto, ropa)', trato: 'exento', grupo: 'ventas',
    texto: 'Normalmente exento si no ganaste más de 3 UMA anuales sobre lo que te costó (art. 93 fr. XIX LISR). Si vendes seguido, ya es una actividad.' },
  venta_casa: { nombre: 'Venta de mi casa', trato: 'exento', grupo: 'exentos',
    texto: 'Exento hasta 700,000 UDIS si es tu casa habitación; lo calcula el notario. Se informa en la anual si tus ingresos exentos del año pasan de $500,000.' },
  herencia: { nombre: 'Herencia', trato: 'exento', grupo: 'exentos',
    texto: 'Exenta (art. 93 fr. XXII LISR). Se informa en la anual si tus ingresos exentos del año pasan de $500,000.' },
  premio: { nombre: 'Premio, sorteo o lotería', trato: 'informar', grupo: 'premios',
    texto: 'Quien te paga retiene el ISR (art. 138 LISR). Se informa en la anual si tus préstamos, regalos y premios pasan de $600,000.' },
  intereses: { nombre: 'Intereses o rendimientos', trato: 'informar',
    texto: 'El banco ya te retiene ISR y te da una constancia. Los intereses reales se consideran en la anual.' },
  actividad: { nombre: 'Pago por mi trabajo o por algo que vendo', trato: 'actividad',
    texto: 'Esto sí es ingreso de tu actividad: regístralo con la categoría de cobro de tu régimen para que entre a tus impuestos.' },
  otro: { nombre: 'Otra cosa / no estoy seguro', trato: 'revisar',
    texto: 'Si no sabes qué es, revisa con un contador. Una entrada sin explicar puede generar una discrepancia fiscal (art. 91 LISR).' },
};

export const TIPOS_CUENTA = {
  efectivo: { nombre: 'Efectivo', activo: true, icono: 'wallet' },
  debito: { nombre: 'Débito', activo: true, icono: 'credit-card' },
  ahorro: { nombre: 'Ahorro', activo: true, icono: 'piggy' },
  inversion: { nombre: 'Inversión', activo: true, icono: 'trending' },
  credito: { nombre: 'Tarjeta de crédito', activo: false, icono: 'credit-card' },
  prestamo: { nombre: 'Préstamo', activo: false, icono: 'landmark' },
};

/** Niveles del estímulo de colegiaturas (las claves coinciden con params.deducciones.colegiaturas). */
export const NIVELES_COLEGIATURA = { preescolar: 'Preescolar', primaria: 'Primaria', secundaria: 'Secundaria', profesionalTecnico: 'Profesional técnico', bachillerato: 'Bachillerato' };

export const FORMAS_PAGO = { transferencia: 'Transferencia', tarjeta: 'Tarjeta', efectivo: 'Efectivo' };
export const PAGADORES = { pf: 'Una persona', pm: 'Una empresa', publico: 'Público en general' };

export const categoria = (id) => CATEGORIAS.find((c) => c.id === id) ?? { id, nombre: id, clase: 'personal', icono: 'more', color: '#475569', tip: '' };
