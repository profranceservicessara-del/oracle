import { buildSystemPrompt } from "@/lib/assistant/system-prompt";

// Cliente do Assistente. Fetch direto à API Anthropic (padrão do stripe.ts —
// zero dependência instalada). Streaming SSE proxied como texto simples.
// Provider-agnostic na fronteira: se ASSISTANT_API_KEY faltar, retorna null e
// a UI cai no modo determinístico. Chave NUNCA vai ao client.

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const DEFAULT_MODEL = "claude-sonnet-5";
const MAX_TOKENS = 700;
const MAX_HISTORY = 12;

export type ChatTurn = { role: "user" | "assistant"; content: string };

export function assistantConfigured(): boolean {
  return Boolean(process.env.ASSISTANT_API_KEY);
}

// Rate-limit best-effort em memória (por instância serverless). Durável exige
// tabela — fica para uma fase futura. Aqui evita abuso óbvio.
const HITS = new Map<string, number[]>();
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 15;

export function rateLimited(userId: string): boolean {
  const now = Date.now();
  const hits = (HITS.get(userId) ?? []).filter((t) => now - t < WINDOW_MS);
  if (hits.length >= MAX_PER_WINDOW) {
    HITS.set(userId, hits);
    return true;
  }
  hits.push(now);
  HITS.set(userId, hits);
  return false;
}

// Retorna um ReadableStream de TEXTO (deltas) ou null se não configurado.
export async function streamAssistantReply(history: ChatTurn[]): Promise<ReadableStream<Uint8Array> | null> {
  const key = process.env.ASSISTANT_API_KEY;
  if (!key) return null;

  const messages = history
    .slice(-MAX_HISTORY)
    .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim())
    .map((m) => ({ role: m.role, content: m.content.slice(0, 2000) }));

  const res = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model: process.env.ASSISTANT_MODEL || DEFAULT_MODEL,
      max_tokens: MAX_TOKENS,
      system: buildSystemPrompt(),
      messages,
      stream: true
    })
  });

  if (!res.ok || !res.body) {
    return null;
  }

  // Proxy: lê o SSE da Anthropic, extrai os deltas de texto e re-emite como
  // texto simples (o client só concatena).
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  const reader = res.body.getReader();
  let buffer = "";

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      const { done, value } = await reader.read();
      if (done) {
        controller.close();
        return;
      }
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const payload = trimmed.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        try {
          const evt = JSON.parse(payload) as { type?: string; delta?: { type?: string; text?: string } };
          if (evt.type === "content_block_delta" && evt.delta?.type === "text_delta" && evt.delta.text) {
            controller.enqueue(encoder.encode(evt.delta.text));
          }
        } catch {
          // linha SSE parcial/keep-alive — ignora
        }
      }
    },
    cancel() {
      void reader.cancel();
    }
  });
}
