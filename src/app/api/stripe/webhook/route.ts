import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/server/admin-supabase";
import { planForPriceId, stripeGet, verifyStripeSignature } from "@/lib/stripe";

export const runtime = "nodejs";

// Tipos mínimos dos objetos Stripe que consumimos.
type StripeSubscription = {
  id: string;
  customer: string;
  status: string;
  current_period_end?: number;
  metadata?: { user_id?: string };
  items?: { data?: Array<{ price?: { id?: string } }> };
};

type BillingUpdate = {
  stripe_customer_id?: string;
  stripe_subscription_id?: string | null;
  plan?: string;
  subscription_status?: string;
  current_period_end?: string | null;
};

// Escreve os campos billing via service-role. Localiza o profile por user_id
// (metadata) e cai para stripe_customer_id se necessário.
async function updateProfile(
  admin: ReturnType<typeof createAdminClient>,
  match: { userId?: string; customerId?: string },
  patch: BillingUpdate
): Promise<void> {
  let query = admin.from("profiles").update(patch);
  if (match.userId) {
    query = query.eq("id", match.userId);
  } else if (match.customerId) {
    query = query.eq("stripe_customer_id", match.customerId);
  } else {
    return;
  }
  await query;
}

function subscriptionPatch(sub: StripeSubscription): BillingUpdate {
  const priceId = sub.items?.data?.[0]?.price?.id;
  const plan = planForPriceId(priceId);
  return {
    stripe_customer_id: sub.customer,
    stripe_subscription_id: sub.id,
    plan: plan ?? "free",
    subscription_status: sub.status,
    current_period_end: sub.current_period_end
      ? new Date(sub.current_period_end * 1000).toISOString()
      : null
  };
}

export async function POST(request: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Webhook não configurado." }, { status: 503 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature");
  if (!verifyStripeSignature(rawBody, signature, secret)) {
    return NextResponse.json({ error: "Assinatura inválida." }, { status: 400 });
  }

  let event: { type: string; data: { object: Record<string, unknown> } };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }

  const admin = createAdminClient();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as {
          customer?: string;
          subscription?: string;
          client_reference_id?: string;
          metadata?: { user_id?: string };
        };
        const userId = session.client_reference_id ?? session.metadata?.user_id;
        if (session.subscription) {
          // Busca a assinatura para preencher plano/status/período.
          const sub = await stripeGet<StripeSubscription>(`/subscriptions/${session.subscription}`);
          await updateProfile(admin, { userId, customerId: session.customer }, subscriptionPatch(sub));
        } else if (session.customer && userId) {
          await updateProfile(admin, { userId }, { stripe_customer_id: session.customer });
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as unknown as StripeSubscription;
        await updateProfile(admin, { userId: sub.metadata?.user_id, customerId: sub.customer }, subscriptionPatch(sub));
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as unknown as StripeSubscription;
        await updateProfile(
          admin,
          { userId: sub.metadata?.user_id, customerId: sub.customer },
          {
            plan: "free",
            subscription_status: "canceled",
            stripe_subscription_id: null,
            current_period_end: null
          }
        );
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as { customer?: string; subscription?: string };
        if (invoice.subscription) {
          const sub = await stripeGet<StripeSubscription>(`/subscriptions/${invoice.subscription}`);
          await updateProfile(admin, { customerId: invoice.customer }, subscriptionPatch(sub));
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as { customer?: string };
        await updateProfile(admin, { customerId: invoice.customer }, { subscription_status: "past_due" });
        break;
      }

      default:
        break;
    }
  } catch {
    // Não vaza detalhes; retorna 500 para o Stripe reenviar.
    return NextResponse.json({ error: "Falha ao processar evento." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
