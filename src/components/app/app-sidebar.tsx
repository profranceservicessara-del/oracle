"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { t, type Locale } from "@/lib/i18n/dictionaries";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/toast";
import { SHORTCUTS, SHORTCUTS_EVENT, readVisibleKeys, writeVisibleKeys } from "@/lib/shortcuts";

// Emoji por atalho (badge circular). Fallback ⭐. Local — não altera os dados.
const SHORTCUT_EMOJI: Record<string, string> = { fatura: "🧾", orcamento: "📄", cliente: "👥" };

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
  painel: (
    <svg {...s18}><rect height="9" rx="1" width="7" x="3" y="3" /><rect height="5" rx="1" width="7" x="14" y="3" /><rect height="9" rx="1" width="7" x="14" y="12" /><rect height="5" rx="1" width="7" x="3" y="16" /></svg>
  ),
  gestao: (
    <svg {...s18}><rect height="14" rx="2" width="20" x="2" y="7" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><path d="M2 13h20" /></svg>
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
  pipeline: (<svg {...s16}><path d="M3 3v18h18" /><rect height="6" rx="1" width="4" x="7" y="11" /><rect height="10" rx="1" width="4" x="13" y="7" /></svg>),
  agenda: (<svg {...s16}><rect height="18" rx="2" width="18" x="3" y="4" /><line x1="16" x2="16" y1="2" y2="6" /><line x1="8" x2="8" y1="2" y2="6" /><line x1="3" x2="21" y1="10" y2="10" /></svg>),
  diario: (<svg {...s16}><rect height="18" rx="2" width="18" x="3" y="4" /><line x1="16" x2="16" y1="2" y2="6" /><line x1="8" x2="8" y1="2" y2="6" /><line x1="3" x2="21" y1="10" y2="10" /><circle cx="12" cy="15" r="2.6" /><path d="M12 13.7V15l.9.9" /></svg>),
  clientesLeaf: (<svg {...s16}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /></svg>),
  perfil: (<svg {...s16}><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg>),
  dados: (<svg {...s16}><ellipse cx="12" cy="5" rx="8" ry="3" /><path d="M4 5v6c0 1.66 3.58 3 8 3s8-1.34 8-3V5" /><path d="M4 11v6c0 1.66 3.58 3 8 3s8-1.34 8-3v-6" /></svg>),
  seguranca: (<svg {...s16}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>),
  catalogoLeaf: (<svg {...s16}><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" /><path d="m3.3 7 8.7 5 8.7-5" /><path d="M12 22V12" /></svg>),
  contabilidadeLeaf: (<svg {...s16}><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></svg>),
  declaracoes: (<svg {...s16}><path d="M14 3v4a1 1 0 0 0 1 1h4" /><path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2z" /><line x1="9" x2="14" y1="13" y2="13" /></svg>),
  comprovantes: (<svg {...s16}><rect height="4" rx="1" width="8" x="8" y="3" /><path d="M9 5H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-3" /><path d="m9 14 2 2 4-4" /></svg>),
  faturasRecebidas: (<svg {...s16}><path d="M22 12h-6l-2 3h-4l-2-3H2" /><path d="M5.5 5.5 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.5-6.5A2 2 0 0 0 16.8 4H7.2a2 2 0 0 0-1.7 1.5z" /></svg>),
  moedas: (<svg {...s16}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" /></svg>),
  receitasDespesas: (<svg {...s16}><path d="M17 3l4 4-4 4" /><path d="M21 7H7a4 4 0 0 0-4 4v1" /><path d="M7 21l-4-4 4-4" /><path d="M3 17h14a4 4 0 0 0 4-4v-1" /></svg>),
  banco: (<svg {...s16}><path d="m3 9 9-6 9 6" /><path d="M4 9v11h16V9" /><path d="M8 20v-7M12 20v-7M16 20v-7" /><line x1="2" x2="22" y1="20" y2="20" /></svg>),
  urssaf: (<svg {...s16}><path d="M14 3v4a1 1 0 0 0 1 1h4" /><path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2z" /><path d="M13.5 11.5a2 2 0 1 0 0 3H10" /><path d="M9 13h4" /></svg>),
  declAux: (<svg {...s16}><rect height="18" rx="2" width="18" x="3" y="3" /><path d="M3 9h18M3 15h18M9 3v18M15 3v18" /></svg>),
  contrato: (<svg {...s16}><path d="M14 3v4a1 1 0 0 0 1 1h4" /><path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2z" /><path d="M9 13c1.5-1.5 3 1 4.5-.5" /><line x1="9" x2="15" y1="17" y2="17" /></svg>),
  conselheiro: (<svg {...s16}><path d="M13 2 3 14h7l-1 8 10-12h-7z" /></svg>),
  produtividade: (<svg {...s18}><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91 0z" /><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" /><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" /><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" /></svg>),
  tarefas: (<svg {...s16}><rect height="18" rx="2" width="14" x="5" y="3" /><path d="m9 8 1.5 1.5L13 7" /><path d="m9 14 1.5 1.5L13 13" /><line x1="16" x2="16" y1="8" y2="8" /><line x1="16" x2="16" y1="14" y2="14" /></svg>),
  academia: (<svg {...s18}><path d="M4 19.5V5a2 2 0 0 1 2-2h12v18H6a2 2 0 0 1-2-1.5z" /><path d="M8 7h6M8 11h7" /><path d="M6 17h12" /></svg>)
} as const;

// soon = módulo ainda não pronto para produção: exibido "Em breve", desabilitado
// (não navega). Mantém href para restaurar facilmente depois.
type Leaf = { href: string; label: string; icon: ReactNode; soon?: boolean; premium?: boolean };
type NavItem =
  | { kind: "link"; href: string; label: string; icon: ReactNode }
  | { kind: "group"; key: string; href: string; label: string; icon: ReactNode; children: Leaf[] };

const nav: NavItem[] = [
  { kind: "link", href: "/dashboard", label: "Painel de controle", icon: icons.painel },
  { kind: "link", href: "/analise", label: "Análise", icon: icons.dashboard },
  {
    kind: "group",
    key: "gestao",
    href: "/financeiro",
    label: "Gestão",
    icon: icons.gestao,
    children: [
      { href: "/financeiro", label: "Fluxo de Caixa", icon: icons.receitasDespesas },
      { href: "/crm/agenda", label: "Agenda", icon: icons.agenda },
      { href: "/diario", label: "Diário", icon: icons.diario },
      { href: "/clientes", label: "Clientes", icon: icons.clientesLeaf },
      { href: "/contatos", label: "Contatos", icon: icons.clientesLeaf },
      { href: "/banco", label: "Contas bancárias", icon: icons.banco, premium: true },
      { href: "/conselheiro", label: "Meu Conselheiro", icon: icons.conselheiro }
    ]
  },
  {
    kind: "group",
    key: "faturamento",
    href: "/facturation",
    label: "Cobrança",
    icon: icons.faturamento,
    children: [
      { href: "/documentos/novo?type=devis", label: "Criar um orçamento", icon: icons.orcamentos },
      { href: "/facturation/devis", label: "Orçamentos", icon: icons.orcamentos },
      { href: "/documentos/novo?type=facture", label: "Criar uma fatura", icon: icons.faturas },
      { href: "/facturation", label: "Faturas", icon: icons.faturas },
      { href: "/facturation/rascunhos", label: "Rascunhos", icon: icons.declaracoes },
      { href: "/facturation/notas-credito", label: "Notas de crédito", icon: icons.comprovantes },
      { href: "/facturation/modelos", label: "Modelos", icon: icons.contrato },
      { href: "/facturation/recurrentes", label: "Faturas recorrentes", icon: icons.recorrentes },
      { href: "/facturation/fournisseurs", label: "Faturas recebidas", icon: icons.faturasRecebidas },
      { href: "/facturation/prazos", label: "Prazos", icon: icons.agenda },
      { href: "/facturation/linhas", label: "Linhas dos documentos", icon: icons.declAux },
      { href: "/facturation/diario", label: "Diário de faturamento", icon: icons.dados },
      { href: "/facturation/produits", label: "Produtos e serviços", icon: icons.produtos },
      { href: "/catalogo", label: "Catálogo", icon: icons.catalogoLeaf },
      { href: "/catalogo-pro/produtos", label: "Catálogo pro", icon: icons.catalogoLeaf },
      { href: "/compras", label: "Compras", icon: icons.fornecedores }
    ]
  },
  {
    kind: "group",
    key: "compras",
    href: "/compras",
    label: "Compras",
    icon: icons.fornecedores,
    children: [
      { href: "/compras", label: "Painel de compras", icon: icons.fornecedores },
      { href: "/compras/inbox", label: "Caixa de entrada", icon: icons.faturasRecebidas },
      { href: "/compras/faturas", label: "Faturas de compras", icon: icons.faturas },
      { href: "/compras/ordens", label: "Ordens de compra", icon: icons.orcamentos },
      { href: "/compras/entregas", label: "Entregas", icon: icons.fornecedores },
      { href: "/compras/notas-credito", label: "Notas de crédito", icon: icons.comprovantes }
    ]
  },
  {
    kind: "group",
    key: "produtividade",
    href: "/crm",
    label: "Produtividade",
    icon: icons.produtividade,
    children: [
      { href: "/crm", label: "CRM", icon: icons.crm },
      { href: "/crm/pipeline", label: "Pipeline", icon: icons.pipeline },
      { href: "/tarefas", label: "Tarefas", icon: icons.tarefas },
      { href: "/tempo", label: "Gestão de Tempo", icon: icons.pipeline }
    ]
  },
  {
    kind: "group",
    key: "projetos",
    href: "/projetos",
    label: "Projetos",
    icon: icons.pipeline,
    children: [
      { href: "/projetos", label: "Todos os projetos", icon: icons.pipeline },
      { href: "/projetos/meu-trabalho", label: "Meu trabalho", icon: icons.tarefas }
    ]
  },
  {
    kind: "group",
    key: "contabilidade",
    href: "/livre-de-recettes",
    label: "Contabilidade",
    icon: icons.contabilidade,
    children: [
      { href: "/livre-de-recettes", label: "Livros contábeis", icon: icons.declaracoes },
      { href: "/vencimentos", label: "Vencimentos", icon: icons.declaracoes },
      { href: "/declaracoes/fiscais", label: "Declarações fiscais", icon: icons.declaracoes },
      { href: "/assistente", label: "Assistente de Declarações", icon: icons.conselheiro, premium: true }
    ]
  },
  {
    kind: "group",
    key: "urssaf",
    href: "/urssaf",
    label: "Urssaf",
    icon: icons.urssaf,
    children: [
      { href: "/urssaf", label: "Declaração da Urssaf", icon: icons.urssaf },
      { href: "/urssaf/configuracao", label: "Configuração da Urssaf", icon: icons.config }
    ]
  },
  {
    kind: "group",
    key: "documentos",
    href: "/documentos",
    label: "Documentos",
    icon: icons.documentos,
    children: [
      { href: "/documentos", label: "Orçamentos e Faturas", icon: icons.declaracoes },
      { href: "/comprovantes", label: "Comprovantes", icon: icons.comprovantes },
      { href: "/modelos-contrato", label: "Modelos de contrato", icon: icons.contrato }
    ]
  },
  { kind: "link", href: "/academia", label: "Academia", icon: icons.academia }
];

const activeCard =
  "relative bg-[var(--purple-light)] text-white ring-1 ring-inset ring-[var(--soft-border)] shadow-[0_10px_24px_-12px_rgba(2,10,40,0.8)]";

const idleRow =
  "text-white/80 hover:-translate-y-px hover:bg-[var(--purple-light)] hover:text-white hover:ring-1 hover:ring-inset hover:ring-[var(--soft-border)] hover:shadow-[0_6px_16px_-8px_rgba(0,0,0,0.6)]";

const openCard =
  "relative !w-[calc(100%+16px)] -mr-4 rounded-l-xl !rounded-r-none bg-[var(--purple-light)] text-white shadow-[inset_1px_0_0_var(--soft-border),inset_0_1px_0_var(--soft-border),inset_0_-1px_0_var(--soft-border),0_10px_24px_-12px_rgba(2,10,40,0.8)]";

// All destination hrefs, used to resolve the single best (most-specific) match so
// a parent path like /facturation never stays "active" on /facturation/devis.
const allHrefs = nav.flatMap((item) => (item.kind === "link" ? [item.href] : item.children.map((child) => child.href)));

function hrefPath(href: string): string {
  return href.split("?")[0] || href;
}

function isHrefActive(pathname: string, href: string): boolean {
  const base = hrefPath(href);
  return pathname === base || pathname.startsWith(`${base}/`);
}

function activeHrefFor(pathname: string): string {
  if (pathname === "/declaracoes/auxiliares" || pathname.startsWith("/declaracoes/auxiliares/")) {
    return "/declaracoes/fiscais";
  }

  let best = "";
  for (const href of allHrefs) {
    const base = hrefPath(href);
    if (isHrefActive(pathname, href) && base.length > hrefPath(best).length) {
      best = href;
    }
  }
  return best;
}

function LeafRow({ leaf, active, onNavigate }: { leaf: Leaf; active: boolean; onNavigate?: () => void }) {
  if (leaf.soon) {
    return (
      <div
        aria-disabled="true"
        className="relative flex cursor-default items-center gap-2.5 rounded-xl py-2 pl-4 pr-4 text-[13px] font-[400] text-white/35"
        title="Em breve"
      >
        <span className="shrink-0 text-white/25">{leaf.icon}</span>
        <span className="truncate">{leaf.label}</span>
        <span className="ml-auto shrink-0 rounded-full bg-white/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white/45">
          Em breve
        </span>
      </div>
    );
  }

  return (
    <Link
      aria-current={active ? "page" : undefined}
      className={`group/leaf relative flex items-center gap-2.5 rounded-xl py-2 pl-4 pr-4 text-[13px] font-[400] transition-all duration-200 ${
        active ? activeCard : idleRow
      }`}
      href={leaf.href}
      onClick={onNavigate}
    >
      <span className={`shrink-0 transition-colors ${active ? "text-[var(--icon-blue-active)]" : "text-[var(--icon-blue)] group-hover/leaf:text-white"}`}>
        {leaf.icon}
      </span>
      <span className="truncate">{leaf.label}</span>
      {leaf.premium ? (
        <span className="ml-auto shrink-0 rounded-full bg-[#4F46E5]/20 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-[#C7CCFF]">
          Premium
        </span>
      ) : null}
    </Link>
  );
}

function GroupRow({
  item,
  activeGroupKey,
  pathname,
  isOpen,
  onClose,
  onOpen,
  onSelect
}: {
  item: Extract<NavItem, { kind: "group" }>;
  activeGroupKey: string | null;
  pathname: string;
  isOpen: boolean;
  onClose: () => void;
  onOpen: (item: Extract<NavItem, { kind: "group" }>) => void;
  onSelect: () => void;
}) {
  const hasActiveChild = item.key === activeGroupKey;
  const highlighted = hasActiveChild || isOpen;

  return (
    <div
      className="relative"
      onFocusCapture={() => onOpen(item)}
      onMouseEnter={() => onOpen(item)}
      onMouseLeave={onClose}
    >
      <button
        className={`group/row flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-[16px] font-[400] tracking-tight transition-all duration-200 ${
          isOpen ? openCard : highlighted ? activeCard : idleRow
        } ${isOpen ? "!rounded-r-none" : ""}`}
        onClick={() => onOpen(item)}
        type="button"
      >
        <span
          className={`shrink-0 transition-all duration-200 ${
            highlighted ? "text-[var(--icon-blue-active)]" : "text-[var(--icon-blue)] group-hover/row:text-[var(--icon-blue-active)] group-hover/row:drop-shadow-[0_0_8px_rgba(124,158,232,0.85)]"
          }`}
        >
          {item.icon}
        </span>
        <span className={`flex-1 truncate text-left text-[16px] font-[400] tracking-tight transition-colors ${highlighted ? "text-white" : "text-white/80"}`}>
          {item.label}
        </span>
      </button>
      <div
        className={`pointer-events-none absolute left-full top-0 z-[70] w-72 -translate-x-1 overflow-hidden rounded-l-none rounded-r-xl bg-[var(--purple-light)] px-3 py-3 opacity-0 shadow-[inset_-1px_0_0_var(--soft-border),inset_0_1px_0_var(--soft-border),inset_0_-1px_0_var(--soft-border),0_10px_24px_-12px_rgba(2,10,40,0.8)] transition-all duration-200 ease-out ${
          isOpen ? "pointer-events-auto translate-x-0 opacity-100" : ""
        }`}
      >
        <ul className="space-y-1">
          {item.children.map((child) => {
            const active = isHrefActive(pathname, child.href);
            return (
              <li key={child.href}>
                <Link
                  aria-current={active ? "page" : undefined}
                  className={`flex min-h-10 items-center rounded-full px-4 py-2 transition ${
                    active
                      ? "bg-[var(--flyout-item-mid)] text-white"
                      : "text-white/80 hover:bg-[var(--flyout-item-mid)] hover:text-white"
                  }`}
                  href={child.href}
                  onClick={() => {
                    onClose();
                    onSelect();
                  }}
                >
                  <span className={`truncate text-[15.5px] font-[400] tracking-tight ${active ? "text-white" : "text-white/80"}`}>
                    {child.label}
                  </span>
                  {child.premium ? (
                    <span className="ml-auto shrink-0 rounded-full bg-[#4F46E5]/25 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-[#C7CCFF]">
                      Premium
                    </span>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

function ownerGroupKey(activeHref: string): string | null {
  const matches: Array<Extract<NavItem, { kind: "group" }>> = [];
  for (const item of nav) {
    if (item.kind === "group" && item.children.some((child) => child.href === activeHref)) {
      matches.push(item);
    }
  }
  if (matches.length === 0) return null;

  const routeRoot = hrefPath(activeHref).split("/").filter(Boolean)[0];
  return matches.find((item) => item.key === routeRoot)?.key ?? matches[matches.length - 1].key;
}

function NavList({ onNavigate, collapsed, onExpand, onCollapse }: { onNavigate?: () => void; collapsed?: boolean; onExpand?: () => void; onCollapse?: () => void }) {
  const pathname = usePathname();
  const activeHref = activeHrefFor(pathname);
  const activeGroupKey = ownerGroupKey(activeHref);
  const [flyout, setFlyout] = useState<{
    item: Extract<NavItem, { kind: "group" }>;
    top: number;
  } | null>(null);
  const [hoverSection, setHoverSection] = useState<string | null>(null);
  const flyoutTop = flyout ? Math.max(16, Math.min(flyout.top, 520)) : 16;
  // A janela encosta 4px "por dentro" da borda direita das linhas: como o item
  // aberto tem a mesma cor do painel, a sobreposição é invisível e garante que
  // não sobre nenhum filete de fundo entre o botão e a janela (nem quando a
  // barra de rolagem aparece e encurta as linhas).
  const flyoutLeft = collapsed ? "left-[3.875rem]" : "left-[14.75rem]";

  // Projetos recentes (dados reais do CRM, RLS por company) anexados como
  // sub-itens dinâmicos do grupo Projetos. Sem hardcode de nomes.
  const supabase = useMemo(() => createClient(), []);
  const [projectLeaves, setProjectLeaves] = useState<Leaf[]>([]);
  useEffect(() => {
    let alive = true;
    void supabase
      .from("crm_projects")
      .select("id, name")
      .order("created_at", { ascending: false })
      .limit(6)
      .then(({ data }) => {
        if (!alive || !data) return;
        setProjectLeaves(
          (data as Array<{ id: string; name: string }>).map((p) => ({
            href: `/projetos/${p.id}`,
            label: p.name || "Projeto sem nome",
            icon: icons.pipeline
          }))
        );
      });
    return () => {
      alive = false;
    };
  }, [supabase]);

  const navRender = useMemo<NavItem[]>(
    () =>
      nav.map((item) =>
        item.kind === "group" && item.key === "projetos"
          ? { ...item, children: [...item.children, ...projectLeaves] }
          : item
      ),
    [projectLeaves]
  );

  if (collapsed) {
    return (
      <div className="relative flex min-h-0 flex-1" onMouseLeave={() => setFlyout(null)}>
        <nav className="flex flex-1 flex-col items-center gap-1 overflow-y-auto sidebar-scroll">
          {navRender.map((item) => {
            const active =
              item.kind === "link" ? item.href === activeHref : item.key === activeGroupKey;
            const cls = `flex h-11 w-11 items-center justify-center rounded-xl transition-all duration-200 ${
              active ? activeCard : idleRow
            }`;
            const iconCls = `${active ? "text-[var(--icon-blue-active)]" : "text-[var(--icon-blue)]"}`;
            return item.kind === "link" ? (
              <Link
                aria-current={active ? "page" : undefined}
                className={cls}
                href={item.href}
                key={item.href}
                onClick={() => {
                  setFlyout(null);
                  onExpand?.();
                  onNavigate?.();
                }}
                onMouseEnter={() => setFlyout(null)}
                title={item.label}
              >
                <span className={iconCls}>{item.icon}</span>
              </Link>
            ) : (
              <Link
                aria-current={active ? "page" : undefined}
                className={cls}
                href={item.href}
                key={item.key}
                onClick={() => {
                  setFlyout(null);
                  onExpand?.();
                  onNavigate?.();
                }}
                onFocus={(event) => setFlyout({ item, top: event.currentTarget.getBoundingClientRect().top })}
                onMouseEnter={(event) => setFlyout({ item, top: event.currentTarget.getBoundingClientRect().top })}
                title={item.label}
              >
                <span className={iconCls}>{item.icon}</span>
              </Link>
            );
          })}
        </nav>

        {flyout ? (
          <div
            className={`fixed ${flyoutLeft} z-40 w-72 max-w-[calc(100vw-6rem)] overflow-hidden rounded-l-none rounded-r-xl bg-[var(--purple-light)] py-3 shadow-[inset_-1px_0_0_var(--soft-border),inset_0_1px_0_var(--soft-border),inset_0_-1px_0_var(--soft-border),0_10px_24px_-12px_rgba(2,10,40,0.8)]`}
            onMouseEnter={() => setFlyout(flyout)}
            style={{ top: flyoutTop }}
          >
            <div className="max-h-[calc(100vh-2rem)] overflow-y-auto py-1 sidebar-scroll">
              {flyout.item.children.map((child) => (
                <Link
                  aria-current={child.href === activeHref ? "page" : undefined}
                  className={`flex min-h-9 items-center gap-3 px-4 py-2 text-sm transition ${
                    isHrefActive(pathname, child.href)
                      ? "rounded-full bg-[var(--flyout-item-mid)] text-white"
                      : "rounded-full text-white/80 hover:bg-[var(--flyout-item-mid)] hover:text-white"
                  }`}
                  href={child.href}
                  key={child.href}
                  onClick={() => {
                    setFlyout(null);
                    onNavigate?.();
                  }}
                >
                  <span className="truncate text-[15.5px] font-[400] tracking-tight">{child.label}</span>
                  {child.premium ? (
                    <span className="ml-auto shrink-0 rounded-full bg-[#4F46E5]/25 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-[#C7CCFF]">
                      Premium
                    </span>
                  ) : null}
                </Link>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="relative flex min-h-0 flex-1 overflow-visible">
      <nav className="flex flex-1 flex-col gap-2 overflow-visible sidebar-scroll">
        {navRender.map((item) =>
          item.kind === "link" ? (
            <Link
              aria-current={isHrefActive(pathname, item.href) ? "page" : undefined}
              className={`group/row flex items-center gap-3 rounded-xl px-4 py-2.5 text-[16px] font-[400] tracking-tight transition-all duration-200 ${
                isHrefActive(pathname, item.href) ? activeCard : idleRow
              }`}
              href={item.href}
              key={item.href}
              onClick={() => {
                setHoverSection(null);
                onCollapse?.();
                onNavigate?.();
              }}
              onMouseEnter={() => setHoverSection(null)}
            >
              <span
                className={`shrink-0 transition-all duration-200 ${
                  isHrefActive(pathname, item.href)
                    ? "text-[var(--icon-blue-active)]"
                    : "text-[var(--icon-blue)] group-hover/row:text-[var(--icon-blue-active)] group-hover/row:drop-shadow-[0_0_8px_rgba(124,158,232,0.85)]"
                }`}
              >
                {item.icon}
              </span>
              <span
                className={`flex-1 truncate text-left text-[16px] font-[400] tracking-tight transition-colors ${
                  isHrefActive(pathname, item.href) ? "text-white" : "text-white/80"
                }`}
              >
                {item.label}
              </span>
            </Link>
          ) : (
            <GroupRow
              activeGroupKey={activeGroupKey}
              isOpen={hoverSection === item.key}
              item={item}
              key={item.key}
              onClose={() => setHoverSection(null)}
              onOpen={(group) => setHoverSection(group.key)}
              onSelect={() => {
                onCollapse?.();
                onNavigate?.();
              }}
              pathname={pathname}
            />
          )
        )}
      </nav>
    </div>
  );
}

function BrandBadge({ initials }: { initials: string }) {
  const [imgError, setImgError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // SSR renders the <img> before React attaches onError; if the load already
  // failed by hydration, catch it here so the initials fallback still shows.
  useEffect(() => {
    const el = imgRef.current;
    if (el && el.complete && el.naturalWidth === 0) setImgError(true);
  }, []);

  if (imgError) {
    return (
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#1B2A66] text-sm font-bold text-white shadow-sm ring-1 ring-white/20">
        {initials}
      </span>
    );
  }

  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl shadow-sm ring-1 ring-white/20">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img alt="Oracle" className="h-full w-full object-cover" onError={() => setImgError(true)} ref={imgRef} src="/illustrations/oracle.png" />
    </span>
  );
}

const fourDotIcon = (
  <svg fill="currentColor" height="19" viewBox="0 0 24 24" width="19"><circle cx="8.5" cy="8.5" r="2.1" /><circle cx="15.5" cy="8.5" r="2.1" /><circle cx="8.5" cy="15.5" r="2.1" /><circle cx="15.5" cy="15.5" r="2.1" /></svg>
);
const gripIcon = (
  <svg fill="currentColor" height="18" viewBox="0 0 24 24" width="18"><circle cx="9" cy="6" r="1.4" /><circle cx="9" cy="12" r="1.4" /><circle cx="9" cy="18" r="1.4" /><circle cx="15" cy="6" r="1.4" /><circle cx="15" cy="12" r="1.4" /><circle cx="15" cy="18" r="1.4" /></svg>
);

function shortcutEmoji(key: string) {
  return SHORTCUT_EMOJI[key] ?? "⭐";
}

// Shortcuts chosen in Gerenciar atalhos, shown above the user block. Reads
// localStorage (order-preserving) and live-syncs via the shortcuts CustomEvent.
// The "Gerenciar atalhos" row opens a lateral drawer to reorder / show-hide / save.
// Collapsed: emoji badges only + icon-only manager entry.
function ShortcutsBlock({ collapsed, onNavigate, onCollapse }: { collapsed?: boolean; onNavigate?: () => void; onCollapse?: () => void }) {
  const { showToast } = useToast();
  const [keys, setKeys] = useState<string[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [draft, setDraft] = useState<{ key: string; visible: boolean }[]>([]);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  useEffect(() => {
    const sync = () => setKeys(readVisibleKeys());
    sync();
    window.addEventListener(SHORTCUTS_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(SHORTCUTS_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const byKey = new Map(SHORTCUTS.map((item) => [item.key, item]));
  const items = keys.map((key) => byKey.get(key)).filter((item): item is (typeof SHORTCUTS)[number] => Boolean(item));

  function openDrawer() {
    const visible = readVisibleKeys();
    const hidden = SHORTCUTS.map((item) => item.key).filter((key) => !visible.includes(key));
    setDraft([...visible.map((key) => ({ key, visible: true })), ...hidden.map((key) => ({ key, visible: false }))]);
    setDragIndex(null);
    setDrawerOpen(true);
  }

  function toggleVisible(index: number) {
    setDraft((current) => current.map((row, i) => (i === index ? { ...row, visible: !row.visible } : row)));
  }

  function reorder(from: number, to: number) {
    setDraft((current) => {
      if (from === to || from < 0 || to < 0 || from >= current.length || to >= current.length) return current;
      const next = current.slice();
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }

  function validate() {
    writeVisibleKeys(draft.filter((row) => row.visible).map((row) => row.key));
    setDrawerOpen(false);
    showToast("Atalhos atualizados.", "success");
  }

  const visibleCount = draft.filter((row) => row.visible).length;

  return (
    <div className="shrink-0">
      <div className={`mb-1 border-t border-white/10 ${collapsed ? "mx-auto w-8" : ""}`} />
      <button
        aria-label="Gerenciar atalhos"
        className={
          collapsed
            ? "flex h-10 w-10 items-center justify-center rounded-xl text-white/50 transition hover:bg-[var(--purple-light)] hover:text-white"
            : "flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-[12px] font-[400] text-white/60 transition hover:bg-[var(--purple-light)] hover:text-white"
        }
        onClick={openDrawer}
        title="Gerenciar atalhos"
        type="button"
      >
        {collapsed ? fourDotIcon : (<><span className="shrink-0 text-white/40">{fourDotIcon}</span><span>Gerenciar atalhos</span></>)}
      </button>

      {items.length > 0 ? (
        <div className={collapsed ? "mt-0.5 flex flex-col items-center gap-0.5" : "mt-0.5 space-y-0"}>
          {items.map((item) => (
            <Link
              className={
                collapsed
                  ? "flex h-9 w-9 items-center justify-center rounded-lg transition-all duration-200 hover:-translate-y-px hover:bg-emerald-400/10"
                  : "group/sc flex items-center gap-2 rounded-lg px-2.5 py-0.5 transition-all duration-200 hover:-translate-y-px hover:bg-emerald-400/10"
              }
              href={item.href}
              key={item.key}
              onClick={() => {
                onNavigate?.();
                onCollapse?.();
              }}
              title={item.label}
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-400/15 text-[11px] leading-none ring-1 ring-emerald-400/20 transition group-hover/sc:ring-emerald-400/35">
                {shortcutEmoji(item.key)}
              </span>
              {collapsed ? null : <span className="truncate text-[11px] font-[400] text-emerald-400/70">{item.label}</span>}
            </Link>
          ))}
        </div>
      ) : null}

      {drawerOpen ? (
        <div className="fixed inset-0 z-50 flex justify-end">
          <button aria-label="Fechar" className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={() => setDrawerOpen(false)} type="button" />
          <aside className="relative flex h-full w-full max-w-sm flex-col bg-white shadow-2xl">
            <header className="flex items-center justify-between border-b border-line px-5 py-4">
              <h2 className="text-lg font-bold text-ink">Gerenciar atalhos</h2>
              <button aria-label="Fechar" className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 ring-1 ring-black/5 transition hover:bg-slate-50 hover:text-ink" onClick={() => setDrawerOpen(false)} type="button">
                <svg fill="none" height="16" stroke="currentColor" strokeLinecap="round" strokeWidth="2" viewBox="0 0 24 24" width="16"><path d="M18 6 6 18M6 6l12 12" /></svg>
              </button>
            </header>

            <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5 sidebar-scroll">
              <div className="flex items-start gap-3 rounded-2xl bg-[#EAF2FF] p-4">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-lg leading-none shadow-sm">💡</span>
                <div>
                  <p className="font-semibold text-[#1D4ED8]">Mostrar ou ocultar</p>
                  <p className="mt-1 text-sm text-[#3B5BA9]">Para organizar seus atalhos, acesse o canto inferior esquerdo da tela.</p>
                </div>
              </div>

              <p className="text-sm font-semibold text-ink">Exibido {visibleCount}/{draft.length}:</p>

              <div className="space-y-2">
                {draft.map((row, index) => {
                  const def = byKey.get(row.key);
                  return (
                    <div
                      className={`flex items-center gap-3 rounded-xl bg-white px-3 py-2.5 ring-1 ring-black/5 transition ${dragIndex === index ? "opacity-60" : ""} ${row.visible ? "" : "opacity-60"}`}
                      draggable
                      key={row.key}
                      onDragEnd={() => setDragIndex(null)}
                      onDragOver={(event) => {
                        event.preventDefault();
                        if (dragIndex !== null && dragIndex !== index) {
                          reorder(dragIndex, index);
                          setDragIndex(index);
                        }
                      }}
                      onDragStart={() => setDragIndex(index)}
                    >
                      <span className="cursor-grab text-slate-300" title="Arrastar para reordenar">{gripIcon}</span>
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-[15px] leading-none ring-1 ring-black/5">{shortcutEmoji(row.key)}</span>
                      <span className="flex-1 truncate text-sm font-medium text-ink">{def?.label ?? row.key}</span>
                      <button
                        aria-label={row.visible ? "Ocultar" : "Mostrar"}
                        aria-pressed={row.visible}
                        className={`flex h-8 w-8 items-center justify-center rounded-lg transition ${row.visible ? "text-[#1D4ED8] hover:bg-slate-50" : "text-slate-300 hover:bg-slate-50"}`}
                        onClick={() => toggleVisible(index)}
                        type="button"
                      >
                        {row.visible ? (
                          <svg fill="none" height="18" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" viewBox="0 0 24 24" width="18"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></svg>
                        ) : (
                          <svg fill="none" height="18" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" viewBox="0 0 24 24" width="18"><path d="M9.9 4.2A9.1 9.1 0 0 1 12 4c6.5 0 10 7 10 7a13.2 13.2 0 0 1-2.2 2.9M6.6 6.6A13.3 13.3 0 0 0 2 11s3.5 7 10 7a9 9 0 0 0 4.4-1.1" /><line x1="3" x2="21" y1="3" y2="21" /></svg>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            <footer className="flex items-center justify-between gap-2 border-t border-line px-5 py-4">
              <button
                className="inline-flex h-11 items-center justify-center rounded border border-slate-200 px-5 text-sm font-semibold text-ink transition hover:bg-slate-50"
                onClick={() => setDrawerOpen(false)}
                type="button"
              >
                Cancelar
              </button>
              <button
                className="inline-flex h-11 items-center justify-center rounded bg-emerald-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
                onClick={validate}
                type="button"
              >
                Para validar
              </button>
            </footer>
          </aside>
        </div>
      ) : null}
    </div>
  );
}

const menuIcons = {
  config: (<svg fill="none" height="17" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" viewBox="0 0 24 24" width="17"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6h.09A1.65 1.65 0 0 0 10 3.09V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>),
  perfil: (<svg fill="none" height="17" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" viewBox="0 0 24 24" width="17"><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg>),
  empresa: (<svg fill="none" height="17" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" viewBox="0 0 24 24" width="17"><path d="M3 21h18" /><path d="M5 21V5a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v16" /><path d="M15 9h3a1 1 0 0 1 1 1v11" /><path d="M8 8h2M8 12h2M8 16h2" /></svg>),
  pagamentos: (<svg fill="none" height="17" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" viewBox="0 0 24 24" width="17"><rect height="14" rx="2" width="20" x="2" y="5" /><line x1="2" x2="22" y1="10" y2="10" /></svg>)
} as const;

// Bottom account block — clicking it opens a floating account dropdown (user
// preview + shortcuts + Sair). "Configurações" navigates and collapses the main
// sidebar (settings tabs live in the page). The avatar stays visible collapsed.
function UserMenu({ email, locale, avatarUrl, name, collapsed, onCollapse, onNavigate }: { email: string; locale: Locale; avatarUrl?: string | null; name?: string; collapsed?: boolean; onCollapse?: () => void; onNavigate?: () => void }) {
  const initials = (email.trim()[0] ?? "U").toUpperCase();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onDown(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const displayName = name?.trim() || (email.split("@")[0] || t(locale, "menu.account"));

  function go(href: string, extra?: () => void) {
    setOpen(false);
    onNavigate?.();
    extra?.();
    router.push(href);
  }

  async function signOut() {
    setLoggingOut(true);
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  const rows = [
    { label: "Configurações", icon: menuIcons.config, onClick: () => go("/configuracoes/perfil", onCollapse) },
    { label: "Perfil", icon: menuIcons.perfil, onClick: () => go("/configuracoes/perfil") },
    { label: "Minha empresa", icon: menuIcons.empresa, onClick: () => go("/configuracoes/empresa") },
    { label: "Pagamentos / Assinatura", icon: menuIcons.pagamentos, onClick: () => go("/configuracoes/pagamentos") }
  ];

  return (
    <div className="relative" ref={ref}>
      {open ? (
        <div className="absolute bottom-0 left-full z-30 ml-2 w-64 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-black/10" role="menu">
          <div className="flex items-center gap-3 p-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#EAF0FF] text-sm font-bold text-[#1D4ED8] ring-1 ring-black/5">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img alt="Foto do perfil" className="h-full w-full object-cover" src={avatarUrl} />
              ) : (
                initials
              )}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink">{displayName}</p>
              <p className="truncate text-xs text-muted">{email || "—"}</p>
              <p className="truncate text-[11px] text-slate-400">Versão de avaliação para empresas</p>
            </div>
          </div>
          <div className="px-3 pb-2">
            <button
              className="w-full rounded border border-slate-200 px-3 py-2 text-sm font-semibold text-ink transition hover:bg-slate-50"
              onClick={() => go("/configuracoes/pagamentos")}
              type="button"
            >
              Assine agora
            </button>
          </div>
          <div className="border-t border-black/5 p-1.5">
            {rows.map((row) => (
              <button
                className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-50"
                key={row.label}
                onClick={row.onClick}
                role="menuitem"
                type="button"
              >
                <span className="shrink-0 text-slate-400">{row.icon}</span>
                {row.label}
              </button>
            ))}
          </div>
          <div className="border-t border-black/5 p-1.5">
            <button
              className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-60"
              disabled={loggingOut}
              onClick={() => void signOut()}
              role="menuitem"
              type="button"
            >
              <svg className="shrink-0" fill="none" height="17" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" viewBox="0 0 24 24" width="17">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="m16 17 5-5-5-5" /><line x1="21" x2="9" y1="12" y2="12" />
              </svg>
              {loggingOut ? "…" : t(locale, "menu.logout")}
            </button>
          </div>
        </div>
      ) : null}

      <button
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Conta"
        className={`flex w-full items-center gap-3 rounded-xl px-1 py-1.5 text-left transition hover:bg-[var(--purple-light)] hover:text-white ${collapsed ? "justify-center" : ""}`}
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/15 text-sm font-semibold text-white ring-1 ring-white/10">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img alt="Foto do perfil" className="h-full w-full object-cover" src={avatarUrl} />
          ) : (
            initials
          )}
        </span>
        {collapsed ? null : (
          <>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-[400] text-white">{displayName}</span>
              <span className="block truncate text-xs text-white/50">{email || t(locale, "menu.profile")}</span>
            </span>
            <svg aria-hidden="true" className={`shrink-0 text-white/40 transition-transform ${open ? "rotate-180" : ""}`} fill="none" height="16" stroke="currentColor" strokeLinecap="round" strokeWidth="2" viewBox="0 0 24 24" width="16">
              <path d="m6 15 6-6 6 6" />
            </svg>
          </>
        )}
      </button>
    </div>
  );
}

function SidebarBody({ email, locale, avatarUrl, name, onNavigate, collapsed, onSetCollapsed }: { email: string; locale: Locale; avatarUrl?: string | null; name?: string; onNavigate?: () => void; collapsed?: boolean; onSetCollapsed?: (value: boolean) => void }) {
  const initials = ((email.split("@")[0] ?? "").replace(/[^a-zA-Z]/g, "").slice(0, 2) || "PF").toUpperCase();

  return (
    <div
      className={`sidebar-shell flex h-full flex-col gap-5 border-r border-white/[0.08] bg-[var(--sidebar-bg)] [font-family:var(--font-lato)] ${
        collapsed ? "px-2 py-4" : "p-4"
      }`}
    >
      <div className={`flex gap-2 ${collapsed ? "flex-col items-center" : "items-center"}`}>
        <Link
          aria-label={collapsed ? "Expandir menu" : "Ir para Dashboard"}
          className={`flex items-center gap-3 rounded-xl px-1 pt-1 transition hover:opacity-90 ${
            collapsed ? "justify-center" : "min-w-0 flex-1"
          }`}
          href="/dashboard"
          onClick={() => {
            onSetCollapsed?.(false);
            onNavigate?.();
          }}
          title={collapsed ? "Expandir menu" : "Oracle"}
        >
          <BrandBadge initials={initials} />
          {collapsed ? null : (
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">Oracle</p>
              <p className="truncate text-[10px] font-medium uppercase tracking-[0.24em] text-white/40">
                Sistema financeiro
              </p>
            </div>
          )}
        </Link>
        <button
          aria-label={collapsed ? "Abrir menu" : "Minimizar menu"}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white/50 transition hover:bg-[var(--purple-light)] hover:text-white"
          onClick={() => onSetCollapsed?.(!collapsed)}
          title={collapsed ? "Abrir menu" : "Minimizar menu"}
          type="button"
        >
          <svg
            className={collapsed ? "rotate-180" : ""}
            fill="none"
            height="18"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
            viewBox="0 0 24 24"
            width="18"
          >
            <path d="m11 17-5-5 5-5" />
            <path d="m18 17-5-5 5-5" />
          </svg>
        </button>
      </div>
      <div className="border-t border-white/10" />
      <NavList collapsed={collapsed} onCollapse={() => onSetCollapsed?.(true)} onExpand={() => onSetCollapsed?.(false)} onNavigate={onNavigate} />
      <ShortcutsBlock collapsed={collapsed} onCollapse={() => onSetCollapsed?.(true)} onNavigate={onNavigate} />
      <div className={`border-t border-white/10 ${collapsed ? "mx-auto w-8" : ""}`} />
      <UserMenu avatarUrl={avatarUrl} collapsed={collapsed} email={email} locale={locale} name={name} onCollapse={() => onSetCollapsed?.(true)} onNavigate={onNavigate} />
    </div>
  );
}

export function AppSidebar({ email, locale, avatarUrl, name }: { email: string; locale: Locale; avatarUrl?: string | null; name?: string }) {
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
      <aside
        className={`fixed inset-y-0 left-0 z-[80] hidden overflow-visible transition-[width] duration-300 md:block ${
          collapsed ? "w-20" : "w-64"
        }`}
      >
        <SidebarBody
          avatarUrl={avatarUrl}
          collapsed={collapsed}
          email={email}
          locale={locale}
          name={name}
          onSetCollapsed={setCollapsed}
        />
      </aside>

      <div className="sticky top-0 z-20 flex items-center justify-between border-b border-black/5 bg-white/80 px-4 py-3 backdrop-blur md:hidden">
        <Link aria-label="Ir para Análise" className="flex items-center gap-2.5" href="/dashboard">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1B2A66] text-xs font-bold text-white ring-1 ring-black/5">
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
            <SidebarBody avatarUrl={avatarUrl} email={email} locale={locale} name={name} onNavigate={() => setOpen(false)} />
          </div>
        </div>
      ) : null}
    </>
  );
}
