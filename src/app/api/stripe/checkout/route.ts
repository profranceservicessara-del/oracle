import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { priceIdForPlan, stripeConfigured, stripeRequest } from "@/lib/stripe";

export const runtime = "nodejs";

const VALID_PLANS = new Set(["essentiel", "pro", "premium"]);

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

  const body = (await request.json().catch(() => ({}))) as { plan?: string };
  const plan = body.plan ?? "";
  if (!VALID_PLANS.has(plan)) {
    return NextResponse.json({ error: "Plano inválido." }, { status: 400 });
  }

  const price = priceIdForPlan(plan);
  if (!price) {
    return NextResponse.json({ error: "Plano indisponível no momento." }, { status: 503 });
  }

  const { data: profile } = await supabase.from("profiles").select("stripe_customer_id").eq("id", user.id).maybeSingle();

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? request.nextUrl.origin;

  try {
    const session = await stripeRequest<{ url?: string }>("/checkout/sessions", {
      mode: "subscription",
      "line_items[0][price]": price,
      "line_items[0][quantity]": 1,
      client_reference_id: user.id,
      "metadata[user_id]": user.id,
      "subscription_data[metadata][user_id]": user.id,
      // Reusa o customer existente; senão o Stripe cria um pelo email.
      customer: profile?.stripe_customer_id ?? undefined,
      customer_email: profile?.stripe_customer_id ? undefined : user.email ?? undefined,
      success_url: `${appUrl}/configuracoes/pagamentos?checkout=success`,
      cancel_url: `${appUrl}/configuracoes/pagamentos?checkout=cancel`
    });

    if (!session.url) {
      return NextResponse.json({ error: "Não foi possível iniciar o pagamento." }, { status: 502 });
    }
    return NextResponse.json({ url: session.url });
  } catch {
    return NextResponse.json({ error: "Não foi possível iniciar o pagamento." }, { status: 502 });
  }
}
