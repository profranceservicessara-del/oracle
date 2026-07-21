import Link from "next/link";
import { redirect } from "next/navigation";
import { OffresClient } from "@/app/(app)/offres/offres-client";
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
    description: "Gestão de contatos · Orçamentos e assinaturas eletrônicas · Acompanhamento de oportunidades de negócios",
    gradient: "from-[#0f766e] to-[#2dd4bf]"
  },
  {
    title: "Cobrança",
    tagline: "Economize tempo nas suas faturas e pagamentos.",
    description: "Orçamentos e faturas · Pedidos de compra e notas de entrega · Compras · Contabilidade preliminar · Lembretes de pagamento · Pagamento online",
    gradient: "from-[#9f1239] to-[#fb7185]"
  },
  {
    title: "Marketing",
    tagline: "Aproveite uma solução poderosa integrada ao seu CRM.",
    description: "Páginas de destino · Campanhas de e-mail e SMS · Automação de marketing · Pontuação de leads",
    gradient: "from-[#4c1d95] to-[#a78bfa]"
  },
  {
    title: "Tesouraria",
    tagline: "Gerencie seu fluxo de caixa com facilidade.",
    description: "Sincronização bancária · Monitoramento de fluxo de caixa · Previsão · Categorização automática",
    gradient: "from-[#0c4a6e] to-[#38bdf8]"
  }
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
            <a className="transition hover:text-ink" href="#recursos">Recursos</a>
            <a className="transition hover:text-ink" href="#solucoes">Soluções</a>
            <a className="transition hover:text-ink" href="#planos">Planos</a>
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
            <p className="text-[11px] font-semibold uppercase tracking-wide text-white/60">Faturação para auto-entrepreneurs</p>
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
              <a
                className="inline-flex h-12 w-full items-center justify-center rounded-2xl px-6 text-sm font-semibold text-white ring-1 ring-white/25 transition hover:bg-white/10 sm:w-auto"
                href="#planos"
              >
                Ver planos
              </a>
            </div>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-white/60">
              <span className="inline-flex items-center gap-1.5">
                <svg fill="currentColor" height="14" viewBox="0 0 24 24" width="14" className="text-amber-300"><path d="M13 2 4 14h6l-1 8 9-12h-6z" /></svg>
                Teste grátis por 15 dias
              </span>
              <span className="inline-flex items-center gap-1.5">
                <svg fill="none" height="14" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" viewBox="0 0 24 24" width="14" className="text-emerald-300"><path d="M20 6 9 17l-5-5" /></svg>
                Sem compromisso
              </span>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-12" id="recursos">
          <div className="mb-8 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Recursos</p>
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
        <section className="mx-auto max-w-6xl px-4 py-12" id="solucoes">
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
        </section>

        {/* Para quê — pilares do produto (ref: Sellsy). Texto provisório. */}
        <section className="mx-auto max-w-6xl px-4 py-12">
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
        <section className="mx-auto max-w-6xl px-4 py-12">
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
        </section>

        {/* Planos — mesma vitrine de /offres (fonte única), em modo público. */}
        <section className="mx-auto max-w-6xl px-4 py-12" id="planos">
          <div className="mb-2 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Planos</p>
            <h2 className="mt-2 text-2xl font-semibold text-ink">O plano de gestão mais adequado ao seu negócio</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted">Escolha entre cobrança mensal ou anual. Cancele quando quiser.</p>
          </div>
          <OffresClient currentPlan="free" publicMode />
        </section>

        <section className="mx-auto max-w-6xl px-4 py-12">
          <div className="flex flex-col items-center justify-between gap-6 rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-black/5 sm:flex-row sm:text-left">
            <div>
              <h2 className="text-xl font-semibold text-ink">Pronto para emitir sua primeira fatura?</h2>
              <p className="mt-2 text-sm text-muted">Crie sua conta em minutos e mantenha sua contabilidade francesa em dia.</p>
            </div>
            <Link
              className="inline-flex h-12 shrink-0 items-center justify-center rounded-2xl bg-brand px-6 text-sm font-semibold text-white shadow-sm ring-1 ring-[#002D72]/20 transition hover:bg-[#003a94] active:bg-[#001F4D]"
              href="/cadastro"
            >
              Experimente gratuitamente
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-black/5 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
          <p className="font-semibold text-ink">Oracle</p>
          <nav className="flex flex-wrap gap-4">
            <Link className="transition hover:text-ink" href="/cgu-cgv">CGU / CGV</Link>
            <Link className="transition hover:text-ink" href="/mentions-legales">Mentions légales</Link>
            <Link className="transition hover:text-ink" href="/politique-de-confidentialite">Confidentialité</Link>
          </nav>
          <p className="text-xs text-slate-400">© {new Date().getFullYear()} Oracle</p>
        </div>
      </footer>
    </div>
  );
}
