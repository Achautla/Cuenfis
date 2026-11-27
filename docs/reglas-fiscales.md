# Reglas fiscales de Cuenfis

Cada tasa, tarifa y tope con que calcula Cuenfis vive en un archivo por año, `src/core/params/AAAA.js`. De dónde sale cada dato (documento y artículo) está en `src/core/params/fuentes.js`. El motor usa las reglas del año del periodo que calcula. Si un año aún no tiene reglas, usa las del último año anterior y la app lo marca como **provisional**.

Todas las cifras son estimaciones y no sustituyen la asesoría de un contador.

## Calendario de cada año

| Cuándo | Qué se publica | Qué datos cambia |
| --- | --- | --- |
| Septiembre a noviembre | Paquete económico y reformas (LISR, LIVA, CFF, Ley de Ingresos) | Tasas y reglas de cálculo, si hay reforma |
| Finales de diciembre | Resolución Miscelánea Fiscal y Anexo 8 (tarifas) | `tarifaMensual`, `tarifaAnual` y referencias a reglas de la RMF |
| Diciembre o enero | Decreto del subsidio para el empleo | `subsidioEmpleo` |
| Enero (vigente desde el 1 de febrero) | Valor de la UMA (INEGI, en el DOF) | `uma` y todos los topes que dependen de ella |

## Cómo se entera Cuenfis

El flujo **Vigilar reglas fiscales** (`.github/workflows/vigilar-reglas.yml`) revisa el sumario del DOF cada lunes, y a diario de diciembre a febrero. Si encuentra una publicación fiscal, abre un aviso en GitHub con la etiqueta `reglas-fiscales`. Nunca cambia reglas por sí mismo.

## Cómo se actualiza un año

1. Copia el archivo del año anterior a `src/core/params/AAAA.js` y cambia solo los datos publicados.
2. Actualiza `publicaciones` con el documento y la fecha del DOF de cada dato nuevo.
3. Regístralo en `INCLUIDAS` dentro de `src/core/reglas.js`.
4. Agrega pruebas con al menos un ejemplo calculado a mano (por ejemplo, el ISR de un sueldo con la tarifa nueva).
5. `npm test` debe pasar. Una persona revisa el cambio antes de fusionar.

## Cómo llega sin publicar otra versión de la app

La app lee al abrir la tabla pública `reglas_fiscales` de Supabase (solo lectura). Esa tabla se crea con `supabase/migrations/20261128000000_reglas_fiscales.sql`.

1. Genera el SQL del año: `node scripts/exportar-reglas.mjs AAAA`.
2. Pégalo en el SQL Editor de Supabase.
3. Para corregir un año ya publicado, sube `revision` en el archivo del año y repite. La app solo acepta una revisión mayor que la que trae incluida.

La app valida cada año que llega de la nube (forma de las tarifas, tasas entre 0 y 1, UMA razonable). Si algo no cuadra, lo ignora y sigue con las reglas incluidas.
