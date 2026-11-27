# Noticias (fase 11)

El tablero junta dos fuentes:
1. **Avisos de la app**, que se generan solos con las reglas fiscales del año (datos que cambiaron y reglas provisionales).
2. **Noticias publicadas** en la tabla `noticias` de Supabase. La app solo lee las que tienen `publicada = true`.

## Publicar una noticia
En Supabase → SQL Editor:

```sql
insert into public.noticias (titulo, resumen, enlace, fuente, temas, regimenes, fecha, publicada)
values (
  'El SAT publicó la Resolución Miscelánea Fiscal 2027',
  'Trae los cambios de reglas para el próximo año. Cuenfis actualizará sus cálculos cuando se publiquen los anexos.',
  'https://www.dof.gob.mx/',
  'DOF',
  array['impuestos'],      -- impuestos, ahorro, credito, inversion, economia
  array['resico'],         -- vacío = para todos los regímenes
  current_date,
  true
);
```

- `temas` y `regimenes` vacíos significan "para todos".
- El enlace debe empezar con `https://`.
- Para ocultar una noticia: `update public.noticias set publicada = false where id = '...';`

## Avisos en el dispositivo
Son opcionales (Noticias → Avisarme de noticias nuevas). Llegan al abrir la app, como máximo dos a la vez y sin repetir.
Las notificaciones push con la app cerrada (Firebase Cloud Messaging) necesitan un proyecto de Firebase y su archivo `google-services.json`; se agregan cuando ese proyecto exista.

## Noticias automáticas (prueba con fuentes gratuitas)
La función `noticias-rss` corre cada 4 horas (pg_cron, minuto 17). Lee RSS gratuitos:
- Medios: El Economista, El Financiero (Economía) y Expansión (Economía).
- Oficiales: SAT, Condusef, Profeco y Hacienda no tienen RSS; se lee la sala de prensa pública de cada una en gob.mx. Banxico no tiene un canal de comunicados que funcione, así que sus anuncios llegan por los medios.

Toma solo notas de los últimos 3 días (10 para las oficiales) que no haya visto antes, y Haiku decide cuáles sirven a las finanzas personales, les pone temas y regímenes, y escribe un resumen propio de una o dos frases. Se guarda título, resumen y enlace (nunca el texto de la nota). Las que no sirven se guardan ocultas (`publicada = false`) para no pagarlas dos veces. Lo automático de más de 45 días se borra solo.

En la app cada noticia automática dice "Resumen automático con IA", trae su × para ocultarla, y hay un botón para ocultar todas las de medios en ese dispositivo.

### Revisar cómo va
```sql
select en, detalle from public.noticias_corridas order by en desc limit 5;
```
`detalle.fuentes` dice cuántas notas dio cada fuente (o `falla <código>`), y `costo_usd` lo que costó la corrida.

### Ocultar una noticia para todos
```sql
update public.noticias set publicada = false where enlace = 'https://...';
```

### Pausar o quitar la prueba
```sql
select cron.unschedule('noticias-rss');            -- deja de buscar
update public.noticias set publicada = false where automatica;  -- oculta lo ya publicado
```
