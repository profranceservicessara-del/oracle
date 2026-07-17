import { NextResponse, type NextRequest } from "next/server";
import { verifyWebhookSignature } from "@/lib/bank/provider";
import { createAdminClient } from "@/lib/server/admin-supabase";

export const runtime = "nodejs";

// POST /api/bank/webhook — eventos do provedor bancário. Assinatura HMAC
// verificada + idempotência por (provider, event_id): evento repetido é
// ignorado. Fase 5: só registra o evento (sincronização de contas/transações
// entra quando o sandbox for ativado). Nunca escreve em payments/documents.
export async function POST(request: NextRequest) {
  if (!process.env.BRIDGE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Webhook não configurado." }, { status: 503 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get("bridge-signature") ?? request.headers.get("x-signature");
  const valid = await verifyWebhookSignature(rawBody, signature);
  if (!valid) {
    return NextResponse.json({ error: "Assinatura inválida." }, { status: 401 });
  }

  const payload = (() => {
    try {
      return JSON.parse(rawBody) as { id?: string; type?: string };
    } catch {
      return null;
    }
  })();
  if (!payload?.id) {
    return NextResponse.json({ error: "Evento inválido." }, { status: 400 });
  }

  // Idempotência: insert com unique (provider, event_id). Conflito = replay.
  const supabaseAdmin = createAdminClient();
  const { error } = await supabaseAdmin
    .from("bank_webhook_events")
    .insert({ provider: "bridge", event_id: payload.id });
  if (error) {
    // 23505 = unique violation => evento já processado (replay seguro).
    return NextResponse.json({ received: true, duplicate: true });
  }

  return NextResponse.json({ received: true });
}
