import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { stripeConfigured, stripeGet } from "@/lib/stripe";

export const runtime = "nodejs";

// Faturas da assinatura Stripe. Server-side only; devolve apenas campos seguros
// para o front (links hosteados + valores), nunca IDs internos/segredos.
type StripeInvoice = {
  number?: string | null;
  created?: number;
  total?: number;
  amount_paid?: number;
  currency?: string;
  status?: string;
  paid?: boolean;
  hosted_invoice_url?: string | null;
  invoice_pdf?: string | null;
};

export type BillingInvoice = {
  number: string | null;
  date: string | null;
  amount: number | null;
  currency: string | null;
  status: string | null;
  paid: boolean;
  hostedUrl: string | null;
  pdfUrl: string | null;
};

export async function GET() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  if (!stripeConfigured()) {
    return NextResponse.json({ hasCustomer: false, invoices: [] });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .maybeSingle();

  const customerId = profile?.stripe_customer_id ?? null;
  if (!customerId) {
    return NextResponse.json({ hasCustomer: false, invoices: [] });
  }

  try {
    const result = await stripeGet<{ data?: StripeInvoice[] }>(
      `/invoices?customer=${encodeURIComponent(customerId)}&limit=24`
    );
    const invoices: BillingInvoice[] = (result.data ?? []).map((invoice) => ({
      number: invoice.number ?? null,
      date: invoice.created ? new Date(invoice.created * 1000).toISOString() : null,
      amount: typeof invoice.total === "number" ? invoice.total : invoice.amount_paid ?? null,
      currency: invoice.currency ? invoice.currency.toUpperCase() : null,
      status: invoice.status ?? null,
      paid: Boolean(invoice.paid),
      hostedUrl: invoice.hosted_invoice_url ?? null,
      pdfUrl: invoice.invoice_pdf ?? null
    }));
    return NextResponse.json({ hasCustomer: true, invoices });
  } catch {
    return NextResponse.json({ error: "Não foi possível carregar as faturas." }, { status: 502 });
  }
}
