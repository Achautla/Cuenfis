// Casos simulados de la auditoría de la Fase 1.
// Los valores "esperado" están calculados a mano a partir de la ley (no con el motor),
// para que la prueba compare dos caminos independientes.
import { calcular, periodo, rangoMes } from '../src/core/motor.js';
import { marcarDeclaracion, editarMovimiento } from '../src/data/acciones.js';
import { CATEGORIAS } from '../src/data/catalogo.js';
import { categoriasDisponibles } from '../src/core/regimen.js';

const cuentasBase = (debito = 0) => [
  { id: 'deb', nombre: 'Débito', tipo: 'debito', saldoInicial: debito },
  { id: 'tdc', nombre: 'Tarjeta de crédito', tipo: 'credito', saldoInicial: 0 },
];
const perfil = (...regimenes) => ({ nombre: 'Prueba', frontera: false, regimenes });
const cobro = (id, fecha, monto, pagador, extra = {}) => ({ id, tipo: 'entrada', categoria: 'cobro_resico', fecha, monto, cuenta: 'deb', pagador, tasaIva: 0.16, cfdi: true, formaPago: 'transferencia', ...extra });
const gasto = (id, fecha, monto, categoria, extra = {}) => ({ id, tipo: 'salida', categoria, fecha, monto, cuenta: 'deb', formaPago: 'tarjeta', cfdi: true, tasaIva: 0.16, ...extra });
const sueldo = (id, fecha) => ({ id, tipo: 'entrada', categoria: 'sueldo', fecha, monto: 13597.18, sueldoBruto: 15000, isrRetenidoNomina: 1402.82, cuenta: 'deb', formaPago: 'transferencia', cfdi: true });
const meses = (n, desde = 1) => Array.from({ length: n }, (_, i) => `2026-${String(i + desde).padStart(2, '0')}-15`);
const mov = (f, id) => f.movs.find((m) => m.id === id);
const año = (f) => periodo(f, '2026-01-01', '2026-12-31');

/** Cuadres que se verifican en TODOS los escenarios. */
export function cuadres(f) {
  const total = periodo(f, '0000-01-01', '9999-12-31');
  const sumaMeses = Object.keys(total.porMes).reduce((s, k) => { const [a, b] = rangoMes(k); return s + periodo(f, a, b).ahorro; }, 0);
  const bolsaMeses = Object.values(f.meses).filter((m) => !m.futuro && m.estado !== 'pagada').reduce((s, m) => s + m.isrCargo + m.ivaCargo, 0);
  const formulaCuentas = f.cuentas.every((c) => {
    let s = +c.saldoInicial; const k = c.esDeuda ? -1 : 1;
    for (const m of f.movs) {
      if (m.cuenta === c.id) s += (m.tipo === 'entrada' ? 1 : -1) * k * m.monto;
      if (m.tipo === 'transferencia' && m.cuentaDestino === c.id) s += k * m.monto;
    }
    return Math.abs(s - c.saldo) < 0.01;
  });
  const cobrosCuadran = f.movs.filter((m) => m.d.fiscal && m.d.regimen === 'resico')
    .every((m) => Math.abs(m.d.subtotal + m.d.iva - m.d.isrRet - m.d.ivaRet - m.monto) <= 0.02);
  return [
    ['Balance = saldo inicial + lo tuyo − gastos reales', r(f.balance.disponible - f.balance.inicial), r(total.ahorro)],
    ['Suma de los meses = total del periodo (Indicadores)', r(sumaMeses), r(total.ahorro)],
    ['Bolsa SAT (Inicio) = suma de declaraciones pendientes', r(f.balance.bolsa), r(bolsaMeses)],
    ['Saldo de cada cuenta = inicial + entradas − salidas ± transferencias', true, formulaCuentas],
    ['Cada cobro: subtotal + IVA − retenciones = lo recibido', true, cobrosCuadran],
  ];
}
const r = (n) => Math.round(n * 100) / 100;

