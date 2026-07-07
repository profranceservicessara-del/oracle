import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Healthcheck de prontidão. Reporta APENAS presença/ausência de env (boolean),
// nunca valores. Sem writes, sem chamadas externas (Stripe/Resend/Supabase).
// Supabase = required (app não roda sem); demais = feature-gated (opcionais).

type Check = { key: string; env: string; label: string; required: boolean };

const CHECKS: Check[] = [
  { key: "supabase_url", env: "NEXT_PUBLIC_SUPABASE_URL", label: "Supabase URL", required: true },
  { key: "supabase_anon_key", env: "NEXT_PUBLIC_SUPABASE_ANON_KEY", label: "Supabase Anon Key", required: true },
  { key: "resend_api_key", env: "RESEND_API_KEY", label: "Resend API Key", required: false },
  { key: "email_from", env: "EMAIL_FROM", label: "Remetente de e-mail", required: false },
  { key: "stripe_secret_key", env: "STRIPE_SECRET_KEY", label: "Stripe Secret Key", required: false },
  { key: "stripe_webhook_secret", env: "STRIPE_WEBHOOK_SECRET", label: "Stripe Webhook Secret", required: false },
  { key: "next_public_app_url", env: "NEXT_PUBLIC_APP_URL", label: "App URL", required: false },
  { key: "stripe_price_essentiel", env: "STRIPE_PRICE_ESSENTIEL", label: "Stripe Price Essentiel", required: false },
  { key: "stripe_price_pro", env: "STRIPE_PRICE_PRO", label: "Stripe Price Pro", required: false },
  { key: "stripe_price_premium", env: "STRIPE_PRICE_PREMIUM", label: "Stripe Price Premium", required: false }
];

function isConfigured(env: string): boolean {
  const value = process.env[env];
  return typeof value === "string" && value.trim().length > 0;
}

export async function GET() {
  try {
    const checks: Record<string, { configured: boolean; required: boolean; label: string }> = {};
    const missingRequired: string[] = [];

    for (const check of CHECKS) {
      const configured = isConfigured(check.env);
      checks[check.key] = { configured, required: check.required, label: check.label };
      if (check.required && !configured) {
        missingRequired.push(check.label); // apenas o label, nunca o valor
      }
    }

    const status = missingRequired.length === 0 ? "ok" : "degraded";

    return NextResponse.json(
      {
        app: "oracle",
        status,
        timestamp: new Date().toISOString(),
        environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "unknown",
        checks,
        missing_required: missingRequired
      },
      { status: 200 }
    );
  } catch {
    // Nunca crasha nem vaza detalhes; degraded seguro.
    return NextResponse.json(
      { app: "oracle", status: "degraded", timestamp: new Date().toISOString(), environment: "unknown", checks: {}, missing_required: [] },
      { status: 200 }
    );
  }
}
