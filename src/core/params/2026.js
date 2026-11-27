// Parámetros fiscales 2026. Se actualizan cada año sin tocar la lógica (ver src/core/reglas.js).
// La fuente de cada dato está en `publicaciones` y en src/core/params/fuentes.js.
// Estimaciones: no sustituyen la asesoría de un contador.

export default {
  anio: 2026,
  revision: 1, // sube cuando se corrige o se publica una versión remota
  publicaciones: {
    rmf: 'Resolución Miscelánea Fiscal para 2026',
    anexo8: 'Anexo 8 de la RMF 2026 (DOF 28-dic-2025)',
    uma: 'UMA 2026 publicada por el INEGI en el DOF (vigente desde el 1 de febrero de 2026)',
    subsidio: 'Decreto del subsidio para el empleo (DOF 31-dic-2025)',
  },
  uma: { diaria: 117.31 },

  // RESICO personas físicas (art. 113-E): la tasa se aplica a TODO el ingreso del mes.
  resico: {
    limiteAnual: 3_500_000,
    mensual: [
      { hasta: 25_000, tasa: 0.01 },
      { hasta: 50_000, tasa: 0.011 },
      { hasta: 83_333.33, tasa: 0.015 },
      { hasta: 208_333.33, tasa: 0.02 },
      { hasta: 291_666.67, tasa: 0.025 },
    ],
    retencionIsrPM: 0.0125, // art. 113-J
  },

  iva: {
    general: 0.16,
    frontera: 0.08,
    retencionPM: 2 / 3, // art. 1-A LIVA y art. 3 RLIVA (servicios profesionales)
  },

  // Tope de pago en efectivo para que un gasto sea deducible / su IVA acreditable (art. 27 fr. III LISR).
  topeEfectivo: 2_000,

  deducciones: {
    umasAnuales: 5,
    porcentajeIngresos: 0.15, // art. 151 último párrafo
    afore: { porcentajeIngresos: 0.10, umasAnuales: 5 }, // art. 151 fr. V
    donativos: { porcentajeIngresos: 0.07 }, // art. 151 fr. III
    // Estímulo por colegiaturas: tope anual por alumno y nivel (Decreto DOF 26-dic-2013, art. 1.8)
    colegiaturas: { preescolar: 14_200, primaria: 12_900, secundaria: 19_900, profesionalTecnico: 17_100, bachillerato: 24_500 },
  },

  subsidioEmpleo: {
    porcentajeUmaMensual: 0.1502,
    limiteIngresoMensual: 11_492.66,
    diasMes: 30.4,
  },

  obligacionAnualSueldos: 400_000, // art. 98 fr. III
  diaLimiteMensual: 17,

  // Tarifa mensual art. 96 (retenciones de nómina).
  tarifaMensual: [
    [0.01, 844.59, 0, 0.0192],
    [844.6, 7168.51, 16.22, 0.064],
    [7168.52, 12598.02, 420.95, 0.1088],
    [12598.03, 14644.64, 1011.68, 0.16],
    [14644.65, 17533.64, 1339.14, 0.1792],
    [17533.65, 35362.83, 1856.84, 0.2136],
    [35362.84, 55736.68, 5665.16, 0.2352],
    [55736.69, 106410.5, 10457.09, 0.3],
    [106410.51, 141880.66, 25659.23, 0.32],
    [141880.67, 425641.99, 37009.69, 0.34],
    [425642, Infinity, 133488.54, 0.35],
  ],

  // Tarifa anual art. 152 (declaración anual).
  tarifaAnual: [
    [0.01, 10135.11, 0, 0.0192],
    [10135.12, 86022.11, 194.59, 0.064],
    [86022.12, 151176.19, 5051.37, 0.1088],
    [151176.2, 175735.66, 12140.13, 0.16],
    [175735.67, 210403.69, 16069.64, 0.1792],
    [210403.7, 424353.97, 22282.14, 0.2136],
    [424353.98, 668840.14, 67981.92, 0.2352],
    [668840.15, 1276925.98, 125485.07, 0.3],
    [1276925.99, 1702567.97, 307910.81, 0.32],
    [1702567.98, 5107703.92, 444116.23, 0.34],
    [5107703.93, Infinity, 1601862.46, 0.35],
  ],
};
