import { NextResponse, type NextRequest } from "next/server";
import { bankProviderConfigured, createConnectSession } from "@/lib/bank/provider";
import { requiresPaidPlan } from "@/lib/plan-matrix";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

// POST /api/bank/connect — inicia a conexão bancária hosted (Bridge).
// Gate Premium ESTRITO re-verificado no servidor. Sem envs do provedor,
// responde 503 (a UI mostra estado amigável; o import CSV segue disponível).
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

  if (!bankProviderConfigured()) {
    return NextResponse.json(
      { error: "Conexão automática ainda não ativada. Use a importação de transações por enquanto." },
      { status: 503 }
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? request.nextUrl.origin;
  const url = await createConnectSession(user.id, `${appUrl}/banco?connect=retour`);
  if (!url) {
    return NextResponse.json({ error: "Não foi possível iniciar a conexão." }, { status: 502 });
  }
  return NextResponse.json({ url });
}
