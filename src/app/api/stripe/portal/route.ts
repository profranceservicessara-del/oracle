import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { stripeConfigured, stripeRequest } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!stripeConfigured()) {
    return NextResponse.json({ error: "Pagamento ainda não configurado." }, { status: 503 });
  }

  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { data: profile } = await supabase.from("profiles").select("stripe_customer_id").eq("id", user.id).maybeSingle();
  if (!profile?.stripe_customer_id) {
    return NextResponse.json({ error: "Você ainda não possui uma assinatura." }, { status: 400 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? request.nextUrl.origin;

  try {
    const session = await stripeRequest<{ url?: string }>("/billing_portal/sessions", {
      customer: profile.stripe_customer_id,
      return_url: `${appUrl}/configuracoes/pagamentos`
    });
    if (!session.url) {
      return NextResponse.json({ error: "Não foi possível abrir o portal de assinatura." }, { status: 502 });
    }
    return NextResponse.json({ url: session.url });
  } catch {
    return NextResponse.json({ error: "Não foi possível abrir o portal de assinatura." }, { status: 502 });
  }
}
