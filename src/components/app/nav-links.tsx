"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/documentos", label: "Documentos" },
  { href: "/clientes", label: "Clientes" },
  { href: "/catalogo", label: "Catálogo" },
  { href: "/configuracoes/perfil", label: "Perfil fiscal" },
  { href: "/configuracoes/dados", label: "Dados" }
];

export function NavLinks() {
  const pathname = usePathname();

  return (
    <>
      {links.map((link) => {
        const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`);

        return (
          <Link
            aria-current={isActive ? "page" : undefined}
            className={`rounded-md px-3 py-2 font-medium transition ${
              isActive
                ? "bg-[#002D72]/10 text-[#002D72]"
                : "text-muted hover:bg-slate-100 hover:text-ink"
            }`}
            href={link.href}
            key={link.href}
          >
            {link.label}
          </Link>
        );
      })}
    </>
  );
}
