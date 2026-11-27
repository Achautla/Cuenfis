# Auditoría Fase 1: esperado vs obtenido

**116 de 116 pruebas correctas.**

_Cálculos estimados con reglas 2026. No sustituyen la asesoría de un contador._

## E1. Sueldo: 12 meses de nómina + gasto médico deducible

Bruto $15,000/mes, ISR retenido $1,402.82 (art. 96, sin subsidio porque pasa de $11,492.66), neto $13,597.18. Gasto médico $6,000 con CFDI y tarjeta.

| Prueba | Esperado | Obtenido | Resultado |
|---|---:|---:|:---:|
| Inicio: Tengo | 162,166.16 | 162,166.16 | ✅ |
| Inicio: Bolsa SAT (nómina ya retenida) | 0.00 | 0.00 | ✅ |
| Indicadores: ingresos propios del año | 163,166.16 | 163,166.16 | ✅ |
| Indicadores: gastos del año | 6,000.00 | 6,000.00 | ✅ |
| Declaración: sin pantallas RESICO | 0.00 | 0.00 | ✅ |
| Anual: ingresos por sueldos | 180,000.00 | 180,000.00 | ✅ |
| Anual: ISR retenido | 16,833.84 | 16,833.84 | ✅ |
| Anual: límite deducciones = min(5 UMA anuales, 15%) | 27,000.00 | 27,000.00 | ✅ |
| Anual: base gravable | 174,000.00 | 174,000.00 | ✅ |
| Anual: ISR del ejercicio (art. 152) | 15,791.94 | 15,791.94 | ✅ |
| Anual: saldo a favor | 1,041.90 | 1,041.90 | ✅ |
| Captura: no ve "Cobro RESICO" ni "Gasto de mi actividad" | no | no | ✅ |
| Balance = saldo inicial + lo tuyo − gastos reales | 157,166.16 | 157,166.16 | ✅ |
| Suma de los meses = total del periodo (Indicadores) | 157,166.16 | 157,166.16 | ✅ |
| Bolsa SAT (Inicio) = suma de declaraciones pendientes | 0.00 | 0.00 | ✅ |
| Saldo de cada cuenta = inicial + entradas − salidas ± transferencias | Sí | Sí | ✅ |
| Cada cobro: subtotal + IVA − retenciones = lo recibido | Sí | Sí | ✅ |

## E2. RESICO: cobro de $45,000 + IVA a una persona física

Llegan $52,200 a la cuenta. Ejemplo 1 de la Fase 0.

| Prueba | Esperado | Obtenido | Resultado |
|---|---:|---:|:---:|
| Movimiento: subtotal | 45,000.00 | 45,000.00 | ✅ |
| Movimiento: IVA | 7,200.00 | 7,200.00 | ✅ |
| Movimiento: retenciones | 0.00 | 0.00 | ✅ |
| Movimiento: es tuyo | 44,505.00 | 44,505.00 | ✅ |
| Movimiento: es del SAT | 7,695.00 | 7,695.00 | ✅ |
| Declaración ISR: tasa | 0.011 | 0.011 | ✅ |
| Declaración ISR: a cargo | 495.00 | 495.00 | ✅ |
| Declaración IVA: a cargo | 7,200.00 | 7,200.00 | ✅ |
| Inicio: Tengo | 52,200.00 | 52,200.00 | ✅ |
| Inicio: Debo (bolsa SAT) | 7,695.00 | 7,695.00 | ✅ |
| Inicio: Disponible real | 44,505.00 | 44,505.00 | ✅ |
| Indicadores: tasa de ahorro | 1.00 | 1.00 | ✅ |
| Balance = saldo inicial + lo tuyo − gastos reales | 44,505.00 | 44,505.00 | ✅ |
| Suma de los meses = total del periodo (Indicadores) | 44,505.00 | 44,505.00 | ✅ |
| Bolsa SAT (Inicio) = suma de declaraciones pendientes | 7,695.00 | 7,695.00 | ✅ |
| Saldo de cada cuenta = inicial + entradas − salidas ± transferencias | Sí | Sí | ✅ |
| Cada cobro: subtotal + IVA − retenciones = lo recibido | Sí | Sí | ✅ |

## E3. RESICO: cobro de $45,000 + IVA a una empresa (persona moral)

La empresa retiene 1.25% de ISR y 2/3 del IVA; llegan $46,837.50. Ejemplo 2 de la Fase 0.

