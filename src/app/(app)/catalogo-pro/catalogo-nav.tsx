"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { label: "Produtos", href: "/catalogo-pro/produtos" },
  { label: "Serviços", href: "/catalogo-pro/servicos" },
  { label: "Variações", href: "/catalogo-pro/variacoes" },
  { label: "Categorias", href: "/catalogo-pro/categorias" },
  { label: "Listas de preço", href: "/catalogo-pro/precos" },
  { label: "Promoções", href: "/catalogo-pro/promocoes" }
];

// Sub-nav horizontal do módulo Catálogo pro. Estilo espelha BillingNav e
// ComprasNav para manter consistência do design system.
export function CatalogoNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Catálogo"
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
