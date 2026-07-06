import { createHmac, timingSafeEqual } from "node:crypto";

// Stripe via REST (sem SDK/dependência). Todas as chamadas usam STRIPE_SECRET_KEY
// do ambiente. Nada de segredo hardcoded.

const STRIPE_API = "https://api.stripe.com/v1";

export function stripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

// Codifica params no formato form-urlencoded do Stripe. As chaves já vêm com a
// notação de colchetes quando aninhadas (ex.: "line_items[0][price]").
function encodeForm(params: Record<string, string | number | boolean | undefined>): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue;
    parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
  }
  return parts.join("&");
}

export async function stripeRequest<T = Record<string, unknown>>(
  path: string,
  params: Record<string, string | number | boolean | undefined>
): Promise<T> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("Stripe não configurado.");
  }
  const response = await fetch(`${STRIPE_API}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: encodeForm(params)
  });
  const json = (await response.json()) as { error?: { message?: string } } & T;
  if (!response.ok) {
    throw new Error(json.error?.message ?? "Erro na comunicação com o Stripe.");
  }
  return json;
}

export async function stripeGet<T = Record<string, unknown>>(path: string): Promise<T> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("Stripe não configurado.");
  }
  const response = await fetch(`${STRIPE_API}${path}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${key}` }
  });
  const json = (await response.json()) as { error?: { message?: string } } & T;
  if (!response.ok) {
    throw new Error(json.error?.message ?? "Erro na comunicação com o Stripe.");
  }
  return json;
}

// Mapa plano -> price id (env, nunca hardcoded).
export function priceIdForPlan(plan: string): string | null {
  const map: Record<string, string | undefined> = {
    essentiel: process.env.STRIPE_PRICE_ESSENTIEL,
    pro: process.env.STRIPE_PRICE_PRO,
    premium: process.env.STRIPE_PRICE_PREMIUM
  };
  return map[plan] ?? null;
}

export function planForPriceId(priceId: string | null | undefined): string | null {
  if (!priceId) return null;
  if (priceId === process.env.STRIPE_PRICE_ESSENTIEL) return "essentiel";
  if (priceId === process.env.STRIPE_PRICE_PRO) return "pro";
  if (priceId === process.env.STRIPE_PRICE_PREMIUM) return "premium";
  return null;
}

// Verifica a assinatura do webhook (header Stripe-Signature: "t=...,v1=...").
// HMAC-SHA256 de `${t}.${rawBody}` com STRIPE_WEBHOOK_SECRET. Tolerância 5 min.
export function verifyStripeSignature(rawBody: string, signatureHeader: string | null, secret: string): boolean {
  if (!signatureHeader) return false;
  const parts = Object.fromEntries(
    signatureHeader.split(",").map((part) => {
      const [k, v] = part.split("=");
      return [k?.trim(), v?.trim()];
    })
  ) as { t?: string; v1?: string };
  if (!parts.t || !parts.v1) return false;

  const timestamp = Number(parts.t);
  if (!Number.isFinite(timestamp) || Math.abs(Date.now() / 1000 - timestamp) > 300) return false;

  const expected = createHmac("sha256", secret).update(`${parts.t}.${rawBody}`).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(parts.v1);
  return a.length === b.length && timingSafeEqual(a, b);
}