| Prueba | Esperado | Obtenido | Resultado |
|---|---:|---:|:---:|
| Movimiento: subtotal (recibido ÷ 1.040833) | 45,000.00 | 45,000.00 | ✅ |
| Movimiento: ISR retenido | 562.50 | 562.50 | ✅ |
| Movimiento: IVA retenido | 4,800.00 | 4,800.00 | ✅ |
| Movimiento: es tuyo | 44,437.50 | 44,437.50 | ✅ |
| Declaración ISR: determinado | 495.00 | 495.00 | ✅ |
| Declaración ISR: a cargo | 0.00 | 0.00 | ✅ |
| Declaración IVA: a cargo | 2,400.00 | 2,400.00 | ✅ |
| Inicio: Disponible real | 44,437.50 | 44,437.50 | ✅ |
| Balance = saldo inicial + lo tuyo − gastos reales | 44,437.50 | 44,437.50 | ✅ |
| Suma de los meses = total del periodo (Indicadores) | 44,437.50 | 44,437.50 | ✅ |
| Bolsa SAT (Inicio) = suma de declaraciones pendientes | 2,400.00 | 2,400.00 | ✅ |
| Saldo de cada cuenta = inicial + entradas − salidas ± transferencias | Sí | Sí | ✅ |
| Cada cobro: subtotal + IVA − retenciones = lo recibido | Sí | Sí | ✅ |

## E4. RESICO: gasto de la actividad con CFDI (IVA acreditable)

Cobro del E2 + laptop de $3,480 con CFDI pagada con tarjeta de débito.

| Prueba | Esperado | Obtenido | Resultado |
|---|---:|---:|:---:|
| Movimiento: IVA acreditable | 480.00 | 480.00 | ✅ |
| Movimiento: gasto real | 3,000.00 | 3,000.00 | ✅ |
| Declaración IVA: acreditable | 480.00 | 480.00 | ✅ |
| Declaración IVA: a cargo | 6,720.00 | 6,720.00 | ✅ |
| Declaración: total a pagar | 7,215.00 | 7,215.00 | ✅ |
| Inicio: Disponible real | 41,505.00 | 41,505.00 | ✅ |
| Indicadores: ahorro | 41,505.00 | 41,505.00 | ✅ |
| Balance = saldo inicial + lo tuyo − gastos reales | 41,505.00 | 41,505.00 | ✅ |
| Suma de los meses = total del periodo (Indicadores) | 41,505.00 | 41,505.00 | ✅ |
| Bolsa SAT (Inicio) = suma de declaraciones pendientes | 7,215.00 | 7,215.00 | ✅ |
| Saldo de cada cuenta = inicial + entradas − salidas ± transferencias | Sí | Sí | ✅ |
| Cada cobro: subtotal + IVA − retenciones = lo recibido | Sí | Sí | ✅ |

## E5. Gastos en efectivo

Cobro del E2 + gasto de actividad $2,320 en efectivo (pasa de $2,000), otro de $1,160 en efectivo, y consulta médica $800 en efectivo.

| Prueba | Esperado | Obtenido | Resultado |
|---|---:|---:|:---:|
| $2,320 en efectivo: IVA acreditable | 0.00 | 0.00 | ✅ |
| $1,160 en efectivo (≤ $2,000): IVA acreditable | 160.00 | 160.00 | ✅ |
| Médico en efectivo: deducible | No | No | ✅ |
| Médico en efectivo: muestra aviso | Sí | Sí | ✅ |
| Declaración IVA: a cargo | 7,040.00 | 7,040.00 | ✅ |
| Indicadores: gastos | 4,120.00 | 4,120.00 | ✅ |
| Inicio: Disponible real | 40,385.00 | 40,385.00 | ✅ |
| Balance = saldo inicial + lo tuyo − gastos reales | 40,385.00 | 40,385.00 | ✅ |
| Suma de los meses = total del periodo (Indicadores) | 40,385.00 | 40,385.00 | ✅ |
| Bolsa SAT (Inicio) = suma de declaraciones pendientes | 7,535.00 | 7,535.00 | ✅ |
| Saldo de cada cuenta = inicial + entradas − salidas ± transferencias | Sí | Sí | ✅ |
| Cada cobro: subtotal + IVA − retenciones = lo recibido | Sí | Sí | ✅ |

## E6. Cambio de régimen a mitad de año

Sueldos de enero a junio; RESICO desde el 1 de julio. Un cobro RESICO capturado por error en mayo.