export const ESCENARIOS = [
  {
    id: 'E1', nombre: 'Sueldo: 12 meses de nómina + gasto médico deducible',
    detalle: 'Bruto $15,000/mes, ISR retenido $1,402.82 (art. 96, sin subsidio porque pasa de $11,492.66), neto $13,597.18. Gasto médico $6,000 con CFDI y tarjeta.',
    estado: { perfil: perfil({ reg: 'sueldos', desde: '2026-01-01' }), cuentas: cuentasBase(5000),
      movimientos: [...meses(12).map((f, i) => sueldo(`s${i}`, f)), gasto('med', '2026-03-10', 6000, 'salud')] },
    hoy: '2026-12-31',
    checks: (f) => {
      const an = f.anual(2026);
      return [
        ['Inicio: Tengo', 5000 + 12 * 13597.18 - 6000, f.balance.tengo],
        ['Inicio: Bolsa SAT (nómina ya retenida)', 0, f.balance.bolsa],
        ['Indicadores: ingresos propios del año', 163166.16, año(f).propios],
        ['Indicadores: gastos del año', 6000, año(f).gastos],
        ['Declaración: sin pantallas RESICO', 0, Object.keys(f.meses).length],
        ['Anual: ingresos por sueldos', 180000, an.sueldos.ingresos],
        ['Anual: ISR retenido', 16833.84, an.sueldos.isrRetenido],
        ['Anual: límite deducciones = min(5 UMA anuales, 15%)', 27000, an.deducciones.limGeneral],
        ['Anual: base gravable', 174000, an.base],
        ['Anual: ISR del ejercicio (art. 152)', 15791.94, an.isrAnual],
        ['Anual: saldo a favor', 1041.9, an.aFavor],
        ['Captura: no ve "Cobro RESICO" ni "Gasto de mi actividad"', 'no', categoriasDisponibles(f.perfil, '2026-05-01', 'entrada', CATEGORIAS).concat(categoriasDisponibles(f.perfil, '2026-05-01', 'salida', CATEGORIAS)).some((c) => ['cobro_resico', 'gasto_actividad'].includes(c.id)) ? 'sí' : 'no'],
      ];
    },
  },
  {
    id: 'E2', nombre: 'RESICO: cobro de $45,000 + IVA a una persona física',
    detalle: 'Llegan $52,200 a la cuenta. Ejemplo 1 de la Fase 0.',
    estado: { perfil: perfil({ reg: 'resico', desde: '2026-01-01' }), cuentas: cuentasBase(0), movimientos: [cobro('c1', '2026-02-10', 52200, 'pf')] },
    hoy: '2026-02-28',
    checks: (f) => {
      const m = mov(f, 'c1'), d = f.meses['2026-02'];
      return [
        ['Movimiento: subtotal', 45000, m.d.subtotal], ['Movimiento: IVA', 7200, m.d.iva],
        ['Movimiento: retenciones', 0, m.d.isrRet + m.d.ivaRet],
        ['Movimiento: es tuyo', 44505, m.propio], ['Movimiento: es del SAT', 7695, m.delSat],
        ['Declaración ISR: tasa', 0.011, d.tasa], ['Declaración ISR: a cargo', 495, d.isrCargo],
        ['Declaración IVA: a cargo', 7200, d.ivaCargo],
        ['Inicio: Tengo', 52200, f.balance.tengo], ['Inicio: Debo (bolsa SAT)', 7695, f.balance.debo],
        ['Inicio: Disponible real', 44505, f.balance.disponible],
        ['Indicadores: tasa de ahorro', 1, año(f).tasaAhorro],
      ];
    },
  },
  {
    id: 'E3', nombre: 'RESICO: cobro de $45,000 + IVA a una empresa (persona moral)',
    detalle: 'La empresa retiene 1.25% de ISR y 2/3 del IVA; llegan $46,837.50. Ejemplo 2 de la Fase 0.',
    estado: { perfil: perfil({ reg: 'resico', desde: '2026-01-01' }), cuentas: cuentasBase(0), movimientos: [cobro('c1', '2026-02-10', 46837.5, 'pm')] },
    hoy: '2026-02-28',
    checks: (f) => {
      const m = mov(f, 'c1'), d = f.meses['2026-02'];
      return [
        ['Movimiento: subtotal (recibido ÷ 1.040833)', 45000, m.d.subtotal], ['Movimiento: ISR retenido', 562.5, m.d.isrRet],
        ['Movimiento: IVA retenido', 4800, m.d.ivaRet], ['Movimiento: es tuyo', 44437.5, m.propio],
        ['Declaración ISR: determinado', 495, d.isrDet], ['Declaración ISR: a cargo', 0, d.isrCargo],
        ['Declaración IVA: a cargo', 2400, d.ivaCargo], ['Inicio: Disponible real', 44437.5, f.balance.disponible],
      ];
    },
  },
  {
    id: 'E4', nombre: 'RESICO: gasto de la actividad con CFDI (IVA acreditable)',
    detalle: 'Cobro del E2 + laptop de $3,480 con CFDI pagada con tarjeta de débito.',
    estado: { perfil: perfil({ reg: 'resico', desde: '2026-01-01' }), cuentas: cuentasBase(0),
      movimientos: [cobro('c1', '2026-02-10', 52200, 'pf'), gasto('g1', '2026-02-12', 3480, 'gasto_actividad')] },
    hoy: '2026-02-28',
    checks: (f) => {
      const d = f.meses['2026-02'];
      return [
        ['Movimiento: IVA acreditable', 480, mov(f, 'g1').d.ivaAcreditable], ['Movimiento: gasto real', 3000, mov(f, 'g1').gastoReal],
        ['Declaración IVA: acreditable', 480, d.ivaAcred], ['Declaración IVA: a cargo', 6720, d.ivaCargo],
        ['Declaración: total a pagar', 7215, d.totalPagar], ['Inicio: Disponible real', 41505, f.balance.disponible],
        ['Indicadores: ahorro', 41505, año(f).ahorro],
      ];
    },
  },
  {
    id: 'E5', nombre: 'Gastos en efectivo',
    detalle: 'Cobro del E2 + gasto de actividad $2,320 en efectivo (pasa de $2,000), otro de $1,160 en efectivo, y consulta médica $800 en efectivo.',
    estado: { perfil: perfil({ reg: 'resico', desde: '2026-01-01' }), cuentas: cuentasBase(0),
      movimientos: [cobro('c1', '2026-02-10', 52200, 'pf'),
        gasto('g1', '2026-02-11', 2320, 'gasto_actividad', { formaPago: 'efectivo' }),
        gasto('g2', '2026-02-12', 1160, 'gasto_actividad', { formaPago: 'efectivo' }),
        gasto('g3', '2026-02-13', 800, 'salud', { formaPago: 'efectivo' })] },
    hoy: '2026-02-28',
    checks: (f) => [
      ['$2,320 en efectivo: IVA acreditable', 0, mov(f, 'g1').d.ivaAcreditable],
      ['$1,160 en efectivo (≤ $2,000): IVA acreditable', 160, mov(f, 'g2').d.ivaAcreditable],
      ['Médico en efectivo: deducible', false, mov(f, 'g3').d.deducible],
      ['Médico en efectivo: muestra aviso', true, mov(f, 'g3').d.motivos.some((t) => /efectivo/.test(t))],
      ['Declaración IVA: a cargo', 7040, f.meses['2026-02'].ivaCargo],
      ['Indicadores: gastos', 4120, año(f).gastos],
      ['Inicio: Disponible real', 40385, f.balance.disponible],
    ],
  },
  {
    id: 'E6', nombre: 'Cambio de régimen a mitad de año',
    detalle: 'Sueldos de enero a junio; RESICO desde el 1 de julio. Un cobro RESICO capturado por error en mayo.',
    estado: { perfil: perfil({ reg: 'sueldos', desde: '2026-01-01', hasta: '2026-06-30' }, { reg: 'resico', desde: '2026-07-01' }),
      cuentas: cuentasBase(0),
      movimientos: [...meses(6).map((f, i) => sueldo(`s${i}`, f)), cobro('err', '2026-05-20', 11600, 'pf'), cobro('c1', '2026-07-10', 52200, 'pf')] },
    hoy: '2026-12-31',
    checks: (f) => {
      const an = f.anual(2026);
      return [
        ['Mayo: no se genera declaración RESICO', false, '2026-05' in f.meses],
        ['Mayo: aviso de cobro fuera de régimen', true, f.avisos.some((a) => a.movId === 'err')],
        ['Julio: ISR RESICO a cargo', 495, f.meses['2026-07'].isrCargo],
        ['Julio: IVA a cargo', 7200, f.meses['2026-07'].ivaCargo],
        ['Agosto: declaración en ceros', 0, f.meses['2026-08'].totalPagar],
        ['Anual: ingresos por sueldos (solo ene-jun)', 90000, an.sueldos.ingresos],
        ['Anual: ISR del ejercicio', 5484.16, an.isrAnual],
        ['Anual: saldo a favor', 2932.76, an.aFavor],
        ['Anual: obligado a presentar (sueldos + otro régimen)', true, an.obligado],
        ['Anual: ingresos RESICO informativos', 45000, an.resico.ingresos],
        ['Captura en marzo: ve Sueldo, no Cobro RESICO', 'sueldo', categoriasDisponibles(f.perfil, '2026-03-01', 'entrada', CATEGORIAS).filter((c) => c.clase === 'ingreso').map((c) => c.id).join()],
        ['Captura en agosto: ve Cobro RESICO, no Sueldo', 'cobro_resico', categoriasDisponibles(f.perfil, '2026-08-01', 'entrada', CATEGORIAS).filter((c) => c.clase === 'ingreso').map((c) => c.id).join()],
      ];
    },
  },
  {
    id: 'E7', nombre: 'Tarjeta de crédito y transferencia',
    detalle: 'Débito con $10,000. Comida de $1,500 con tarjeta de crédito; después se paga la tarjeta desde débito.',
    estado: { perfil: perfil({ reg: 'sueldos', desde: '2026-01-01' }), cuentas: cuentasBase(10000),
      movimientos: [gasto('g1', '2026-03-01', 1500, 'comida', { cuenta: 'tdc', cfdi: false }),
        { id: 't1', tipo: 'transferencia', fecha: '2026-03-20', monto: 1500, cuenta: 'deb', cuentaDestino: 'tdc' }] },
    hoy: '2026-03-31',
    checks: (f) => [
      ['Débito', 8500, f.cuentas.find((c) => c.id === 'deb').saldo],
      ['Deuda de tarjeta', 0, f.cuentas.find((c) => c.id === 'tdc').saldo],
      ['Indicadores: gastos (la transferencia no cuenta)', 1500, año(f).gastos],
      ['Inicio: Disponible real', 8500, f.balance.disponible],
    ],
  },
  {
    id: 'E8', nombre: 'Declaración marcada como pagada y luego editada',
    detalle: 'Cobro del E2; se marca febrero como pagada desde débito; después se edita el cobro.',
    estado: (() => {
      const base = { perfil: perfil({ reg: 'resico', desde: '2026-01-01' }), cuentas: cuentasBase(0), movimientos: [cobro('c1', '2026-02-10', 52200, 'pf')], declaraciones: {} };
      return marcarDeclaracion(base, '2026-02', 'pagada', { cuenta: 'deb', fecha: '2026-03-15', hoy: '2026-03-15' });
    })(),
    hoy: '2026-03-15',
    checks: (f, estado) => {
      const editado = calcular(editarMovimiento(estado, 'c1', { monto: 58000 }), '2026-03-15');
      return [
        ['Se generó salida "Pago al SAT"', 7695, f.movs.find((m) => m.categoria === 'impuestos')?.monto],
        ['Inicio: Tengo', 44505, f.balance.tengo], ['Inicio: Bolsa SAT', 0, f.balance.bolsa],
        ['Indicadores: el pago al SAT no es gasto', 0, año(f).gastos],
        ['Al editar: aviso de complementaria', true, editado.avisos.some((a) => /complementaria/.test(a.texto))],
      ];
    },
  },
  {
    id: 'E9', nombre: 'Saldo a favor de IVA que se aplica al mes siguiente',
    detalle: 'Marzo: solo un gasto de actividad de $11,600 con CFDI (IVA $1,600). Abril: cobro del E2.',
    estado: { perfil: perfil({ reg: 'resico', desde: '2026-01-01' }), cuentas: cuentasBase(20000),
      movimientos: [gasto('g1', '2026-03-05', 11600, 'gasto_actividad'), cobro('c1', '2026-04-10', 52200, 'pf')] },
    hoy: '2026-04-30',
    checks: (f) => [
      ['Marzo: saldo a favor de IVA', 1600, f.meses['2026-03'].favorSiguiente],
      ['Abril: acreditamiento de saldo a favor', 1600, f.meses['2026-04'].favorAplicado],
      ['Abril: IVA a cargo', 5600, f.meses['2026-04'].ivaCargo],
      ['Inicio: Disponible real', 20000 + 44505 - 10000, f.balance.disponible],
    ],
  },
];

export function correr() {
  return ESCENARIOS.map((e) => {
    const f = calcular(e.estado, e.hoy);
    const filas = [...e.checks(f, e.estado), ...cuadres(f)].map(([que, esperado, obtenido]) => {
      const ok = typeof esperado === 'number' ? Math.abs(esperado - obtenido) < 0.015 : esperado === obtenido;
      return { que, esperado, obtenido, ok };
    });
    return { ...e, filas };
  });
}
