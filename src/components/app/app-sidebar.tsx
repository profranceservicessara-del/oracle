"use client";

import { useEffect, useRef, useState } from "react";
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
  return (
    <div className="flex h-full flex-col gap-6 bg-gradient-to-b from-[#001F4D] via-[#002D72] to-[#2B1F5B] p-4">
      <div className="px-2 pt-2">
        <p className="text-base font-semibold text-white">ProFacture</p>
      </div>
      <NavList onNavigate={onNavigate} />
      <UserMenu email={email} onNavigate={onNavigate} />
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