| Prueba | Esperado | Obtenido | Resultado |
|---|---:|---:|:---:|
| Mayo: no se genera declaración RESICO | No | No | ✅ |
| Mayo: aviso de cobro fuera de régimen | Sí | Sí | ✅ |
| Julio: ISR RESICO a cargo | 495.00 | 495.00 | ✅ |
| Julio: IVA a cargo | 7,200.00 | 7,200.00 | ✅ |
| Agosto: declaración en ceros | 0.00 | 0.00 | ✅ |
| Anual: ingresos por sueldos (solo ene-jun) | 90,000.00 | 90,000.00 | ✅ |
| Anual: ISR del ejercicio | 5,484.16 | 5,484.16 | ✅ |
| Anual: saldo a favor | 2,932.76 | 2,932.76 | ✅ |
| Anual: obligado a presentar (sueldos + otro régimen) | Sí | Sí | ✅ |
| Anual: ingresos RESICO informativos | 45,000.00 | 45,000.00 | ✅ |
| Captura en marzo: ve Sueldo, no Cobro RESICO | sueldo | sueldo | ✅ |
| Captura en agosto: ve Cobro RESICO, no Sueldo | cobro_resico | cobro_resico | ✅ |
| Balance = saldo inicial + lo tuyo − gastos reales | 137,688.08 | 137,688.08 | ✅ |
| Suma de los meses = total del periodo (Indicadores) | 137,688.08 | 137,688.08 | ✅ |
| Bolsa SAT (Inicio) = suma de declaraciones pendientes | 7,695.00 | 7,695.00 | ✅ |
| Saldo de cada cuenta = inicial + entradas − salidas ± transferencias | Sí | Sí | ✅ |
| Cada cobro: subtotal + IVA − retenciones = lo recibido | Sí | Sí | ✅ |

## E7. Tarjeta de crédito y transferencia

Débito con $10,000. Comida de $1,500 con tarjeta de crédito; después se paga la tarjeta desde débito.

| Prueba | Esperado | Obtenido | Resultado |
|---|---:|---:|:---:|
| Débito | 8,500.00 | 8,500.00 | ✅ |
| Deuda de tarjeta | 0.00 | 0.00 | ✅ |
| Indicadores: gastos (la transferencia no cuenta) | 1,500.00 | 1,500.00 | ✅ |
| Inicio: Disponible real | 8,500.00 | 8,500.00 | ✅ |
| Balance = saldo inicial + lo tuyo − gastos reales | -1,500.00 | -1,500.00 | ✅ |
| Suma de los meses = total del periodo (Indicadores) | -1,500.00 | -1,500.00 | ✅ |
| Bolsa SAT (Inicio) = suma de declaraciones pendientes | 0.00 | 0.00 | ✅ |
| Saldo de cada cuenta = inicial + entradas − salidas ± transferencias | Sí | Sí | ✅ |
| Cada cobro: subtotal + IVA − retenciones = lo recibido | Sí | Sí | ✅ |

## E8. Declaración marcada como pagada y luego editada

Cobro del E2; se marca febrero como pagada desde débito; después se edita el cobro.

| Prueba | Esperado | Obtenido | Resultado |
|---|---:|---:|:---:|
| Se generó salida "Pago al SAT" | 7,695.00 | 7,695.00 | ✅ |
| Inicio: Tengo | 44,505.00 | 44,505.00 | ✅ |
| Inicio: Bolsa SAT | 0.00 | 0.00 | ✅ |
| Indicadores: el pago al SAT no es gasto | 0.00 | 0.00 | ✅ |
| Al editar: aviso de complementaria | Sí | Sí | ✅ |
| Balance = saldo inicial + lo tuyo − gastos reales | 44,505.00 | 44,505.00 | ✅ |
| Suma de los meses = total del periodo (Indicadores) | 44,505.00 | 44,505.00 | ✅ |
| Bolsa SAT (Inicio) = suma de declaraciones pendientes | 0.00 | 0.00 | ✅ |
| Saldo de cada cuenta = inicial + entradas − salidas ± transferencias | Sí | Sí | ✅ |
| Cada cobro: subtotal + IVA − retenciones = lo recibido | Sí | Sí | ✅ |

## E9. Saldo a favor de IVA que se aplica al mes siguiente

Marzo: solo un gasto de actividad de $11,600 con CFDI (IVA $1,600). Abril: cobro del E2.

| Prueba | Esperado | Obtenido | Resultado |
|---|---:|---:|:---:|
| Marzo: saldo a favor de IVA | 1,600.00 | 1,600.00 | ✅ |
| Abril: acreditamiento de saldo a favor | 1,600.00 | 1,600.00 | ✅ |
| Abril: IVA a cargo | 5,600.00 | 5,600.00 | ✅ |
| Inicio: Disponible real | 54,505.00 | 54,505.00 | ✅ |
| Balance = saldo inicial + lo tuyo − gastos reales | 34,505.00 | 34,505.00 | ✅ |
| Suma de los meses = total del periodo (Indicadores) | 34,505.00 | 34,505.00 | ✅ |
| Bolsa SAT (Inicio) = suma de declaraciones pendientes | 6,095.00 | 6,095.00 | ✅ |
| Saldo de cada cuenta = inicial + entradas − salidas ± transferencias | Sí | Sí | ✅ |
| Cada cobro: subtotal + IVA − retenciones = lo recibido | Sí | Sí | ✅ |

