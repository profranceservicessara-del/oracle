import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const features = [
  {
    title: "Faturas e devis conformes",
    description: "Numeração sequencial, imutabilidade e formato legal francês — sem planilhas."
  },
  {
    title: "Livre de recettes automático",
    description: "Cada encaissement entra no livro de receitas e alimenta seus seuils em tempo real."
  },
  {
    title: "Cotisations estimadas",
    description: "Acompanhe URSSAF, seuils micro e franchise TVA com estimativas claras por categoria."
  },
  {
    title: "Lembretes e RGPD",
    description: "Avisos de échéance e exportação/eliminação de dados conforme a lei, prontos para usar."
  }
];

// Segmentos "Nossas soluções". A foto de cada card é um placeholder por
// enquanto (image: null) — troque por <Image> quando tiver as fotos da
// ProFrance. "Independente" é o card definitivo; TPE e PMEs são texto
// provisório a substituir.
const segments = [
  {
    badge: "Empreendedor individual",
    title: "Independente",
    description:
      "Monitore e expanda seu negócio de forma simples, sem usar várias ferramentas, e mantendo-se em conformidade com a legislação.",
    gradient: "from-[#0A2352] to-[#2B1F5B]"
  },
  {
    badge: "1 a 5 funcionários",
    title: "TPE",
    description:
      "Gerencie o núcleo do seu negócio a partir de uma única ferramenta, de forma simples e sem complexidades desnecessárias.",
    gradient: "from-[#123B7A] to-[#0A2352]"
  },
  {
    badge: "Mais de 6 funcionários",
    title: "PMEs e empresas de médio porte",
    description:
      "Estruture seu ciclo de vendas, coordene suas equipes e gerencie seu negócio com precisão.",
    gradient: "from-[#1D2A55] to-[#3A2A66]"
  }
];

// Grade "Administre seu negócio sem complicar sua vida". Texto provisório
// (a substituir depois). Cada ícone tem um tom próprio.
const pillars = [
  {
    title: "Uma visão unificada do seu negócio",
    description: "Todos os seus dados — comerciais, financeiros e de clientes — estão centralizados em um único ambiente.",
    tint: "bg-[#EAF0FF] text-[#2B4F9E]",
    icon: (
      <svg fill="none" height="20" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24" width="20"><rect height="7" rx="1.5" width="7" x="3" y="3" /><rect height="7" rx="1.5" width="7" x="14" y="3" /><rect height="7" rx="1.5" width="7" x="3" y="14" /><circle cx="17.5" cy="17.5" r="3.5" /></svg>
    )
  },
  {
    title: "Um ciclo de vendas estruturado",
    description: "Desde a primeira oportunidade até a emissão da fatura e o recebimento do pagamento, cada etapa é monitorada e controlada.",
    tint: "bg-[#FFF3D6] text-[#9A6B00]",
    icon: (
      <svg fill="none" height="20" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24" width="20"><path d="M3 4h18l-7 8v6l-4 2v-8z" /></svg>
    )
  },
  {
    title: "Apoio em cada etapa",
    description: "Desde o início, nossas equipes sediadas na França oferecem suporte: assistência, treinamento e workshops presenciais.",
    tint: "bg-[#E1EFFF] text-[#1F6FD6]",
    icon: (
      <svg fill="none" height="20" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24" width="20"><path d="M4 18v-6a8 8 0 0 1 16 0v6" /><path d="M4 18a2 2 0 0 0 2 2h1v-6H6a2 2 0 0 0-2 2zM20 18a2 2 0 0 1-2 2h-1v-6h1a2 2 0 0 1 2 2z" /></svg>
    )
  },
  {
    title: "Uma solução 100% francesa",
    description: "Concebido, operado e hospedado na França, em estrita conformidade com o RGPD e com a gestão segura dos seus dados.",
    tint: "bg-[#EDE7FB] text-[#6A4FB0]",
    icon: (
      <svg fill="none" height="20" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24" width="20"><path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z" /></svg>
    )
  },
  {
    title: "Conformidade integrada, sem custos adicionais.",
    description: "Faturação eletrônica, alterações legais: tudo é considerado nativamente, sem custo adicional.",
    tint: "bg-[#FCE4E4] text-[#C0392B]",
    icon: (
      <svg fill="none" height="20" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24" width="20"><path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z" /><path d="m9 12 2 2 4-4" /></svg>
    )
  },
  {
    title: "Aumento da produtividade",
    description: "Graças à inteligência artificial e à automação integrada, suas tarefas repetitivas desaparecem e você ganha eficiência.",
    tint: "bg-[#FFF3C9] text-[#B8860B]",
    icon: (
      <svg fill="none" height="20" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24" width="20"><path d="M12 3v4M12 17v4M5 12H1M23 12h-4M6.3 6.3 3.5 3.5M20.5 20.5l-2.8-2.8M17.7 6.3l2.8-2.8M3.5 20.5l2.8-2.8" /><circle cx="12" cy="12" r="3.5" /></svg>
    )
  }
];

