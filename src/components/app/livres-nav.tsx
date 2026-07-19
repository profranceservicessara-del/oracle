import Link from "next/link";

// Abas compartilhadas dos Livros de contabilidade. Presentes nas três páginas
// (receitas, compras, resultados) para que a navegação nunca desapareça.
const TABS = [
  { key: "receitas", label: "Livro de receitas", href: "/livre-de-recettes" },
  { key: "compras", label: "Livro de compras", href: "/registre-des-achats" },
  { key: "resultados", label: "Resultados", href: "/analise" }
] as const;

export type LivresTab = (typeof TABS)[number]["key"];

export function LivresNav({ active }: { active: LivresTab }) {
  return (
    <nav aria-label="Livros de contabilidade" className="mb-6 flex gap-5 border-b border-line text-sm font-medium">
      {TABS.map((tab) =>
        tab.key === active ? (
          <span aria-current="page" className="border-b-2 border-brand pb-2 text-brand" key={tab.href}>
            {tab.label}
          </span>
        ) : (
          <Link className="border-b-2 border-transparent pb-2 text-slate-500 transition hover:text-ink" href={tab.href} key={tab.href}>
            {tab.label}
          </Link>
        )
      )}
    </nav>
  );
}
