// Proveedores de IA intercambiables. La app y el resto de la función no saben qué proveedor responde:
// para probar otro (por ejemplo, uno más barato) se agrega aquí y se elige con la variable PROVEEDOR_IA.
import Anthropic from 'npm:@anthropic-ai/sdk@^0.136.0';

export type Modo = 'chat' | 'declaracion';

export interface Peticion {
  modo: Modo;
  sistema: { fijo: string; contexto: string };
  mensajes: unknown[]; // formato de la API de Messages; los bloques del asistente se devuelven sin cambios
  herramientas: unknown[];
}

export interface Respuesta {
  contenido: unknown[];
  parada: string; // end_turn | tool_use | max_tokens | refusal | ...
  modelo: string;
  uso: { entrada: number; salida: number; cacheLeida: number; cacheEscrita: number };
  costoUsd: number;
}

export interface Proveedor {
  responder(p: Peticion): Promise<Respuesta>;
}

// Precios de lista (USD por millón de tokens) para llevar la cuenta del gasto. Actualizar si cambian.
const PRECIOS: Record<string, { entrada: number; salida: number; cacheLeida: number }> = {
  'claude-haiku-5-5': { entrada: 0.10, salida: 0.50, cacheLeida: 0.01 },
  'claude-sonnet-5-5': { entrada: 2, salida: 10, cacheLeida: 0.10 },
  'claude-opus-5-5': { entrada: 4, salida: 20, cacheLeida: 0.20 },
};

export function costo(modelo: string, u: Respuesta['uso']): number {
  const p = PRECIOS[modelo] ?? PRECIOS['claude-sonnet-5-5'];
  return (u.entrada * p.entrada + u.cacheEscrita * p.entrada * 1.25 + u.cacheLeida * p.cacheLeida + u.salida * p.salida) / 1e6;
}

class ProveedorAnthropic implements Proveedor {
  private cliente = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') });
  private modelos: Record<Modo, string> = {
    chat: Deno.env.get('MODELO_CHAT') ?? 'claude-haiku-5-5',
    declaracion: Deno.env.get('MODELO_DECLARACION') ?? 'claude-sonnet-5-5',
  };

  async responder(p: Peticion): Promise<Respuesta> {
    const modelo = this.modelos[p.modo];
    const pide: Record<string, unknown> = {
      model: modelo,
      max_tokens: 4000,
      // Lo fijo (herramientas + instrucciones) se guarda en caché; el contexto del usuario va después.
      system: [
        { type: 'text', text: p.sistema.fijo, cache_control: { type: 'ephemeral' } },
        { type: 'text', text: p.sistema.contexto },
      ],
      tools: p.herramientas,
      tool_choice: { type: 'auto' },
      messages: p.mensajes,
      output_config: { effort: p.modo === 'declaracion' ? 'medium' : 'low' },
    };
    // Si el modelo intermedio declina por política, la API reintenta con otro modelo en la misma llamada.
    if (modelo.startsWith('claude-sonnet-5-5')) Object.assign(pide, { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' });
    const r = await this.cliente.beta.messages.create(pide as never);
    const uso = {
      entrada: r.usage.input_tokens ?? 0,
      salida: r.usage.output_tokens ?? 0,
      cacheLeida: r.usage.cache_read_input_tokens ?? 0,
      cacheEscrita: r.usage.cache_creation_input_tokens ?? 0,
    };
    return { contenido: r.content as unknown[], parada: r.stop_reason ?? 'end_turn', modelo: r.model, uso, costoUsd: costo(r.model, uso) };
  }
}

export function proveedor(): Proveedor {
  const nombre = Deno.env.get('PROVEEDOR_IA') ?? 'anthropic';
  if (nombre === 'anthropic') return new ProveedorAnthropic();
  throw new Error(`Proveedor de IA desconocido: ${nombre}`);
}

export { Anthropic };
