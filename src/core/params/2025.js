// Parámetros fiscales 2025. Se actualizan cada año sin tocar la lógica (ver src/core/reglas.js).
// La fuente de cada dato está en `publicaciones` y en src/core/params/fuentes.js.
// Estimaciones: no sustituyen la asesoría de un contador.

export default {
  anio: 2025,
  revision: 1, // sube cuando se corrige o se publica una versión remota
  publicaciones: {
    rmf: 'Resolución Miscelánea Fiscal para 2025',
    anexo8: 'Anexo 8 de la RMF 2025 (tarifas sin cambio desde 2023)',
    uma: 'UMA 2025 publicada por el INEGI en el DOF (vigente desde el 1 de febrero de 2025)',
    subsidio: 'Decreto del subsidio para el empleo (DOF 31-dic-2024)',
  },
  uma: { diaria: 113.14 },

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
    porcentajeUmaMensual: 0.138,
    limiteIngresoMensual: 10_171,
    diasMes: 30.4,
  },

  obligacionAnualSueldos: 400_000, // art. 98 fr. III
  diaLimiteMensual: 17,

  // Tarifa mensual art. 96 (retenciones de nómina).
  tarifaMensual: [
    [0.01, 746.04, 0, 0.0192],
    [746.05, 6332.05, 14.32, 0.064],
    [6332.06, 11128.01, 371.83, 0.1088],
    [11128.02, 12935.82, 893.63, 0.16],
    [12935.83, 15487.71, 1182.88, 0.1792],
    [15487.72, 31236.49, 1640.18, 0.2136],
    [31236.5, 49233, 5004.12, 0.2352],
    [49233.01, 93993.9, 9236.89, 0.3],
    [93993.91, 125325.2, 22665.17, 0.32],
    [125325.21, 375975.61, 32691.18, 0.34],
    [375975.62, Infinity, 117912.32, 0.35],
  ],

  // Tarifa anual art. 152 (declaración anual).
  tarifaAnual: [
    [0.01, 8952.49, 0, 0.0192],
    [8952.5, 75984.55, 171.88, 0.064],
    [75984.56, 133536.07, 4461.94, 0.1088],
    [133536.08, 155229.8, 10723.55, 0.16],
    [155229.81, 185852.57, 14194.54, 0.1792],
    [185852.58, 374837.88, 19682.13, 0.2136],
    [374837.89, 590795.99, 60049.4, 0.2352],
    [590796, 1127926.84, 110842.74, 0.3],
    [1127926.85, 1503902.46, 271981.99, 0.32],
    [1503902.47, 4511707.37, 392294.17, 0.34],
    [4511707.38, Infinity, 1414947.85, 0.35],
  ],
};
