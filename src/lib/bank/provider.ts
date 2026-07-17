// Adapter de Open Banking (Fase 5). Provedor inicial: Bridge (França).
// Fetch direto (padrão do stripe.ts) — zero dependência. Sem as envs
// BRIDGE_CLIENT_ID/BRIDGE_CLIENT_SECRET, tudo retorna "não configurado" e a
// UI mostra estado amigável; o import manual (CSV) funciona independente.
//
// IMPORTANTE: endpoints Bridge ainda NÃO validados contra sandbox real
// (sem credenciais nesta fase). Validar na primeira ativação antes de
// liberar a usuários. Tokens/segredos ficam SÓ no server (env) — nunca em
// tabela nem no client.

const BRIDGE_API = "https://api.bridgeapi.io/v3";

export function bankProviderConfigured(): boolean {
  return Boolean(process.env.BRIDGE_CLIENT_ID && process.env.BRIDGE_CLIENT_SECRET);
}

function headers(): Record<string, string> {
  return {
    "Client-Id": process.env.BRIDGE_CLIENT_ID ?? "",
    "Client-Secret": process.env.BRIDGE_CLIENT_SECRET ?? "",
    "Bridge-Version": "2025-01-15",
    "content-type": "application/json"
  };
}

// Cria uma sessão de conexão hosted (o widget do Bridge mostra os bancos).
// Retorna a URL para redirecionar o usuário, ou null se indisponível.
export async function createConnectSession(userExternalId: string, callbackUrl: string): Promise<string | null> {
  if (!bankProviderConfigured()) return null;
  try {
    const res = await fetch(`${BRIDGE_API}/aggregation/connect-sessions`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ user_external_id: userExternalId, callback_url: callbackUrl })
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { url?: string };
    return json.url ?? null;
  } catch {
    return null;
  }
}

// Verificação de assinatura de webhook (HMAC-SHA256 do corpo cru).
// Formato exato do header a validar na ativação do sandbox.
export async function verifyWebhookSignature(rawBody: string, signature: string | null): Promise<boolean> {
  const secret = process.env.BRIDGE_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  const { createHmac, timingSafeEqual } = await import("crypto");
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(expected);
  const cleaned = signature.replace(/^v1=/, "").trim();
  const b = Buffer.from(cleaned);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