// Uma única ferramenta — 4 áreas do produto. Imagem = placeholder colorido
// (trocar por screenshots da ProFrance). Paleta fria e on-brand: no lugar do
// amarelo do print, a Tesouraria usa azul.
const toolCards = [
  {
    title: "Oferta",
    tagline: "Aumente sua receita vendendo mais e melhor.",
    description: "Gestão de clientes · Orçamentos · CRM e pipeline · Acompanhamento de oportunidades",
    gradient: "from-[#0f766e] to-[#2dd4bf]"
  },
  {
    title: "Cobrança",
    tagline: "Economize tempo nas suas faturas e pagamentos.",
    description: "Orçamentos e faturas conformes · Compras · Comprovantes · Condições e lembretes de pagamento",
    gradient: "from-[#9f1239] to-[#fb7185]"
  },
  {
    title: "Produtividade",
    tagline: "Organize projetos, tarefas e tempo num só lugar.",
    description: "Projetos e Kanban · Tarefas · Gestão de tempo · Agenda",
    gradient: "from-[#4c1d95] to-[#a78bfa]"
  },
  {
    title: "Tesouraria",
    tagline: "Gerencie seu fluxo de caixa com facilidade.",
    description: "Contas bancárias · Fluxo de caixa · Recebíveis · Exportação em CSV",
    gradient: "from-[#0c4a6e] to-[#38bdf8]"
  }
];

// Seção confiança/segurança. Texto adaptado ao Oracle e HONESTO: sem claims
// de certificação (ISO, hospedagem na França, "16 anos") que exigiriam
// verificação. Só recursos reais (RGPD, isolamento por conta, formato legal).
const trustCards = [
  {
    tint: "bg-[#EAF0FF] text-[#2B4F9E]",
    title: "Feito para as regras francesas",
    description: "Faturas no formato legal francês, livro de receitas e preparação das declarações Urssaf, pensado para o auto-entrepreneur na França.",
    icon: (
      <svg fill="none" height="20" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24" width="20"><path d="M14 3v4a1 1 0 0 0 1 1h4" /><path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2z" /><path d="M9 13h6M9 17h4" /></svg>
    )
  },
  {
    tint: "bg-[#E3F2EA] text-[#16794C]",
    title: "Seus dados protegidos",
    description: "Acesso isolado por conta, conformidade com o RGPD e exportação ou eliminação dos seus dados quando você quiser.",
    icon: (
      <svg fill="none" height="20" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24" width="20"><path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z" /><path d="m9 12 2 2 4-4" /></svg>
    )
  },
  {
    tint: "bg-[#EDE7FB] text-[#6A4FB0]",
    title: "Tudo num só lugar",
    description: "Faturação, CRM, contabilidade e fluxo de caixa conectados, sem planilhas e sem pular entre ferramentas.",
    icon: (
      <svg fill="none" height="20" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24" width="20"><rect height="7" rx="1.5" width="7" x="3" y="3" /><rect height="7" rx="1.5" width="7" x="14" y="3" /><rect height="7" rx="1.5" width="7" x="3" y="14" /><circle cx="17.5" cy="17.5" r="3.5" /></svg>
    )
  }
];

const trustChips = [
  "Conformidade com o RGPD",
  "Exportação dos seus dados",
  "Eliminação de conta (RGPD)",
  "Acesso isolado por conta",
  "Faturas em formato legal francês",
  "Livro de receitas automático",
  "Suporte humano em português",
  "Sistema todo em português"
];

