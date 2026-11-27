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
    simulador.js     "Si cobro X" y comparación RESICO / actividad empresarial / sueldo
    presupuestos.js  Límites por categoría con avisos al 80% y 100%
    deudas.js        Tarjetas (corte, pago para no generar intereses, mínimo, interés) y préstamos
    agenda.js        Recurrentes, metas con ahorro mensual necesario y cuentas por cobrar
    recordatorios.js Avisos según el régimen: declaraciones, tarjetas, recurrentes, facturas, anual, límite RESICO
    reporte.js       Datos del reporte para contador (PDF por impresión y Excel)
  data/            Catálogo, acciones puras, almacenamiento local, nube.js (Supabase) y sync.js (sincronización)
  ui/confirmar.js  Candado "¿Estás seguro?" para acciones importantes
  views/           Una pantalla por archivo (Inicio, Movimientos, Balance, Tarjetas y deudas, Recurrentes, Presupuestos, Metas, Indicadores, Declaración, Clientes y cobros, Simulador, Aprende, Ajustes)
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
- Tarjeta: pago para no generar intereses = saldo al último corte − pagos desde el corte. Pago mínimo estimado = mayor entre 1.5% del saldo y 1.25% del límite (Banxico). El interés lleva IVA.
- Recurrentes: nunca se registran solos; cada ocurrencia se confirma (con el monto real) u omite.
- Facturas emitidas: no cuentan para impuestos hasta registrar el cobro, que usa la categoría del régimen con actividad vigente en la fecha del cobro. "Clientes y cobros" solo aparece a quien tiene (o tuvo en el último año) un régimen con actividad.

## Datos

La app es **primero local**: todo funciona sin conexión y sin cuenta (localStorage, con respaldo JSON en Ajustes).
Con sesión iniciada (Supabase Auth, correo y contraseña):

- El estado completo se guarda en `public.espacios` como un documento con número de versión. Si otro dispositivo guardó
  una versión más nueva, no se sobrescribe: la app pregunta cuál conservar.
- Cada versión anterior queda en `public.espacios_historial` (últimas 30) y se puede restaurar desde *Cuenta y nube*.
- Los acuses del SAT van a un bucket privado `acuses`, en la carpeta del usuario.
- Todo con RLS: cada usuario solo puede leer y escribir lo suyo. Migraciones en `supabase/migrations`.

Variables en `.env` (ver `.env.example`): la URL del proyecto y la llave **publicable**. Nunca la service_role.
Para que los enlaces de confirmación y de recuperación de contraseña funcionen, agrega la URL donde publiques la app en
Supabase → Authentication → URL Configuration (Site URL y Redirect URLs).

Las tablas relacionales de la migración inicial (`movimientos`, `cuentas`…) quedan reservadas para reportes del lado
del servidor en una fase posterior; hoy la fuente de verdad es el documento sincronizado.
