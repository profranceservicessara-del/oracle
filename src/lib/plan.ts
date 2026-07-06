import type { Profile } from "@/lib/types";

// Helper de plano/gating. Fonte da verdade = campos billing do profile,
// atualizados pelo webhook do Stripe.

export type PlanTier = "free" | "essentiel" | "pro" | "premium";

const RANK: Record<PlanTier, number> = { free: 0, essentiel: 1, pro: 2, premium: 3 };
const ACTIVE_STATUSES = new Set(["active", "trialing", "past_due"]);

export function subscriptionActive(profile: Pick<Profile, "subscription_status"> | null | undefined): boolean {
  return Boolean(profile?.subscription_status && ACTIVE_STATUSES.has(profile.subscription_status));
}

export function currentPlan(profile: Pick<Profile, "plan" | "subscription_status"> | null | undefined): PlanTier {
  if (!subscriptionActive(profile)) return "free";
  const plan = profile?.plan as PlanTier | null | undefined;
  return plan && plan in RANK ? plan : "free";
}

// true se o plano do usuário é >= o requerido (ex.: hasPlan(profile, "pro")).
export function hasPlan(
  profile: Pick<Profile, "plan" | "subscription_status"> | null | undefined,
  required: PlanTier
): boolean {
  return RANK[currentPlan(profile)] >= RANK[required];
}

export const planLabels: Record<PlanTier, string> = {
  free: "Gratuito",
  essentiel: "Essentiel",
  pro: "Pro",
  premium: "Premium"
};

export const statusLabels: Record<string, string> = {
  active: "Ativa",
  trialing: "Em teste",
  past_due: "Pagamento pendente",
  canceled: "Cancelada",
  unpaid: "Não paga",
  inactive: "Inativa"
};
