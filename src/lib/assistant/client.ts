import { buildSystemPrompt } from "@/lib/assistant/system-prompt";
import { runTool, TOOL_DEFS } from "@/lib/assistant/tools";

// Cliente do Assistente. Fetch direto à API Anthropic (padrão do stripe.ts —
// zero dependência instalada). Chave NUNCA vai ao client.
//
// Fase 3: loop de tool-use server-side. As tools rodam com o client Supabase
// DA SESSÃO (RLS decide o que é visível); o modelo nunca vê o banco. Só
// leitura — nenhuma tool escreve.

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const DEFAULT_MODEL = "claude-sonnet-5";
const MAX_TOKENS = 700;
const MAX_HISTORY = 12;
const MAX_TOOL_ROUNDS = 3;

export type ChatTurn = { role: "user" | "assistant"; content: string };
type SupabaseLike = { from: (table: string) => any };

type Block =
  | { type: "text"; text: string }
  | { type: "tool_use"; id: string; name: string; input: Record<string, unknown> };
type ApiMessage = { role: "user" | "assistant"; content: string | unknown[] };
type ApiResponse = { content?: Block[]; stop_reason?: string };

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

async function callAnthropic(key: string, messages: ApiMessage[], withTools: boolean): Promise<ApiResponse | null> {
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
      ...(withTools ? { tools: TOOL_DEFS } : {})
    })
  });
  if (!res.ok) return null;
  return (await res.json()) as ApiResponse;
}

function textOf(res: ApiResponse): string {
  return (res.content ?? [])
    .filter((b): b is Extract<Block, { type: "text" }> => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();
}

function toStream(text: string): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(text));
      controller.close();
    }
  });
}

// Retorna stream de TEXTO da resposta final, ou null se não configurado/erro.
export async function streamAssistantReply(
  history: ChatTurn[],
  supabase: SupabaseLike
): Promise<ReadableStream<Uint8Array> | null> {
  const key = process.env.ASSISTANT_API_KEY;
  if (!key) return null;

  const messages: ApiMessage[] = history
    .slice(-MAX_HISTORY)
    .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim())
    .map((m) => ({ role: m.role, content: m.content.slice(0, 2000) }));

  if (messages.length === 0) return null;

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const res = await callAnthropic(key, messages, true);
    if (!res) return null;

    if (res.stop_reason !== "tool_use") {
      const text = textOf(res);
      return text ? toStream(text) : null;
    }

    // Executa as tools pedidas e devolve os resultados ao modelo.
    const blocks = res.content ?? [];
    messages.push({ role: "assistant", content: blocks });
    const results: unknown[] = [];
    for (const block of blocks) {
      if (block.type !== "tool_use") continue;
      let output: unknown;
      try {
        output = await runTool(supabase, block.name, block.input ?? {});
      } catch {
        output = { erro: "Não foi possível ler esse dado agora." };
      }
      results.push({
        type: "tool_result",
        tool_use_id: block.id,
        content: JSON.stringify(output)
      });
    }
    if (results.length === 0) return null;
    messages.push({ role: "user", content: results });
  }

  // Rounds de tool esgotados: força uma resposta em texto (sem tools).
  const final = await callAnthropic(key, messages, false);
  if (!final) return null;
  const text = textOf(final);
  return text ? toStream(text) : null;
}
