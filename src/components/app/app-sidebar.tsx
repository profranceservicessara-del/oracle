"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoutButton } from "@/components/app/logout-button";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/documentos", label: "Documentos" },
  { href: "/clientes", label: "Clientes" },
  { href: "/catalogo", label: "Catálogo" },
  { href: "/configuracoes/perfil", label: "Perfil fiscal" },
  { href: "/configuracoes/dados", label: "Dados" }
];

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-1 flex-col gap-1">
      {links.map((link) => {
        const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`);

        return (
          <Link
            aria-current={isActive ? "page" : undefined}
            className={`rounded-xl px-3 py-2.5 text-sm font-medium transition ${
              isActive ? "bg-white/15 text-white" : "text-white/70 hover:bg-white/10 hover:text-white"
            }`}
            href={link.href}
            key={link.href}
            onClick={onNavigate}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarBody({ email, onNavigate }: { email: string; onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col gap-6 bg-gradient-to-b from-[#001F4D] via-[#002D72] to-[#2B1F5B] p-4">
      <div className="px-2 pt-2">
        <p className="text-base font-semibold text-white">ProFacture</p>
        <p className="mt-1 truncate text-xs text-white/50">{email}</p>
      </div>
      <NavList onNavigate={onNavigate} />
      <div className="border-t border-white/10 pt-4">
        <LogoutButton />
      </div>
    </div>
  );
}

export function AppSidebar({ email }: { email: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 md:block">
        <SidebarBody email={email} />
      </aside>

      <div className="sticky top-0 z-20 flex items-center justify-between border-b border-black/5 bg-white/80 px-4 py-3 backdrop-blur md:hidden">
        <p className="text-base font-semibold text-ink">ProFacture</p>
        <button
          aria-label="Abrir menu"
          className="inline-flex h-10 w-10 items-center justify-center rounded-2xl ring-1 ring-black/5 transition hover:bg-slate-100"
          onClick={() => setOpen(true)}
          type="button"
        >
          <svg fill="none" height="20" stroke="currentColor" strokeLinecap="round" strokeWidth="2" viewBox="0 0 24 24" width="20">
            <line x1="4" x2="20" y1="6" y2="6" />
            <line x1="4" x2="20" y1="12" y2="12" />
            <line x1="4" x2="20" y1="18" y2="18" />
          </svg>
        </button>
      </div>

      {open ? (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            aria-label="Fechar menu"
            className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            type="button"
          />
          <div className="absolute inset-y-0 left-0 w-72 max-w-[80%]">
            <SidebarBody email={email} onNavigate={() => setOpen(false)} />
          </div>
        </div>
      ) : null}
    </>
  );
}
