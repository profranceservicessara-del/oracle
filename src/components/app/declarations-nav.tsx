import Link from "next/link";

const items = [
  { key: "fiscais", label: "Declarações fiscais", href: "/declaracoes/fiscais" },
  { key: "urssaf", label: "Declaração da Urssaf", href: "/urssaf" },
  { key: "auxiliares", label: "Declarações auxiliares", href: "/declaracoes/auxiliares" }
];

export function DeclarationsNav({ active }: { active: string }) {
  return (
    <nav aria-label="Declarações fiscais" className="mb-6 flex w-full gap-5 overflow-x-auto border-b border-line">
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
