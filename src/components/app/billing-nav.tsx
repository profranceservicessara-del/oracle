import Link from "next/link";

const items = [
  { key: "factures", label: "Factures", href: "/facturation" },
  { key: "devis", label: "Devis", href: "/facturation/devis" },
  { key: "clients", label: "Clients", href: "/clientes" },
  { key: "produits", label: "Produits et services", href: "/catalogo" },
  // TODO: Create recurring invoices route (Factures récurrentes).
  { key: "recurrentes", label: "Factures récurrentes", href: "#" },
  { key: "fournisseurs", label: "Factures fournisseurs", href: "/registre-des-achats" }
];

export function BillingNav({ active }: { active: string }) {
  return (
    <nav
      aria-label="Facturation"
      className="flex gap-1 overflow-x-auto pb-1 lg:w-56 lg:shrink-0 lg:flex-col lg:overflow-visible lg:pb-0"
    >
      {items.map((item) => {
        const isActive = item.key === active;

        return (
          <Link
            aria-current={isActive ? "page" : undefined}
            className={`shrink-0 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
              isActive
                ? "bg-[#002D72]/10 text-[#002D72]"
                : "text-muted hover:bg-slate-100 hover:text-ink"
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
