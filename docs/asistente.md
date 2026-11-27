# Asistente con IA (fase 7)

## Cómo funciona
- La app manda la pregunta a la función `asistente` de Supabase con la sesión del usuario.
- La función revisa sesión, consentimiento (`consentimientos`, documento `asistente_ia`) y el límite del mes (`uso_ia`), y llama al modelo.
- Las herramientas se definen en `supabase/functions/_shared/herramientas.js` y se ejecutan **en la app** (`src/ia/herramientas.js`) con el motor de Cuenfis. Al servidor solo llegan los resultados que el modelo pide.
- Las conversaciones se guardan solo en el dispositivo. El servidor guarda conteos de uso y costo, nunca el contenido.
- Sin sesión o sin la función publicada, la app usa el modo demostración (`src/ia/demo.js`), anunciado en pantalla.

## Puesta en marcha
1. Pega `supabase/migrations/20261128100000_asistente_ia.sql` en el editor SQL de Supabase.
2. Crea una llave de API de Anthropic con límite de gasto mensual y guárdala como secreto de la función: `ANTHROPIC_API_KEY` (Edge Functions → Secrets). Nunca en el repositorio ni en la app.
3. Publica la función `asistente` (incluye `_shared/herramientas.js`).
4. Opcional: `MODELO_CHAT` (por omisión `claude-haiku-5-5`), `MODELO_DECLARACION` (`claude-sonnet-5-5`), `LIMITE_MENSAJES_MES` (300), `ORIGENES_PERMITIDOS`, `PROVEEDOR_IA` (`anthropic`).

## Cambiar de proveedor
Agrega una clase que implemente `Proveedor` en `supabase/functions/asistente/proveedores.ts` y elígela con `PROVEEDOR_IA`. La app no cambia.
