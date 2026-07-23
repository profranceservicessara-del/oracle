"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { label: "Faturas", href: "/compras/faturas" },
  { label: "Notas de crédito", href: "/compras/notas-credito" },
  { label: "Ordens", href: "/compras/ordens" },
  { label: "Entregas", href: "/compras/entregas" },
  { label: "A verificar", href: "/compras/inbox" }
];

export function ComprasNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Compras"
      className="flex w-full gap-5 overflow-x-auto border-b border-line"
    >
      {items.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            aria-current={isActive ? "page" : undefined}
            className={`shrink-0 border-b-2 px-0 pb-3 pt-1 text-sm font-semibold transition ${
              isActive
                ? "border-brand text-brand"
                : "border-transparent text-slate-500 hover:border-slate-300 hover:text-ink"
            }`}
            href={item.href}
            key={item.href}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
