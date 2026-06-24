import Link from "next/link";

const items = [
  { key: "comptabilite", label: "Comptabilité", href: "/documents" },
  // TODO: Create "Déclarations fiscales" route when backend support exists.
  { key: "declarations", label: "Déclarations fiscales", href: "#" },
  // TODO: Create "Justificatifs" route when backend support exists.
  { key: "justificatifs", label: "Justificatifs", href: "#" },
  { key: "factures-recues", label: "Factures reçues", href: "/facturation/fournisseurs" }
];

export function DocumentsNav({ active }: { active: string }) {
  return (
    <nav
      aria-label="Documents"
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
