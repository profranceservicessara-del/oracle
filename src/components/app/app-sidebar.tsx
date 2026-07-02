"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { t, type Locale } from "@/lib/i18n/dictionaries";

// ---------------------------------------------------------------------------
// Icons — 18px for section rows, 16px for sub-items. Rendered in the periwinkle
// blue tone (ProFrance style); brightness shifts on hover / active.
// ---------------------------------------------------------------------------
const s18 = { fill: "none", height: 18, width: 18, stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 1.8, viewBox: "0 0 24 24" } as const;
const s16 = { ...s18, height: 16, width: 16, strokeWidth: 1.7 } as const;

const icons = {
  dashboard: (
    <svg {...s18}><path d="M4 4v16h16" /><path d="M8 16l3.5-4 3 2.5 5.5-6.5" /><path d="M16 8h4v4" /></svg>
  ),
  documentos: (
    <svg {...s18}><path d="M14 3v4a1 1 0 0 0 1 1h4" /><path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2z" /><line x1="9" x2="15" y1="13" y2="13" /><line x1="9" x2="13" y1="17" y2="17" /></svg>
  ),
  faturamento: (
    <svg {...s18}><path d="M6 3h12a1 1 0 0 1 1 1v17l-2.5-1.5L14 21l-2-1.5L10 21l-2.5-1.5L5 21V4a1 1 0 0 1 1-1z" /><line x1="9" x2="15" y1="9" y2="9" /><line x1="9" x2="15" y1="13" y2="13" /></svg>
  ),
  contabilidade: (
    <svg {...s18}><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></svg>
  ),
  clientes: (
    <svg {...s18}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
  ),
  catalogo: (
    <svg {...s18}><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" /><path d="m3.3 7 8.7 5 8.7-5" /><path d="M12 22V12" /></svg>
  ),
  config: (
    <svg {...s18}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6h.09A1.65 1.65 0 0 0 10 3.09V3a2 2 0 0 1 4 0v.09A1.65 1.65 0 0 0 15 4.6a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9v.09a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
  ),
  // sub-item icons (16px)
  faturas: (<svg {...s16}><path d="M6 3h12a1 1 0 0 1 1 1v17l-2.5-1.5L14 21l-2-1.5L10 21l-2.5-1.5L5 21V4a1 1 0 0 1 1-1z" /><line x1="9" x2="15" y1="9" y2="9" /><line x1="9" x2="15" y1="13" y2="13" /></svg>),
  orcamentos: (<svg {...s16}><path d="M14 3v4a1 1 0 0 0 1 1h4" /><path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2z" /><line x1="9" x2="14" y1="13" y2="13" /></svg>),
  produtos: (<svg {...s16}><path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V4h9l8.6 8.6a2 2 0 0 1 0 2.8z" /><circle cx="7.5" cy="7.5" r="1.3" /></svg>),
  recorrentes: (<svg {...s16}><path d="M17 2l4 4-4 4" /><path d="M3 11v-1a4 4 0 0 1 4-4h14" /><path d="M7 22l-4-4 4-4" /><path d="M21 13v1a4 4 0 0 1-4 4H3" /></svg>),
  fornecedores: (<svg {...s16}><path d="M10 17h4V5H2v12h3" /><path d="M20 17h2v-3.3a4 4 0 0 0-1.2-2.9L19 9h-5v8h1" /><circle cx="7.5" cy="17.5" r="1.8" /><circle cx="17.5" cy="17.5" r="1.8" /></svg>),
  crm: (<svg {...s16}><rect height="7" rx="1" width="7" x="3" y="3" /><rect height="7" rx="1" width="7" x="14" y="3" /><rect height="7" rx="1" width="7" x="14" y="14" /><rect height="7" rx="1" width="7" x="3" y="14" /></svg>),
  agenda: (<svg {...s16}><rect height="18" rx="2" width="18" x="3" y="4" /><line x1="16" x2="16" y1="2" y2="6" /><line x1="8" x2="8" y1="2" y2="6" /><line x1="3" x2="21" y1="10" y2="10" /></svg>),
  clientesLeaf: (<svg {...s16}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /></svg>),
  perfil: (<svg {...s16}><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg>),
  dados: (<svg {...s16}><ellipse cx="12" cy="5" rx="8" ry="3" /><path d="M4 5v6c0 1.66 3.58 3 8 3s8-1.34 8-3V5" /><path d="M4 11v6c0 1.66 3.58 3 8 3s8-1.34 8-3v-6" /></svg>),
  seguranca: (<svg {...s16}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>),
  catalogoLeaf: (<svg {...s16}><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" /><path d="m3.3 7 8.7 5 8.7-5" /><path d="M12 22V12" /></svg>),
  contabilidadeLeaf: (<svg {...s16}><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></svg>),
  declaracoes: (<svg {...s16}><path d="M14 3v4a1 1 0 0 0 1 1h4" /><path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2z" /><line x1="9" x2="14" y1="13" y2="13" /></svg>),
  comprovantes: (<svg {...s16}><rect height="4" rx="1" width="8" x="8" y="3" /><path d="M9 5H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-3" /><path d="m9 14 2 2 4-4" /></svg>),
  faturasRecebidas: (<svg {...s16}><path d="M22 12h-6l-2 3h-4l-2-3H2" /><path d="M5.5 5.5 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.5-6.5A2 2 0 0 0 16.8 4H7.2a2 2 0 0 0-1.7 1.5z" /></svg>),
  moedas: (<svg {...s16}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" /></svg>)
} as const;

type Leaf = { href: string; label: string; icon: ReactNode };
type NavItem =
  | { kind: "link"; href: string; label: string; icon: ReactNode }
  | { kind: "group"; key: string; label: string; icon: ReactNode; children: Leaf[] };

const nav: NavItem[] = [
  { kind: "link", href: "/dashboard", label: "Análise", icon: icons.dashboard },
  { kind: "link", href: "/documentos", label: "Documentos", icon: icons.documentos },
  {
    kind: "group",
    key: "faturamento",
    label: "Cobrança",
    icon: icons.faturamento,
    children: [
      { href: "/facturation", label: "Faturas", icon: icons.faturas },
      { href: "/facturation/devis", label: "Orçamentos", icon: icons.orcamentos },
      { href: "/facturation/produits", label: "Produtos e serviços", icon: icons.produtos },
      { href: "/catalogo", label: "Catálogo", icon: icons.catalogoLeaf }
    ]
  },
  {
    kind: "group",
    key: "clientes",
    label: "Clientes",
    icon: icons.clientes,
    children: [
      { href: "/crm", label: "CRM", icon: icons.crm },
      { href: "/crm/agenda", label: "Agenda", icon: icons.agenda },
      { href: "/clientes", label: "Clientes", icon: icons.clientesLeaf }
    ]
  },
  {
    kind: "group",
    key: "contabilidade",
    label: "Contabilidade",
    icon: icons.contabilidade,
    children: [
      { href: "/documents", label: "Contabilidade", icon: icons.contabilidadeLeaf },
      { href: "#", label: "Declarações fiscais", icon: icons.declaracoes },
      { href: "#", label: "Comprovantes", icon: icons.comprovantes },
      { href: "/facturation/fournisseurs", label: "Faturas recebidas", icon: icons.faturasRecebidas }
    ]
  }
];

// ACTIVE item — premium glass: translucent fill + backdrop blur, inset ring,
// soft inner top highlight, depth shadow, and a white vertical accent stroke on
// the left (matching the "Clientes" reference).
const activeCard =
  "relative bg-white/[0.1] text-white backdrop-blur-sm ring-1 ring-inset ring-white/20 " +
  "shadow-[0_8px_22px_-10px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.12)] " +
  "before:absolute before:left-1 before:top-1/2 before:h-5 before:w-[3px] before:-translate-y-1/2 " +
  "before:rounded-full before:bg-white before:shadow-[0_0_8px_rgba(255,255,255,0.45)] before:content-['']";

// IDLE row — white text + premium glass-blue hover: rounded surface (rows are
// already rounded-xl), subtle blue fill + backdrop blur, border highlight, soft
// depth shadow, and a gentle lift. Applied to every menu item for consistency.
const idleRow =
  "text-white hover:-translate-y-px hover:bg-[#7EA0FF]/10 hover:backdrop-blur-sm hover:ring-1 hover:ring-inset hover:ring-white/10 hover:shadow-[0_6px_16px_-8px_rgba(0,0,0,0.55)]";

// All destination hrefs, used to resolve the single best (most-specific) match so
// a parent path like /facturation never stays "active" on /facturation/devis.
const allHrefs = nav.flatMap((item) => (item.kind === "link" ? [item.href] : item.children.map((child) => child.href)));

function activeHrefFor(pathname: string): string {
  let best = "";
  for (const href of allHrefs) {
    if ((pathname === href || pathname.startsWith(`${href}/`)) && href.length > best.length) {
      best = href;
    }
  }
  return best;
}

function LeafRow({ leaf, active, onNavigate }: { leaf: Leaf; active: boolean; onNavigate?: () => void }) {
  return (
    <Link
      aria-current={active ? "page" : undefined}
      className={`group/leaf relative flex items-center gap-2.5 rounded-xl py-2 pl-3 pr-3 text-[13px] font-medium transition-all duration-200 ${
        active ? activeCard : idleRow
      }`}
      href={leaf.href}
      onClick={onNavigate}
    >
      <span className={`shrink-0 transition-colors ${active ? "text-[#AFC6FF]" : "text-[#8FB2FF] group-hover/leaf:text-[#9FB6FF]"}`}>
        {leaf.icon}
      </span>
      <span className="truncate">{leaf.label}</span>
    </Link>
  );
}

function GroupRow({
  item,
  activeHref,
  open,
  onToggle,
  onNavigate
}: {
  item: Extract<NavItem, { kind: "group" }>;
  activeHref: string;
  open: boolean;
  onToggle: () => void;
  onNavigate?: () => void;
}) {
  const hasActiveChild = item.children.some((child) => child.href === activeHref);

  return (
    <div>
      <button
        aria-expanded={open}
        className={`group/row flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${idleRow}`}
        onClick={onToggle}
        type="button"
      >
        <span className={`shrink-0 transition-colors ${hasActiveChild ? "text-[#93ACFF]" : "text-[#8FB2FF] group-hover/row:text-[#9FB6FF]"}`}>
          {item.icon}
        </span>
        <span className="flex-1 text-left">{item.label}</span>
        {hasActiveChild && !open ? <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#6E8CF0]" /> : null}
        <svg
          aria-hidden="true"
          className={`shrink-0 text-white/40 transition-transform duration-300 ${open ? "rotate-180" : ""}`}
          fill="none"
          height="15"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
          width="15"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {/* Inline accordion — smooth height via grid-rows 0fr → 1fr */}
      <div className={`grid transition-all duration-300 ease-out ${open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
        <div className="overflow-hidden">
          <div className="ml-[1.35rem] mt-1 space-y-0.5 border-l border-white/10 pb-1 pl-2.5">
            {item.children.map((child) => (
              <LeafRow active={child.href === activeHref} key={child.href} leaf={child} onNavigate={onNavigate} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function NavList({ onNavigate, collapsed, onExpand }: { onNavigate?: () => void; collapsed?: boolean; onExpand?: () => void }) {
  const pathname = usePathname();
  const activeHref = activeHrefFor(pathname);
  const [open, setOpen] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const item of nav) {
      if (item.kind === "group" && item.children.some((child) => child.href === activeHref)) {
        initial[item.key] = true;
      }
    }
    return initial;
  });

  // Auto-open the group that owns the active route on navigation (keeps others as-is).
  useEffect(() => {
    for (const item of nav) {
      if (item.kind === "group" && item.children.some((child) => child.href === activeHref)) {
        setOpen((current) => (current[item.key] ? current : { ...current, [item.key]: true }));
      }
    }
  }, [activeHref]);

  if (collapsed) {
    return (
      <nav className="flex flex-1 flex-col items-center gap-1 overflow-y-auto">
        {nav.map((item) => {
          const active =
            item.kind === "link" ? item.href === activeHref : item.children.some((child) => child.href === activeHref);
          const cls = `flex h-11 w-11 items-center justify-center rounded-xl transition-all duration-200 ${
            active ? activeCard : idleRow
          }`;
          const iconCls = `${active ? "text-[#AFC6FF]" : "text-[#8FB2FF]"}`;
          return item.kind === "link" ? (
            <Link aria-current={active ? "page" : undefined} className={cls} href={item.href} key={item.href} onClick={onNavigate} title={item.label}>
              <span className={iconCls}>{item.icon}</span>
            </Link>
          ) : (
            <button className={cls} key={item.key} onClick={onExpand} title={item.label} type="button">
              <span className={iconCls}>{item.icon}</span>
            </button>
          );
        })}
      </nav>
    );
  }

  return (
    <nav className="flex flex-1 flex-col gap-1 overflow-y-auto pr-0.5">
      {nav.map((item) =>
        item.kind === "link" ? (
          <Link
            aria-current={item.href === activeHref ? "page" : undefined}
            className={`group/row flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
              item.href === activeHref ? activeCard : idleRow
            }`}
            href={item.href}
            key={item.href}
            onClick={onNavigate}
          >
            <span className={`shrink-0 transition-colors ${item.href === activeHref ? "text-[#AFC6FF]" : "text-[#8FB2FF] group-hover/row:text-[#9FB6FF]"}`}>
              {item.icon}
            </span>
            {item.label}
          </Link>
        ) : (
          <GroupRow
            activeHref={activeHref}
            item={item}
            key={item.key}
            onNavigate={onNavigate}
            onToggle={() => setOpen((current) => ({ ...current, [item.key]: !current[item.key] }))}
            open={Boolean(open[item.key])}
          />
        )
      )}
    </nav>
  );
}

function BrandBadge({ initials }: { initials: string }) {
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#5A74E0] to-[#1B2A66] text-sm font-bold text-white shadow-sm ring-1 ring-white/20">
      {initials}
    </span>
  );
}

// Bottom account block — clicking it collapses/expands the sidebar (icon-only
// mode). No gear. The avatar (photo or email initial) stays visible in both
// states. Profile is reached from the Configurações rail.
function UserMenu({ email, locale, avatarUrl, collapsed, onToggle }: { email: string; locale: Locale; avatarUrl?: string | null; collapsed?: boolean; onToggle?: () => void }) {
  const initials = (email.trim()[0] ?? "U").toUpperCase();

  const avatar = (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/15 text-sm font-semibold text-white ring-1 ring-white/10">
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img alt="Foto do perfil" className="h-full w-full object-cover" src={avatarUrl} />
      ) : (
        initials
      )}
    </span>
  );

  return (
    <button
      aria-expanded={!collapsed}
      aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
      className={`flex w-full items-center gap-3 rounded-xl px-1 py-1.5 text-left transition hover:-translate-y-px hover:bg-white/10 ${collapsed ? "justify-center" : ""}`}
      onClick={onToggle}
      title={collapsed ? "Expandir menu" : "Recolher menu"}
      type="button"
    >
      {avatar}
      {collapsed ? null : (
        <>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-white">{email || t(locale, "menu.account")}</span>
            <span className="block text-xs text-white/50">{t(locale, "menu.profile")}</span>
          </span>
          <svg aria-hidden="true" className="shrink-0 text-white/40" fill="none" height="16" stroke="currentColor" strokeLinecap="round" strokeWidth="2" viewBox="0 0 24 24" width="16">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </>
      )}
    </button>
  );
}

function SidebarBody({ email, locale, avatarUrl, onNavigate, collapsed, onToggleCollapse }: { email: string; locale: Locale; avatarUrl?: string | null; onNavigate?: () => void; collapsed?: boolean; onToggleCollapse?: () => void }) {
  const initials = ((email.split("@")[0] ?? "").replace(/[^a-zA-Z]/g, "").slice(0, 2) || "PF").toUpperCase();

  return (
    <div className={`flex h-full flex-col gap-5 bg-gradient-to-b from-[#00153A] via-[#032A63] to-[#061A3E] ${collapsed ? "px-2 py-4" : "p-4"}`}>
      <Link
        aria-label="Ir para Análise"
        className={`flex items-center gap-3 rounded-xl px-1 pt-1 transition hover:opacity-90 ${collapsed ? "justify-center" : ""}`}
        href="/dashboard"
        onClick={onNavigate}
      >
        <BrandBadge initials={initials} />
        {collapsed ? null : (
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">Oracle</p>
            <p className="truncate text-[10px] font-medium uppercase tracking-wide text-white/40">
              Sistema financeiro
            </p>
          </div>
        )}
      </Link>
      <div className="border-t border-white/10" />
      <NavList collapsed={collapsed} onExpand={onToggleCollapse} onNavigate={onNavigate} />
      <UserMenu avatarUrl={avatarUrl} collapsed={collapsed} email={email} locale={locale} onToggle={onToggleCollapse} />
    </div>
  );
}

export function AppSidebar({ email, locale, avatarUrl }: { email: string; locale: Locale; avatarUrl?: string | null }) {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const initials = ((email.split("@")[0] ?? "").replace(/[^a-zA-Z]/g, "").slice(0, 2) || "PF").toUpperCase();

  // Sync collapse to <html> so the main content offset (in the app layout) can
  // react via a Tailwind data-attribute variant, without a shared provider.
  useEffect(() => {
    document.documentElement.dataset.sidebarCollapsed = collapsed ? "true" : "false";
    return () => {
      delete document.documentElement.dataset.sidebarCollapsed;
    };
  }, [collapsed]);

  return (
    <>
      <aside className={`fixed inset-y-0 left-0 z-30 hidden transition-[width] duration-300 md:block ${collapsed ? "w-20" : "w-64"}`}>
        <SidebarBody avatarUrl={avatarUrl} collapsed={collapsed} email={email} locale={locale} onToggleCollapse={() => setCollapsed((value) => !value)} />
      </aside>

      <div className="sticky top-0 z-20 flex items-center justify-between border-b border-black/5 bg-white/80 px-4 py-3 backdrop-blur md:hidden">
        <Link aria-label="Ir para Análise" className="flex items-center gap-2.5" href="/dashboard">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#5A74E0] to-[#1B2A66] text-xs font-bold text-white ring-1 ring-black/5">
            {initials}
          </span>
          <p className="text-base font-semibold text-ink">Oracle</p>
        </Link>
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
            <SidebarBody avatarUrl={avatarUrl} email={email} locale={locale} onNavigate={() => setOpen(false)} />
          </div>
        </div>
      ) : null}
    </>
  );
}
