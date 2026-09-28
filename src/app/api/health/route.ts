import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Healthcheck de prontidão. Reporta APENAS presença/ausência de env (boolean),
// nunca valores. Sem writes, sem chamadas externas (Stripe/Resend/Supabase).
// Supabase = required (app não roda sem); demais = feature-gated (opcionais).
//
// Público: só app, status e timestamp (serve a monitor de uptime). O inventário
// de integrações configuradas e o ambiente só saem com o segredo (Bearer
// CRON_SECRET), senão qualquer visitante mapearia a superfície do sistema.

type Check = { key: string; env: string; label: string; required: boolean };

const CHECKS: Check[] = [
  { key: "supabase_url", env: "NEXT_PUBLIC_SUPABASE_URL", label: "Supabase URL", required: true },
  { key: "supabase_anon_key", env: "NEXT_PUBLIC_SUPABASE_ANON_KEY", label: "Supabase Anon Key", required: true },
  { key: "cron_secret", env: "CRON_SECRET", label: "Segredo do cron", required: false },
  { key: "service_role_key", env: "SUPABASE_SERVICE_ROLE_KEY", label: "Supabase Service Role Key", required: false },
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

function hasSecret(request: NextRequest): boolean {
  const expected = process.env.CRON_SECRET;
  const header = request.headers.get("authorization");
  const received = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : null;
  if (!expected || !received) return false;
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(request: NextRequest) {
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
    const base = { app: "oracle", status, timestamp: new Date().toISOString() };

    if (!hasSecret(request)) {
      return NextResponse.json(base, { status: 200 });
    }

    return NextResponse.json(
      {
        ...base,
        environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "unknown",
        checks,
        missing_required: missingRequired
      },
      { status: 200 }
    );
  } catch {
    // Nunca crasha nem vaza detalhes; degraded seguro.
    return NextResponse.json({ app: "oracle", status: "degraded", timestamp: new Date().toISOString() }, { status: 200 });
  }
}
