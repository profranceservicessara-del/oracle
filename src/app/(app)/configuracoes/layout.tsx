"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

// Premium settings shell — left rail (grouped) + main content card. The gear in
// the sidebar lands here. Real routes link; not-yet-built items are muted.
// soon = tem rota mas ainda não está pronto para produção: exibido "Em breve",
// desabilitado (não navega). href mantido para restaurar facilmente depois.
type Item = { href: string | null; label: string; dot?: boolean; icon?: ReactNode; soon?: boolean };
type Group = { key: string; label: string; children: Item[] };

const groups: Group[] = [
  {
    key: "conta",
    label: "Conta",
    children: [
      { href: "/configuracoes/empresa", label: "Empresa" },
      { href: "/configuracoes/perfil", label: "Perfil" },
      { href: "/configuracoes/dados", label: "Integrações", soon: true },
      { href: "/configuracoes/pagamentos", label: "Pagamentos / Assinatura" },
      { href: "/configuracoes/seguranca", label: "Segurança" },
      { href: "/configuracoes/moedas", label: "Moedas e idiomas" },
      { href: null, label: "Usuários" }
    ]
  },
  {
    key: "cobranca",
    label: "Cobrança",
    children: [
      { href: "/configuracoes/aparencia", label: "Aparência", soon: true },
      { href: null, label: "Informação" },
      { href: null, label: "Pagamento" },
      { href: null, label: "Lembretes automáticos" },
      { href: null, label: "Envio de e-mails" },
      { href: null, label: "Numeração" },
      { href: null, label: "Faturação eletrônica", dot: true }
    ]
  },
  {
    key: "contabilidade",
    label: "Contabilidade",
    children: [
      { href: "/documents", label: "Visão geral" },
      { href: null, label: "Exportações" }
    ]
  }
];

const giftIcon = (
  <svg fill="none" height="16" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" viewBox="0 0 24 24" width="16">
    <rect height="5" rx="1" width="20" x="2" y="7" /><path d="M12 22V7" /><path d="M4 12v9a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-9" />
    <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" /><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
  </svg>
);

const soloLinks: Item[] = [
  { href: null, label: "Produtividade" },
  { href: "/configuracoes/atalhos", label: "Gerenciar atalhos" },
  { href: "/configuracoes/recomendar", label: "Recomendar", icon: giftIcon, soon: true },
  { href: null, label: "Funcionalidades experimentais" }
];

function groupOwns(group: Group, pathname: string): boolean {
  return group.children.some((child) => child.href && (pathname === child.href || pathname.startsWith(`${child.href}/`)));
}

function LeafItem({ item, pathname }: { item: Item; pathname: string }) {
  const active = Boolean(item.href) && (pathname === item.href || pathname.startsWith(`${item.href}/`));

  if (!item.href || item.soon) {
    return (
      <span
        aria-disabled="true"
        className="flex cursor-default items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-400"
        title="Em breve"
      >
        {item.label}
        {item.dot ? <span className="h-1.5 w-1.5 rounded-full bg-red-500" /> : null}
        <span className="ml-auto shrink-0 rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-slate-400">
          Em breve
        </span>
      </span>
    );
  }

  return (
    <Link
      aria-current={active ? "page" : undefined}
      className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition ${
        active ? "bg-[#EAF0FF] font-semibold text-[#1D4ED8]" : "text-slate-600 hover:bg-slate-50 hover:text-ink"
      }`}
      href={item.href}
    >
      {item.icon ? <span className={`shrink-0 ${active ? "text-[#1D4ED8]" : "text-slate-400"}`}>{item.icon}</span> : null}
      {item.label}
      {item.dot ? <span className="h-1.5 w-1.5 rounded-full bg-red-500" /> : null}
    </Link>
  );
}

function SettingsRail() {
  const pathname = usePathname();
  const [open, setOpen] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = { conta: true };
    for (const group of groups) if (groupOwns(group, pathname)) initial[group.key] = true;
    return initial;
  });

  useEffect(() => {
    for (const group of groups) {
      if (groupOwns(group, pathname)) setOpen((current) => (current[group.key] ? current : { ...current, [group.key]: true }));
    }
  }, [pathname]);

  return (
    <nav className="space-y-1">
      <h2 className="px-2 pb-2 text-lg font-bold text-ink">Configurações</h2>
      {groups.map((group) => {
        const isOpen = Boolean(open[group.key]);
        return (
          <div key={group.key}>
            <button
              aria-expanded={isOpen}
              className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              onClick={() => setOpen((current) => ({ ...current, [group.key]: !current[group.key] }))}
              type="button"
            >
              {group.label}
              <svg
                className={`text-slate-400 transition-transform ${isOpen ? "rotate-90" : ""}`}
                fill="none"
                height="16"
                stroke="currentColor"
                strokeLinecap="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                width="16"
              >
                <path d="m9 6 6 6-6 6" />
              </svg>
            </button>
            {isOpen ? (
              <div className="ml-2 space-y-0.5 border-l border-slate-200 pl-2">
                {group.children.map((child) => (
                  <LeafItem item={child} key={child.label} pathname={pathname} />
                ))}
              </div>
            ) : null}
          </div>
        );
      })}
      {soloLinks.map((item) => (
        <div className="px-1" key={item.label}>
          <LeafItem item={item} pathname={pathname} />
        </div>
      ))}
    </nav>
  );
}

export default function ConfiguracoesLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 md:flex-row md:gap-8 md:py-8">
      <aside className="md:w-64 md:shrink-0">
        <div className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-black/5 md:sticky md:top-6">
          <SettingsRail />
        </div>
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
