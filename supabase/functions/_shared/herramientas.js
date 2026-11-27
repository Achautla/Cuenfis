// Herramientas que el asistente de Cuenfis puede pedir. Las define el servidor (el modelo solo ve estas)
// y las ejecuta la app con los datos del propio usuario, en su dispositivo, con el motor de cálculo de Cuenfis.
// Archivo compartido: lo importan la función del servidor y la app (src/ia/herramientas.js).

export const CLAVES_REGLAS = [
  'resico.mensual', 'resico.limiteAnual', 'resico.retencionIsrPM', 'iva.general', 'iva.frontera', 'iva.retencionPM',
  'diaLimiteMensual', 'topeEfectivo', 'tarifaMensual', 'subsidioEmpleo', 'obligacionAnualSueldos', 'tarifaAnual', 'uma',
  'deducciones', 'deducciones.afore', 'deducciones.donativos', 'deducciones.colegiaturas',
];

const FECHA = { type: 'string', description: 'Fecha AAAA-MM-DD' };

/** Casillas del portal que explica guia_casilla (deben coincidir con src/ia/casillas.js). */
export const CASILLAS_DECLARACION = ['isr_ingresos', 'isr_tasa', 'isr_determinado', 'isr_retenido', 'isr_cargo', 'iva_16', 'iva_8', 'iva_0', 'iva_total', 'iva_retenido', 'iva_acreditable', 'iva_favor', 'iva_cargo', 'anual_ingresos', 'anual_retenido', 'anual_deducciones', 'anual_base', 'anual_isr'];

export const HERRAMIENTAS = [
  {
    name: 'resumen_periodo',
    description: 'Resumen de las finanzas del usuario entre dos fechas: entradas, salidas, gasto real por categoría, ahorro, tasa de ahorro e impuestos apartados para el SAT. Úsala para preguntas como "¿cuánto gasté este mes?" o "¿cómo voy comparado con el mes pasado?".',
    input_schema: { type: 'object', properties: { desde: FECHA, hasta: FECHA }, required: ['desde', 'hasta'], additionalProperties: false },
  },
  {
    name: 'buscar_movimientos',
    description: 'Lista movimientos del usuario (máximo 50, los más recientes primero) filtrando por fechas y, opcionalmente, por tipo, categoría o texto en la nota o la contraparte.',
    input_schema: {
      type: 'object',
      properties: {
        desde: FECHA, hasta: FECHA,
        tipo: { type: 'string', enum: ['entrada', 'salida', 'transferencia'] },
        categoria: { type: 'string', description: 'Id de categoría (ver listar_categorias)' },
        texto: { type: 'string', description: 'Texto a buscar en la nota o la contraparte' },
      },
      required: ['desde', 'hasta'], additionalProperties: false,
    },
  },
  {
    name: 'listar_categorias',
    description: 'Categorías que el usuario puede usar al registrar un movimiento, según sus regímenes vigentes.',
    input_schema: { type: 'object', properties: { tipo: { type: 'string', enum: ['entrada', 'salida'] } }, required: ['tipo'], additionalProperties: false },
  },
  {
    name: 'estado_financiero',
    description: 'Foto financiera del usuario: saldos (lo que tiene, lo que debe, disponible real y lo apartado para el SAT), presupuestos de un mes con lo gastado y lo que queda, y avance de sus metas de ahorro.',
    input_schema: { type: 'object', properties: { mes: { type: 'string', description: 'Mes AAAA-MM para los presupuestos' } }, required: ['mes'], additionalProperties: false },
  },
  {
    name: 'declaracion_mensual',
    description: 'Cifras de la declaración mensual (ISR e IVA de RESICO) de un mes, calculadas por el motor de Cuenfis, casilla por casilla. Solo aplica si el usuario tiene RESICO ese mes.',
    input_schema: { type: 'object', properties: { mes: { type: 'string', description: 'Mes AAAA-MM' } }, required: ['mes'], additionalProperties: false },
  },
  {
    name: 'declaracion_anual',
    description: 'Cifras de la declaración anual (sueldos, deducciones personales, ISR del ejercicio) de un año, calculadas por el motor de Cuenfis.',
    input_schema: { type: 'object', properties: { anio: { type: 'integer' } }, required: ['anio'], additionalProperties: false },
  },
  {
    name: 'guia_casilla',
    description: 'Qué va en una casilla del portal del SAT, su valor para el periodo (calculado por Cuenfis, también redondeado a pesos como lo pide el portal), una explicación sencilla y su fundamento. Úsala cuando el usuario pregunte qué poner en su declaración.',
    input_schema: { type: 'object', properties: { casilla: { type: 'string', enum: CASILLAS_DECLARACION }, periodo: { type: 'string', description: 'AAAA-MM para ISR e IVA mensual; AAAA para la anual' } }, required: ['casilla', 'periodo'], additionalProperties: false },
  },
  {
    name: 'regla_fiscal',
    description: 'Valor de una regla fiscal de un año y su fuente oficial (documento, artículo y publicación). Úsala antes de mencionar cualquier tasa, tarifa o tope.',
    input_schema: { type: 'object', properties: { clave: { type: 'string', enum: CLAVES_REGLAS }, anio: { type: 'integer' } }, required: ['clave', 'anio'], additionalProperties: false },
  },
  {
    name: 'proponer_movimiento',
    description: 'Muestra al usuario un movimiento listo para que lo confirme o lo descarte. Nunca se guarda sin su confirmación. Usa una categoría de listar_categorias.',
    input_schema: {
      type: 'object',
      properties: {
        tipo: { type: 'string', enum: ['entrada', 'salida'] },
        monto: { type: 'number', description: 'Monto total pagado o cobrado, en pesos' },
        fecha: FECHA,
        categoria: { type: 'string' },
        nota: { type: 'string', description: 'Descripción corta, por ejemplo "Gasolina"' },
        forma_pago: { type: 'string', enum: ['efectivo', 'tarjeta', 'transferencia'] },
      },
      required: ['tipo', 'monto', 'fecha', 'categoria', 'nota', 'forma_pago'], additionalProperties: false,
    },
  },
];

export const NOMBRES_HERRAMIENTAS = HERRAMIENTAS.map((h) => h.name);
