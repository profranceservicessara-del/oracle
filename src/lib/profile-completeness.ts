import type { Profile } from "@/lib/types";

// Fonte única de completude do perfil (onboarding + proteção de emissão).
// Só usa colunas existentes em `profiles`. Situação jurídica (micro-entreprise)
// e e-mail (auth) são constantes do produto, sempre considerados preenchidos.

// Colunas reais em profiles que bloqueiam a emissão de faturas.
const GATING_FIELDS: Array<keyof Profile> = ["nome", "siret", "adresse_rue", "adresse_cp", "adresse_ville"];

export function isProfileIncomplete(profile: Profile | null): boolean {
  if (!profile) return true;
  return GATING_FIELDS.some((field) => !profile[field]);
}

// As 7 "informações" mostradas no onboarding, na ordem do wizard.
export function profileChecklist(
  profile: Profile | null,
  hasEmail: boolean
): Array<{ label: string; filled: boolean }> {
  return [
    { label: "Nome da empresa", filled: Boolean(profile?.nome) },
    { label: "Situação jurídica", filled: true }, // micro-entreprise (fixo)
    { label: "SIRET", filled: Boolean(profile?.siret) },
    { label: "Endereço", filled: Boolean(profile?.adresse_rue) },
    { label: "Código postal", filled: Boolean(profile?.adresse_cp) },
    { label: "Município", filled: Boolean(profile?.adresse_ville) },
    { label: "E-mail", filled: hasEmail }
  ];
}

export function profileCompletion(profile: Profile | null, hasEmail: boolean): { filled: number; total: number } {
  const items = profileChecklist(profile, hasEmail);
  return { filled: items.filter((item) => item.filled).length, total: items.length };
}
