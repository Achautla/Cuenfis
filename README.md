# Cuenfis

Finanzas personales y fiscales para cualquier persona física en México. Registras **solo lo que entró o salió de tu cuenta** y Cuenfis separa el subtotal, el IVA y las retenciones, te dice qué es tuyo y qué es del SAT, y deja los números en el orden del portal del SAT (RESICO mensual ISR/IVA y anual de sueldos).

> Cálculos estimados con reglas fiscales 2026. No sustituyen la asesoría de un contador.

## Correr en tu computadora

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # pruebas del motor y auditoría
npm run auditoria  # regenera docs/auditoria-fase1.md
npm run build      # versión para publicar (carpeta dist/), instalable como PWA
```

## Cómo está organizado

```
src/
  core/            Motor de cálculo puro (sin pantallas): una sola "foto" que leen todos los módulos
    params/2026.js   Parámetros del año: UMA, tabla RESICO, tarifas art. 96 y 152, subsidio, topes
    fiscal.js        Tarifas, tasas y subsidio
    regimen.js       Vigencia de regímenes y qué categorías ve cada usuario
    desglose.js      Lo recibido o pagado → subtotal, IVA, retenciones, IVA acreditable, deducible
    motor.js         Meses RESICO (ISR/IVA, saldo a favor), saldos, Tengo/Debo/Disponible real, anual
  data/            Catálogo de categorías, acciones puras sobre el estado, almacenamiento
  views/           Una pantalla por archivo (Inicio, Movimientos, Indicadores, Declaración, Aprende, Ajustes)
  styles/          tokens, base, layout, componentes y un CSS por pantalla (styles/views)
public/            manifest, service worker e íconos (PWA)
supabase/          Migraciones (tablas con seguridad por usuario, RLS)
tests/             Escenarios de auditoría con resultados calculados a mano
```

## Reglas clave

- **Disponible real** = Tengo (efectivo, débito, ahorro, inversión) − Debo (tarjetas, préstamos y la bolsa SAT pendiente).
- **Lo tuyo** de un cobro RESICO = subtotal − ISR (retenido + por pagar). El IVA nunca es tuyo.
- **Gasto real** = lo pagado − IVA acreditable. Los pagos al SAT y las transferencias no son gasto.
- Cada movimiento usa el **régimen vigente en su fecha**: quien no tiene RESICO no ve nada de RESICO.
- RESICO: tasa del mes sobre todo lo cobrado sin IVA (art. 113-E); persona moral retiene 1.25% de ISR y 2/3 del IVA; el saldo a favor de IVA pasa al mes siguiente.
- Deducciones personales: CFDI y pago bancario; tope general = menor entre 5 UMA anuales y 15% de los ingresos.
- Gasto de la actividad pagado en efectivo por más de $2,000: su IVA no se acredita.

## Datos

En esta fase los datos viven en el navegador (localStorage) y se pueden respaldar en JSON desde Ajustes. El esquema de Supabase (`supabase/migrations`) ya está aplicado en el proyecto **Cuenfis** con RLS; la sincronización y el inicio de sesión llegan en la fase "App real".