// Resumo de preços (espelha os planos reais de /planos). Preço mensal, sem IVA.
const planSummary = [
  { name: "Básico", price: "Grátis", popular: false },
  { name: "Start", price: "11 €", popular: false },
  { name: "Pro", price: "19 €", popular: true },
  { name: "Business", price: "39 €", popular: false }
];

// Footer grande (ref: Sellsy). Links "#" são placeholders a preencher; os
// demais apontam para páginas públicas reais.
const footerCols = [
  {
    title: "Bom saber",
    links: [
      { label: "O que é um auto-entrepreneur?", href: "#" },
      { label: "Guia de faturamento eletrônico", href: "#" },
      { label: "URSSAF na prática", href: "#" }
    ]
  },
  {
    title: "Nossas soluções",
    links: [
      { label: "Oferta", href: "#" },
      { label: "Cobrança", href: "#" },
      { label: "Produtividade", href: "#" },
      { label: "Tesouraria", href: "#" }
    ]
  },
  {
    title: "Características",
    links: [
      { label: "Faturação em formato legal francês", href: "#" },
      { label: "Livro de receitas automático", href: "#" },
      { label: "CRM e pipeline", href: "#" },
      { label: "Fluxo de caixa", href: "#" }
    ]
  },
  {
    title: "Sobre",
    links: [
      { label: "Contate-nos", href: "/gestao-completa" },
      { label: "Planos", href: "/planos" },
      { label: "Criar conta", href: "/cadastro" },
      { label: "Entrar", href: "/login" }
    ]
  },
  {
    title: "Linguagem",
    links: [
      { label: "Português", href: "#" },
      { label: "Francês", href: "#" },
      { label: "Espanhol", href: "#" }
    ]
  }
];

const footerLegal = [
  { label: "Termos e condições gerais", href: "/cgu-cgv" },
  { label: "Aviso legal", href: "/mentions-legales" },
  { label: "Privacidade de dados", href: "/politique-de-confidentialite" },
  { label: "Confidencialidade", href: "/politique-de-confidentialite" },
  { label: "Segurança de dados", href: "#" }
];

function ArrowIcon() {
  return (
    <svg fill="none" height="18" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="18"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
  );
}

