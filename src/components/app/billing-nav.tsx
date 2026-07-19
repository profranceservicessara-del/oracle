import Link from "next/link";

const items = [
  { key: "factures", label: "Faturas", href: "/facturation" },
  { key: "recurrentes", label: "Faturas recorrentes", href: "/facturation/recurrentes" },
  { key: "fournisseurs", label: "Faturas recebidas", href: "/facturation/fournisseurs" },
  { key: "aparencia", label: "Personalizar fatura", href: "/configuracoes/aparencia" }
];

export function BillingNav({ active }: { active: string }) {
  return (
    <nav
      aria-label="Cobrança"
      className="flex w-full gap-5 overflow-x-auto border-b border-line"
    >
      {items.map((item) => {
        const isActive = item.key === active;

        return (
          <Link
            aria-current={isActive ? "page" : undefined}
            className={`shrink-0 border-b-2 px-0 pb-3 pt-1 text-sm font-semibold transition ${
              isActive
                ? "border-brand text-brand"
                : "border-transparent text-slate-500 hover:border-slate-300 hover:text-ink"
            }`}
            href={item.href}
            key={item.key}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
