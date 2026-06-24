"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoutButton } from "@/components/app/logout-button";

const navIcons: Record<string, ReactNode> = {
  "/dashboard": (
    <svg fill="none" height="18" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24" width="18">
      <rect height="8" rx="1.5" width="8" x="3" y="3" />
      <rect height="8" rx="1.5" width="8" x="13" y="3" />
      <rect height="8" rx="1.5" width="8" x="13" y="13" />
      <rect height="8" rx="1.5" width="8" x="3" y="13" />
    </svg>
  ),
  "/documentos": (
    <svg fill="none" height="18" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24" width="18">
      <path d="M14 3v4a1 1 0 0 0 1 1h4" />
      <path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2z" />
      <line x1="9" x2="15" y1="13" y2="13" />
      <line x1="9" x2="13" y1="17" y2="17" />
    </svg>
  ),
  "/facturation": (
    <svg fill="none" height="18" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24" width="18">
      <path d="M6 3h12a1 1 0 0 1 1 1v17l-2.5-1.5L14 21l-2-1.5L10 21l-2.5-1.5L5 21V4a1 1 0 0 1 1-1z" />
      <line x1="9" x2="15" y1="9" y2="9" />
      <line x1="9" x2="15" y1="13" y2="13" />
    </svg>
  ),
  "/documents": (
    <svg fill="none" height="18" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24" width="18">
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    </svg>
  ),
  "/clientes": (
    <svg fill="none" height="18" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24" width="18">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  "/catalogo": (
    <svg fill="none" height="18" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24" width="18">
      <path d="m7.5 4.27 9 5.15" />
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
      <path d="m3.3 7 8.7 5 8.7-5" />
      <path d="M12 22V12" />
    </svg>
  ),
  "/configuracoes/perfil": (
    <svg fill="none" height="18" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24" width="18">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </svg>
  ),
  "/configuracoes/dados": (
    <svg fill="none" height="18" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24" width="18">
      <ellipse cx="12" cy="5" rx="8" ry="3" />
      <path d="M4 5v6c0 1.66 3.58 3 8 3s8-1.34 8-3V5" />
      <path d="M4 11v6c0 1.66 3.58 3 8 3s8-1.34 8-3v-6" />
    </svg>
  ),
  "/configuracoes/seguranca": (
    <svg fill="none" height="18" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24" width="18">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  )
};

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/documentos", label: "Documentos" },
  { href: "/facturation", label: "Facturation" },
  { href: "/documents", label: "Documents" },
  { href: "/clientes", label: "Clientes" },
  { href: "/catalogo", label: "Catálogo" },
  { href: "/configuracoes/perfil", label: "Perfil fiscal" },
  { href: "/configuracoes/dados", label: "Dados" },
  { href: "/configuracoes/seguranca", label: "Segurança" }
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
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
              isActive
                ? "bg-white/15 text-white shadow-sm ring-1 ring-white/10"
                : "text-white/60 hover:bg-white/10 hover:text-white"
            }`}
            href={link.href}
            key={link.href}
            onClick={onNavigate}
          >
            <span className={`shrink-0 ${isActive ? "text-white" : "text-white/50"}`}>{navIcons[link.href]}</span>
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}

function BrandBadge({ initials }: { initials: string }) {
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#4F5FB8] to-[#2B1F5B] text-sm font-bold text-white shadow-sm ring-1 ring-white/20">
      {initials}
    </span>
  );
}

function UserMenu({ email, onNavigate }: { email: string; onNavigate?: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const initials = (email.trim()[0] ?? "U").toUpperCase();

  useEffect(() => {
    if (!open) {
      return;
    }

    function onPointerDown(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function handleNavigate() {
    setOpen(false);
    onNavigate?.();
  }

  const itemClass =
    "flex items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-sm text-slate-700 transition hover:bg-slate-50";

  return (
    <div className="relative" ref={ref}>
      {open ? (
        <div className="absolute bottom-full left-0 right-0 mb-2 rounded-2xl bg-white p-1.5 shadow-lg ring-1 ring-black/5">
          <Link className={itemClass} href="/configuracoes/perfil" onClick={handleNavigate}>
            Mon profil
          </Link>
          <Link className={itemClass} href="/configuracoes/dados" onClick={handleNavigate}>
            Paramètres
          </Link>
          <div className="my-1 border-t border-black/5" />
          {/* TODO: Later implement full i18n with French as default and Portuguese switch from Settings. */}
          <p className="px-3 py-2 text-sm text-slate-500">
            Langue: <span className="font-medium text-ink">Français</span>
          </p>
          <button
            className="flex w-full cursor-not-allowed items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left text-sm text-slate-400"
            disabled
            type="button"
          >
            Passer en portugais
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              bientôt
            </span>
          </button>
          <div className="my-1 border-t border-black/5" />
          <div className="grid p-1">
            <LogoutButton />
          </div>
        </div>
      ) : null}

      <button
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition hover:bg-white/10"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15 text-sm font-semibold text-white">
          {initials}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-white">{email || "Mon compte"}</span>
          <span className="block text-xs text-white/50">Paramètres</span>
        </span>
        <svg aria-hidden="true" className="shrink-0 text-white/50" fill="none" height="16" stroke="currentColor" strokeLinecap="round" strokeWidth="2" viewBox="0 0 24 24" width="16">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
    </div>
  );
}

function SidebarBody({ email, onNavigate }: { email: string; onNavigate?: () => void }) {
  const initials = ((email.split("@")[0] ?? "").replace(/[^a-zA-Z]/g, "").slice(0, 2) || "PF").toUpperCase();

  return (
    <div className="flex h-full flex-col gap-5 bg-gradient-to-b from-[#001433] via-[#002D72] to-[#241845] p-4">
      <div className="flex items-center gap-3 px-1 pt-1">
        <BrandBadge initials={initials} />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">ProFacture</p>
          <p className="truncate text-[10px] font-medium uppercase tracking-wide text-white/40">
            Sistema financeiro
          </p>
        </div>
      </div>
      <div className="border-t border-white/10" />
      <NavList onNavigate={onNavigate} />
      <UserMenu email={email} onNavigate={onNavigate} />
    </div>
  );
}

export function AppSidebar({ email }: { email: string }) {
  const [open, setOpen] = useState(false);
  const initials = ((email.split("@")[0] ?? "").replace(/[^a-zA-Z]/g, "").slice(0, 2) || "PF").toUpperCase();

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 md:block">
        <SidebarBody email={email} />
      </aside>

      <div className="sticky top-0 z-20 flex items-center justify-between border-b border-black/5 bg-white/80 px-4 py-3 backdrop-blur md:hidden">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#4F5FB8] to-[#2B1F5B] text-xs font-bold text-white ring-1 ring-black/5">
            {initials}
          </span>
          <p className="text-base font-semibold text-ink">ProFacture</p>
        </div>
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