export default async function HomePage() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-[#F7F8FC] text-ink">
      <header className="sticky top-0 z-30 border-b border-black/5 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <p className="text-lg font-semibold text-ink">Oracle</p>
          <nav className="hidden items-center gap-6 text-sm text-muted sm:flex">
            <a className="transition hover:text-ink" href="#solucoes">Soluções</a>
            <a className="transition hover:text-ink" href="#recursos">Produtos</a>
            <Link className="transition hover:text-ink" href="/planos">Planos</Link>
          </nav>
          <div className="flex items-center gap-2">
            <Link
              className="inline-flex h-10 items-center justify-center rounded-2xl px-4 text-sm font-semibold text-ink transition hover:bg-slate-100"
              href="/login"
            >
              Entrar
            </Link>
            <Link
              className="inline-flex h-10 items-center justify-center rounded-2xl bg-brand px-4 text-sm font-semibold text-white shadow-sm ring-1 ring-[#002D72]/20 transition hover:bg-[#003a94] active:bg-[#001F4D]"
              href="/cadastro"
            >
              Criar conta
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-4 pb-10 pt-16 sm:pt-24">
          <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-[#001F4D] via-[#002D72] to-[#2B1F5B] px-6 py-16 text-center shadow-lg ring-1 ring-white/10 sm:px-12">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-white/60">Software de gestão empresarial para microempresas e PMEs</p>
            <h1 className="mx-auto mt-4 max-w-3xl text-3xl font-semibold leading-tight text-white sm:text-5xl">
              A solução completa para gerenciar seu negócio.
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-sm leading-7 text-white/70 sm:text-base">
              Faturação eletrônica, CRM e pagamentos, tudo em uma única ferramenta para gerenciar seu negócio de forma simples e em conformidade com a lei. Concentre-se no que realmente importa: seus clientes.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                className="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-white px-6 text-sm font-semibold text-[#002D72] shadow-sm transition hover:bg-white/90 sm:w-auto"
                href="/cadastro"
              >
                Experimente gratuitamente
              </Link>
              <Link
                className="inline-flex h-12 w-full items-center justify-center rounded-2xl px-6 text-sm font-semibold text-white ring-1 ring-white/25 transition hover:bg-white/10 sm:w-auto"
                href="/planos"
              >
                Ver planos
              </Link>
            </div>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-white/60">
              <span className="inline-flex items-center gap-1.5">
                <svg fill="currentColor" height="14" viewBox="0 0 24 24" width="14" className="text-amber-300"><path d="M13 2 4 14h6l-1 8 9-12h-6z" /></svg>
                Teste grátis por 14 dias
              </span>
              <span className="inline-flex items-center gap-1.5">
                <svg fill="none" height="14" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" viewBox="0 0 24 24" width="14" className="text-emerald-300"><path d="M20 6 9 17l-5-5" /></svg>
                Sem compromisso
              </span>
            </div>
          </div>

          {/* Atalhos que rolam até as seções. */}
          <div className="mt-6 flex items-center justify-center gap-8">
            <a className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink transition hover:text-brand" href="#precos">
              Preços <span className="text-brand">+</span>
            </a>
            <a className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink transition hover:text-brand" href="#caracteristicas">
              Características <span className="text-brand">+</span>
            </a>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-12" id="recursos">
          <div className="mb-8 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Produtos</p>
            <h2 className="mt-2 text-2xl font-semibold text-ink">Tudo que o micro-entrepreneur precisa</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => (
              <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5" key={feature.title}>
                <h3 className="text-base font-semibold text-ink">{feature.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Nossas soluções — segmentos por porte do negócio (ref: Sellsy). */}
        <section className="bg-[#ECEAFB]" id="solucoes">
          <div className="mx-auto max-w-6xl px-4 py-12">
          <div className="mb-8 text-center">
            <span className="inline-flex rounded-full bg-white px-3 py-1 text-xs font-medium text-muted ring-1 ring-black/5">Nossas soluções</span>
            <h2 className="mx-auto mt-4 max-w-2xl text-2xl font-semibold leading-tight text-ink sm:text-3xl">
              A ProFrance se adapta e cresce <span className="text-brand">com a sua organização.</span>
            </h2>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {segments.map((segment) => (
              <div className="group flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5" key={segment.title}>
                {/* Placeholder de foto — trocar por <Image> da ProFrance. */}
                <div className={`relative flex aspect-[4/3] items-start justify-start bg-gradient-to-br ${segment.gradient} p-4`}>
                  <span className="rounded-full bg-white/95 px-3 py-1 text-xs font-medium text-ink shadow-sm">{segment.badge}</span>
                </div>
                <div className="flex flex-1 flex-col p-6">
                  <h3 className="text-lg font-semibold text-ink">{segment.title}</h3>
                  <p className="mt-2 flex-1 text-sm leading-6 text-muted">{segment.description}</p>
                  <Link
                    aria-label={`Saber mais sobre ${segment.title}`}
                    className="mt-5 inline-flex h-10 w-10 items-center justify-center rounded-full text-brand ring-1 ring-inset ring-[#002D72]/15 transition group-hover:bg-brand group-hover:text-white"
                    href="/cadastro"
                  >
                    <ArrowIcon />
                  </Link>
                </div>
              </div>
            ))}
          </div>
          </div>
        </section>

        {/* Para quê — pilares do produto (ref: Sellsy). Texto provisório. */}
        <section className="mx-auto max-w-6xl px-4 py-12" id="caracteristicas">
          <div className="mb-8 text-center">
            <span className="inline-flex rounded-full bg-white px-3 py-1 text-xs font-medium text-muted ring-1 ring-black/5">Para quê?</span>
            <h2 className="mx-auto mt-4 max-w-2xl text-2xl font-semibold leading-tight text-ink sm:text-3xl">
              Administre seu negócio <span className="text-brand">sem complicar sua vida.</span>
            </h2>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {pillars.map((pillar) => (
              <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5" key={pillar.title}>
                <span className={`inline-flex h-11 w-11 items-center justify-center rounded-xl ${pillar.tint}`}>{pillar.icon}</span>
                <h3 className="mt-4 text-base font-semibold text-ink">{pillar.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted">{pillar.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Uma única ferramenta — áreas do produto (ref: Sellsy). */}
        <section className="bg-[#ECEAFB]">
          <div className="mx-auto max-w-6xl px-4 py-12">
          <div className="mb-10 text-center">
            <h2 className="mx-auto max-w-3xl text-2xl font-semibold leading-tight text-ink sm:text-3xl">
              Uma única ferramenta para <span className="text-brand">estruturar</span>, <span className="text-brand">gerir</span> e <span className="text-brand">expandir</span> o seu negócio.
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-muted">
              Seus dados não precisam mais transitar entre diversas ferramentas. Tudo se comunica em tempo real, permitindo uma gestão eficiente e colaborativa.
            </p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {toolCards.map((card) => (
              <div className="group flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5" key={card.title}>
                {/* Imagem placeholder até os screenshots da ProFrance entrarem. */}
                <div aria-hidden className={`h-40 bg-gradient-to-br ${card.gradient}`} />
                <div className="flex flex-1 flex-col p-6">
                  <h3 className="text-lg font-bold text-ink">{card.title}</h3>
                  <p className="mt-1 text-sm font-semibold text-ink">{card.tagline}</p>
                  <p className="mt-3 flex-1 text-sm leading-6 text-muted">{card.description}</p>
                  <Link
                    aria-label={`Saber mais sobre ${card.title}`}
                    className="mt-5 inline-flex h-10 w-10 items-center justify-center rounded-full bg-brand text-white shadow-sm transition hover:bg-[#003a94] active:bg-[#001F4D]"
                    href="/cadastro"
                  >
                    <ArrowIcon />
                  </Link>
                </div>
              </div>
            ))}
          </div>
          </div>
        </section>

        {/* Confiança e segurança (ref: Sellsy). Texto adaptado e honesto. */}
        <section className="mx-auto max-w-6xl px-4 py-12">
          <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-brand">
            <span aria-hidden>🇫🇷</span> ProFrance, feito para a França
          </p>
          <h2 className="mt-3 max-w-2xl text-2xl font-semibold leading-tight text-ink sm:text-4xl">
            Pare de escolher entre simplicidade, conformidade e controle.
          </h2>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {trustCards.map((card) => (
              <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5" key={card.title}>
                <span className={`inline-flex h-11 w-11 items-center justify-center rounded-xl ${card.tint}`}>{card.icon}</span>
                <h3 className="mt-4 text-lg font-bold leading-snug text-ink">{card.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted">{card.description}</p>
                <Link className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand hover:text-[#003a94]" href="/cadastro">
                  Saber mais
                  <svg fill="none" height="14" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="14"><path d="m9 6 6 6-6 6" /></svg>
                </Link>
              </div>
            ))}
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {trustChips.map((chip) => (
              <div className="flex items-center gap-2.5 rounded-xl bg-white px-3.5 py-3 text-sm text-slate-700 ring-1 ring-black/5" key={chip}>
                <svg className="shrink-0 text-emerald-600" fill="none" height="16" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" viewBox="0 0 24 24" width="16"><path d="M20 6 9 17l-5-5" /></svg>
                {chip}
              </div>
            ))}
          </div>
        </section>

        {/* Resumo de preços — apoia o crescimento (ref: Sellsy). */}
        <section className="bg-[#ECEAFB]" id="precos">
          <div className="mx-auto max-w-5xl px-4 py-12">
            <h2 className="text-center text-2xl font-semibold leading-tight text-ink sm:text-3xl">
              A ProFrance apoia <span className="bg-gradient-to-r from-[#4361FF] to-[#B14BF4] bg-[length:100%_4px] bg-bottom bg-no-repeat pb-1">todo o seu crescimento</span>
            </h2>

            <div className="mt-8 overflow-x-auto">
              <div className="min-w-[640px] overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
                {/* Cabeçalho: nomes dos planos */}
                <div className="grid grid-cols-5 items-center border-b border-line px-2 py-5">
                  <div />
                  {planSummary.map((p) => (
                    <div className="px-2 text-center" key={p.name}>
                      <span className="inline-flex items-center gap-2 text-lg font-bold text-ink">
                        {p.name}
                        {p.popular ? (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">O mais popular</span>
                        ) : null}
                      </span>
                    </div>
                  ))}
                </div>
                {/* Linha de oferta: preços */}
                <div className="grid grid-cols-5 items-center bg-slate-50/60 px-2 py-6">
                  <div className="px-2 text-sm font-semibold text-ink">Oferta</div>
                  {planSummary.map((p) => (
                    <div className="px-2 text-center" key={p.name}>
                      <span className="text-base font-bold tabular-nums text-ink">{p.price}</span>
                      {p.price !== "Grátis" ? <span className="block text-xs text-muted">por mês, sem IVA</span> : null}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-8 text-center">
              <Link className="inline-flex items-center gap-1 text-sm font-semibold text-brand hover:text-[#003a94]" href="/planos">
                Veja os preços detalhados
                <svg fill="none" height="14" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="14"><path d="m9 6 6 6-6 6" /></svg>
              </Link>
            </div>
          </div>
        </section>

        {/* CTA final (ref: Sellsy). Formas decorativas sem amarelo. */}
        <section className="mx-auto max-w-6xl px-4 py-12">
          <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-[#1B1B5B] via-[#26236B] to-[#2B1F5B] px-6 py-14 text-center shadow-lg ring-1 ring-white/10 sm:px-12">
            <div className="flex items-center justify-center gap-4">
              <span aria-hidden className="h-9 w-9 rounded-full bg-[#F2A08A]" />
              <span aria-hidden className="h-0 w-0 border-x-[16px] border-b-[28px] border-x-transparent border-b-[#3B5BFF]" />
              <svg aria-hidden fill="#A78BFA" height="34" viewBox="0 0 24 24" width="34"><path d="M12 1l2 6 6-2-4 5 4 5-6-2-2 6-2-6-6 2 4-5-4-5 6 2z" /></svg>
            </div>
            <h2 className="mx-auto mt-8 max-w-2xl text-2xl font-semibold leading-tight text-white sm:text-4xl">
              Pronto para converter seus potenciais clientes em clientes reais com mais eficiência?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-sm text-white/70">
              Teste grátis por 14 dias · Sem compromisso · Sem necessidade de cartão de crédito
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                className="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-white px-6 text-sm font-semibold text-[#1B1B5B] shadow-sm transition hover:bg-white/90 sm:w-auto"
                href="/gestao-completa"
              >
                Solicite uma demonstração
              </Link>
              <Link
                className="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-[#6D5FBF] px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-[#5d51a8] sm:w-auto"
                href="/cadastro"
              >
                Experimente gratuitamente
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-[#0A1B3D] text-white">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <p className="text-xl font-semibold tracking-tight">Oracle</p>

          {/* Redes sociais (URLs placeholder até você passar os perfis). */}
          <div className="mt-5 flex items-center gap-3">
            <a aria-label="Instagram" className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-white transition hover:bg-white/20" href="#">
              <svg fill="none" height="18" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24" width="18"><rect height="18" rx="5" width="18" x="3" y="3" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" fill="currentColor" r="1" stroke="none" /></svg>
            </a>
            <a aria-label="Facebook" className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-white transition hover:bg-white/20" href="#">
              <svg fill="currentColor" height="18" viewBox="0 0 24 24" width="18"><path d="M14 9h3V6h-3c-2.2 0-4 1.8-4 4v2H7v3h3v6h3v-6h3l1-3h-4v-2c0-.6.4-1 1-1z" /></svg>
            </a>
            <a aria-label="LinkedIn" className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-white transition hover:bg-white/20" href="#">
              <svg fill="currentColor" height="18" viewBox="0 0 24 24" width="18"><path d="M4.98 3.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM3 9h4v12H3zM9 9h3.8v1.7h.05c.53-1 1.8-2.05 3.7-2.05 4 0 4.7 2.6 4.7 6V21h-4v-5.3c0-1.3 0-2.9-1.8-2.9s-2 1.4-2 2.8V21H9z" /></svg>
            </a>
          </div>

          <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-5">
            {footerCols.map((col) => (
              <div key={col.title}>
                <p className="text-sm font-semibold text-[#93ACFF]">{col.title}</p>
                <ul className="mt-4 space-y-2.5">
                  {col.links.map((link) => (
                    <li key={link.label}>
                      <Link className="text-sm text-white/70 transition hover:text-white" href={link.href}>
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-12 border-t border-white/10 pt-6">
            <nav className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs text-white/60">
              {footerLegal.map((link) => (
                <Link className="transition hover:text-white" href={link.href} key={link.label}>
                  {link.label}
                </Link>
              ))}
            </nav>
            <p className="mt-5 text-center text-xs text-white/45">
              ProFrance © {new Date().getFullYear()}. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
