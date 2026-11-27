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
