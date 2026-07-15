import { hasPlan, subscriptionActive, type PlanTier } from "@/lib/plan";
import type { Profile } from "@/lib/types";

// Matriz de planos (feature -> tier mínimo). Fonte da regra de monetização.
// Essentiel = MVP core (aberto a todos). Pro = CRM. Premium = avançado.
export const FEATURE_PLAN = {
  crm: "pro",
  pipeline: "pro",
  agenda: "pro"
} as const satisfies Record<string, PlanTier>;

export type GatedFeature = keyof typeof FEATURE_PLAN;

// Gating "grandfather": só bloqueia quem TEM assinatura paga ativa num tier
// abaixo do requerido. Sem assinatura ativa (free/inactive) => NÃO bloqueia
// (fase de lançamento). Vira estrito trocando esta única função por
// `return !hasPlan(profile, required);`.
export function isGated(
  profile: Pick<Profile, "plan" | "subscription_status"> | null | undefined,
  required: PlanTier
): boolean {
  return subscriptionActive(profile) && !hasPlan(profile, required);
}

export function isFeatureGated(
  profile: Pick<Profile, "plan" | "subscription_status"> | null | undefined,
  feature: GatedFeature
): boolean {
  return isGated(profile, FEATURE_PLAN[feature]);
}

// Gate ESTRITO (sem grandfather): bloqueia todos que não tenham o tier pago
// ativo — inclui free, inativo e planos abaixo. Usar SÓ em features Premium
// novas (Assistente, banco, serviço humano). NÃO altera isGated/grandfather
// dos módulos existentes.
export function requiresPaidPlan(
  profile: Pick<Profile, "plan" | "subscription_status"> | null | undefined,
  required: PlanTier
): boolean {
  return !hasPlan(profile, required);
}
