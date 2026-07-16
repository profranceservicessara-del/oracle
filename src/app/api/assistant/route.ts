import { NextResponse, type NextRequest } from "next/server";
import { assistantConfigured, rateLimited, streamAssistantReply, type ChatTurn } from "@/lib/assistant/client";
import { requiresPaidPlan } from "@/lib/plan-matrix";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

// POST /api/assistant — Assistente de Declarações. Gate Premium ESTRITO
// re-verificado no servidor (não confia só na page). Rate-limit best-effort.
// Sem persistência.
//
// Fase 3: tools read-only executam com ESTE client Supabase (sessão do
// usuário) -> RLS aplica no banco. O modelo nunca recebe user_id nem acessa
// o Supabase; nenhuma tool escreve.
export async function POST(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan, subscription_status")
    .eq("id", user.id)
    .maybeSingle();
  if (requiresPaidPlan(profile, "premium")) {
    return NextResponse.json({ error: "Recurso Premium." }, { status: 403 });
  }

  if (!assistantConfigured()) {
    return NextResponse.json({ error: "Assistente indisponível no momento." }, { status: 503 });
  }

  if (rateLimited(user.id)) {
    return NextResponse.json({ error: "Muitas perguntas em pouco tempo. Aguarde um instante." }, { status: 429 });
  }

  const body = (await request.json().catch(() => null)) as { messages?: ChatTurn[] } | null;
  const history = Array.isArray(body?.messages) ? body!.messages : [];
  if (history.length === 0 || !history.some((m) => m.role === "user" && m.content?.trim())) {
    return NextResponse.json({ error: "Mensagem vazia." }, { status: 400 });
  }

  try {
    const stream = await streamAssistantReply(history, supabase);
    if (!stream) {
      return NextResponse.json({ error: "Assistente indisponível no momento." }, { status: 503 });
    }
    return new NextResponse(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store"
      }
    });
  } catch {
    return NextResponse.json({ error: "Não foi possível responder agora." }, { status: 502 });
  }
}
