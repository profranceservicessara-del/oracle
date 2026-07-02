import type { ReactNode } from "react";

// Atalhos compartilhados entre o gerenciador (Configurações > Gerenciar atalhos)
// e a sidebar (bloco acima do usuário). Sem schema/tabela: a visibilidade fica em
// localStorage e sincroniza ao vivo via um CustomEvent na mesma aba (e `storage`
// entre abas). Fallback seguro: se nada salvo, todos visíveis.

export type ShortcutDef = { key: string; label: string; href: string; icon: ReactNode };

const s = { fill: "none", height: 16, width: 16, stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 1.7, viewBox: "0 0 24 24" } as const;

export const SHORTCUTS: ShortcutDef[] = [
  {
    key: "fatura",
    label: "Criar uma fatura",
    href: "/facturation",
    icon: (
      <svg {...s}><path d="M6 3h12a1 1 0 0 1 1 1v17l-2.5-1.5L14 21l-2-1.5L10 21l-2.5-1.5L5 21V4a1 1 0 0 1 1-1z" /><line x1="9" x2="15" y1="9" y2="9" /><line x1="9" x2="15" y1="13" y2="13" /></svg>
    )
  },
  {
    key: "orcamento",
    label: "Solicite um orçamento",
    href: "/facturation/devis",
    icon: (
      <svg {...s}><path d="M14 3v4a1 1 0 0 0 1 1h4" /><path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2z" /><line x1="9" x2="14" y1="13" y2="13" /></svg>
    )
  },
  {
    key: "cliente",
    label: "Adicionar um cliente",
    href: "/clientes",
    icon: (
      <svg {...s}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M20 8v6M23 11h-6" /></svg>
    )
  }
];

const STORAGE_KEY = "oracle:shortcuts:v1";
export const SHORTCUTS_EVENT = "oracle:shortcuts";

const ALL_KEYS = SHORTCUTS.map((item) => item.key);

export function readVisibleKeys(): string[] {
  if (typeof window === "undefined") return ALL_KEYS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return ALL_KEYS;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return ALL_KEYS;
    // Preserva a ORDEM salva (para reordenação), filtrando chaves desconhecidas
    // e duplicatas.
    const known = new Set(ALL_KEYS);
    const result: string[] = [];
    for (const value of parsed) {
      if (typeof value === "string" && known.has(value) && !result.includes(value)) result.push(value);
    }
    return result;
  } catch {
    return ALL_KEYS;
  }
}

export function writeVisibleKeys(keys: string[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
    window.dispatchEvent(new Event(SHORTCUTS_EVENT));
  } catch {
    // no-op: localStorage indisponível (modo privado etc.)
  }
}
