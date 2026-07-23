"use client";

import Image from "next/image";
import { useMemo, useState } from "react";

type TopicKey = "generalidades" | "receita" | "contribuicoes" | "protecao" | "contabilidade" | "auxilios" | "comparacoes";

type Article = {
  id: string;
  topic: TopicKey;
  title: string;
  description: string;
  image: string;
  readTime: string;
  sections: Array<{
    title: string;
    paragraphs?: string[];
    bullets?: string[];
    note?: { tone: "info" | "warning"; title: string; body: string };
  }>;
};

const topics: Array<{ key: TopicKey; label: string }> = [
  { key: "generalidades", label: "Gerais" },
  { key: "receita", label: "Receita" },
  { key: "contribuicoes", label: "Contribuições e impostos" },
  { key: "protecao", label: "Proteção social" },
  { key: "contabilidade", label: "Contabilidade" },
  { key: "auxilios", label: "Os auxílios" },
  { key: "comparacoes", label: "Comparações" }
];

const articles: Article[] = [
  {
    id: "vantagens-desvantagens",
    topic: "generalidades",
    title: "As 7 vantagens e as 5 desvantagens do trabalho por conta própria",
    description: "Entenda os pontos fortes, os limites e os cuidados antes de escolher o regime de microempresa.",
    image: "/illustrations/orcamento.png",
    readTime: "7 min",
    sections: [
      {
        title: "As 7 vantagens de uma microempresa",
        paragraphs: [
          "O regime de trabalhador autônomo simplifica a criação e a gestão diária de um pequeno negócio. Ele costuma ser uma boa porta de entrada para testar uma atividade, organizar clientes e começar a faturar com menos formalidades.",
          "Mesmo assim, a escolha precisa ser feita com atenção: limites de receita, proteção social, contribuição sobre faturamento e regras de TVA podem mudar bastante conforme a atividade."
        ]
      },
      {
        title: "1 - Gestão diária simplificada",
        paragraphs: [
          "Na prática, a rotina administrativa é reduzida. O empreendedor registra receitas, emite faturas, acompanha pagamentos e conserva comprovantes essenciais.",
          "Para manter tudo claro, vale separar os documentos por período, conferir receitas recebidas e acompanhar os limites aplicáveis ao seu tipo de atividade."
        ],
        bullets: [
          "Manter um livro de receitas atualizado.",
          "Emitir faturas para os clientes.",
          "Separar a conta bancária quando a regra ou o volume da atividade exigir.",
          "Declarar o faturamento no prazo correto.",
          "Guardar registros de compras quando a atividade exigir esse acompanhamento."
        ]
      },
      {
        title: "2 - Abertura mais rápida",
        paragraphs: [
          "A criação de uma microempresa é feita online e o número SIRET chega depois da análise do cadastro. Não há capital social mínimo, o que reduz a barreira de entrada para começar.",
          "Esse modelo é útil para quem quer validar uma ideia antes de estruturar uma empresa mais complexa."
        ]
      },
      {
        title: "3 - Flexibilidade de perfil",
        paragraphs: [
          "O regime pode atender pessoas em diferentes momentos: estudantes, assalariados, desempregados, aposentados ou quem deseja uma renda complementar.",
          "A combinação com outra atividade deve ser analisada com cuidado, principalmente quando existem regras de contrato, benefício ou seguro-desemprego."
        ]
      },
      {
        title: "4 - Regras de TVA mais simples abaixo dos limites",
        paragraphs: [
          "A franquia de TVA pode simplificar a vida do empreendedor enquanto os limites aplicáveis forem respeitados. Quando o limite é ultrapassado, surgem novas obrigações de declaração e cobrança.",
          "Os limites de TVA e de microempresa são atualizados com frequência. Por isso, trate qualquer número como informação a conferir no portal oficial antes de tomar uma decisão."
        ]
      },
      {
        title: "5 - Redução inicial de contribuições em alguns casos",
        paragraphs: [
          "Alguns novos empreendedores podem se beneficiar da ACRE, que reduz parte das contribuições sociais por um período limitado.",
          "A elegibilidade depende da situação da pessoa e do momento da solicitação. O ideal é verificar a regra antes ou logo depois da abertura."
        ]
      },
      {
        title: "6 - Possibilidade de pagamento simplificado do imposto",
        paragraphs: [
          "Em certas condições, o empreendedor pode optar pelo versement libératoire, pagando imposto de renda junto com as declarações periódicas de faturamento.",
          "Essa opção não é sempre vantajosa. Ela depende da renda do foyer fiscal e precisa ser avaliada antes da escolha."
        ]
      },
      {
        title: "7 - Possibilidade de combinar atividades",
        paragraphs: [
          "Uma mesma microempresa pode reunir atividades complementares, desde que sejam compatíveis e corretamente declaradas.",
          "Essa flexibilidade ajuda quem oferece serviços diferentes, mas exige atenção à atividade principal, às categorias e aos limites de faturamento."
        ]
      },
      {
        title: "As 5 desvantagens das microempresas",
        paragraphs: [
          "O regime é simples, mas não resolve tudo. Ele pode ser menos adequado quando há custos altos, contratação frequente, investimentos grandes ou necessidade de recuperar TVA."
        ],
        bullets: [
          "Alguns custos fixos continuam existindo, mesmo com faturamento baixo.",
          "Os limites de receita podem ser atingidos rapidamente em certas atividades.",
          "As contribuições são calculadas sobre o faturamento, não sobre o lucro.",
          "A TVA de compras não é recuperada enquanto a atividade estiver na franquia de TVA.",
          "A proteção social pode ser mais limitada do que a de um empregado assalariado."
        ]
      },
      {
        title: "Perguntas frequentes",
        paragraphs: [
          "Nem toda atividade é permitida no regime de microempresa. Algumas profissões regulamentadas ou atividades específicas exigem outro enquadramento.",
          "Contratar alguém também pode tornar a gestão mais pesada, porque o regime foi pensado para estruturas pequenas e simples.",
          "Morar fora da França não impede automaticamente a criação, mas existem condições de registro e situação administrativa que precisam ser confirmadas."
        ],
        note: {
          tone: "info",
          title: "Bom saber",
          body: "Este artigo é educativo. Regras fiscais, sociais e limites mudam com o tempo. Antes de declarar ou decidir, confira o portal oficial ou fale com um contador."
        }
      }
    ]
  },
  {
    id: "atividades-possiveis",
    topic: "generalidades",
    title: "Lista de atividades para trabalhadores autônomos",
    description: "Veja exemplos de atividades adequadas, atividades mais sensíveis e pontos que exigem atenção.",
    image: "/illustrations/predio.png",
    readTime: "5 min",
    sections: [
      {
        title: "Atividades adequadas para microempresas",
        paragraphs: [
          "O regime combina bem com atividades que exigem pouco investimento inicial, custos operacionais limitados e gestão administrativa simples."
        ],
        bullets: [
          "Serviços prestados em domicílio ou diretamente nas instalações do cliente.",
          "Atividades digitais, consultoria, pequenos serviços, venda simples ou prestação recorrente.",
          "Projetos em que o volume de negócios deve ficar abaixo dos limites do regime."
        ]
      },
      {
        title: "Atividades menos adequadas",
        paragraphs: [
          "O regime pode ser menos interessante para projetos com compra frequente de mercadorias caras, aluguel de ponto comercial, maquinário, subcontratação pesada ou equipe fixa."
        ]
      }
    ]
  },
  {
    id: "abreviacoes",
    topic: "generalidades",
    title: "Abreviações que você precisa conhecer",
    description: "ACRE, CA, CFE, SIRET, TVA e outros termos importantes traduzidos para o dia a dia.",
    image: "/illustrations/faturas-empty.png",
    readTime: "4 min",
    sections: [
      {
        title: "Glossário essencial",
        bullets: [
          "CA: chiffre d'affaires, ou seja, faturamento.",
          "SIRET: número de identificação do estabelecimento.",
          "TVA: imposto sobre valor agregado.",
          "ACRE: ajuda que pode reduzir contribuições no início da atividade.",
          "CFE: cotisation foncière des entreprises, uma contribuição local."
        ]
      }
    ]
  },
  {
    id: "limites-receita",
    topic: "receita",
    title: "Limites de receita e mudança de regime",
    description: "Entenda por que os limites precisam ser acompanhados e quando o regime pode deixar de se aplicar.",
    image: "/illustrations/orcamento.png",
    readTime: "6 min",
    sections: [
      {
        title: "Receita recebida é o centro do acompanhamento",
        paragraphs: [
          "No regime de microempresa, o faturamento efetivamente recebido é um indicador essencial. Ele influencia limites, obrigações e a permanência no regime.",
          "Os limites variam por tipo de atividade e podem mudar por ano. Por isso, acompanhe o acumulado e confira as regras oficiais antes de fechar uma decisão."
        ],
        note: {
          tone: "warning",
          title: "Atenção",
          body: "Na primeira etapa de atividade, alguns limites podem ser calculados proporcionalmente ao tempo de existência da empresa."
        }
      }
    ]
  },
  {
    id: "contribuicoes-base",
    topic: "contribuicoes",
    title: "Contribuições pagas com base no faturamento",
    description: "O cálculo considera o valor recebido, não necessariamente o lucro final depois das despesas.",
    image: "/illustrations/faturas-empty.png",
    readTime: "5 min",
    sections: [
      {
        title: "Faturamento não é lucro",
        paragraphs: [
          "Uma das maiores diferenças do regime é que as contribuições sociais são calculadas sobre o faturamento declarado. Se você tem despesas altas, isso pode reduzir a margem real.",
          "Antes de escolher o regime, estime custos, compras, deslocamentos, seguros e investimentos."
        ],
        note: {
          tone: "info",
          title: "Bom saber",
          body: "Em alguns casos, valores reembolsados pelo cliente podem exigir tratamento específico. Guarde comprovantes e confira com um profissional."
        }
      }
    ]
  },
  {
    id: "tva",
    topic: "contribuicoes",
    title: "TVA: quando simplifica e quando pesa",
    description: "A franquia de TVA facilita a cobrança, mas também impede recuperar TVA de compras enquanto aplicável.",
    image: "/illustrations/predio.png",
    readTime: "4 min",
    sections: [
      {
        title: "Franquia de TVA",
        paragraphs: [
          "A franquia de TVA pode tornar seus preços mais simples para clientes, mas significa que a TVA das compras profissionais não é recuperada.",
          "Se a atividade exige muitos equipamentos ou compras comerciais, esse ponto precisa entrar no cálculo."
        ]
      }
    ]
  },
  {
    id: "protecao-social",
    topic: "protecao",
    title: "Proteção social do trabalhador autônomo",
    description: "Veja os principais cuidados sobre previdência, doença, aposentadoria e seguro-desemprego.",
    image: "/illustrations/genio.png",
    readTime: "5 min",
    sections: [
      {
        title: "Cobertura mais limitada",
        paragraphs: [
          "O trabalhador autônomo não tem exatamente a mesma proteção de um empregado assalariado. Direitos ligados a doença, aposentadoria e proteção em caso de queda de atividade dependem das contribuições e das regras aplicáveis.",
          "O seguro-desemprego também não funciona da mesma forma para todos os perfis."
        ],
        note: {
          tone: "warning",
          title: "Informações importantes",
          body: "A proteção social deve ser analisada antes de depender exclusivamente da atividade autônoma."
        }
      }
    ]
  },
  {
    id: "livros-contabeis",
    topic: "contabilidade",
    title: "Livro de receitas, comprovantes e registros",
    description: "Organize receitas, compras, faturas e anexos para manter a contabilidade simples.",
    image: "/illustrations/orcamento.png",
    readTime: "5 min",
    sections: [
      {
        title: "O básico da organização",
        paragraphs: [
          "Mesmo em um regime simplificado, o empreendedor precisa manter registros claros. Livro de receitas, faturas emitidas e comprovantes ajudam em conferências e declarações.",
          "Separar os documentos por mês facilita muito quando chega a hora de preparar declarações."
        ],
        bullets: [
          "Registrar receitas recebidas.",
          "Guardar faturas emitidas.",
          "Anexar comprovantes de despesas quando houver.",
          "Conferir números antes de declarar."
        ]
      }
    ]
  },
  {
    id: "apoios",
    topic: "auxilios",
    title: "Apoios para criação e desenvolvimento",
    description: "Conheça caminhos de apoio, formação e orientação para começar com mais segurança.",
    image: "/illustrations/genio.png",
    readTime: "4 min",
    sections: [
      {
        title: "Você não precisa começar sozinho",
        paragraphs: [
          "Existem programas, associações, incubadoras e formações que ajudam na criação e no desenvolvimento de uma microempresa.",
          "A contribuição para formação profissional pode abrir acesso a direitos de formação, dependendo da situação e das contribuições."
        ]
      }
    ]
  },
  {
    id: "comparar-regimes",
    topic: "comparacoes",
    title: "Microempresa ou outro regime?",
    description: "Compare simplicidade, custos, limites, TVA e estrutura antes de escolher.",
    image: "/illustrations/predio.png",
    readTime: "6 min",
    sections: [
      {
        title: "Quando comparar",
        paragraphs: [
          "A microempresa é uma boa entrada para muitos projetos, mas não é sempre a melhor solução. Se existem sócios, investimentos altos, contratação ou necessidade de recuperar TVA, outro formato pode fazer mais sentido.",
          "A comparação deve considerar margem, riscos, crescimento esperado e obrigações administrativas."
        ]
      }
    ]
  }
];

function ArrowIcon() {
  return (
    <svg fill="none" height="16" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24" width="16">
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg fill="none" height="16" stroke="currentColor" strokeLinecap="round" strokeWidth="2" viewBox="0 0 24 24" width="16">
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export function AcademiaClient() {
  const [activeTopic, setActiveTopic] = useState<TopicKey>("generalidades");
  const [selectedArticleId, setSelectedArticleId] = useState("vantagens-desvantagens");
  const [query, setQuery] = useState("");

  const visibleArticles = useMemo(() => {
    const normalizedQuery = normalize(query);
    return articles.filter((article) => {
      const matchesTopic = article.topic === activeTopic;
      if (!normalizedQuery) return matchesTopic;
      const searchable = normalize(`${article.title} ${article.description} ${article.sections.map((section) => section.title).join(" ")}`);
      return matchesTopic && searchable.includes(normalizedQuery);
    });
  }, [activeTopic, query]);

  const selectedArticle =
    visibleArticles.find((article) => article.id === selectedArticleId) ?? visibleArticles[0] ?? articles.find((article) => article.topic === activeTopic) ?? articles[0];

  function chooseTopic(topic: TopicKey) {
    const firstArticle = articles.find((article) => article.topic === topic);
    setActiveTopic(topic);
    setSelectedArticleId(firstArticle?.id ?? selectedArticleId);
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <section className="overflow-hidden rounded-2xl bg-[#E7F8F1] shadow-sm ring-1 ring-black/5">
        <div className="p-6 md:p-8">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">Academia</p>
            <h1 className="mt-2 text-2xl font-semibold leading-tight text-[#4A63C8] sm:text-3xl">
              Academia para Empreendedores Autônomos
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-700">
              Conteúdos organizados por assunto para consultar dentro do Oracle, sem sair da Academia.
            </p>
            <div className="relative mt-6 max-w-2xl">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <SearchIcon />
              </span>
              <input
                aria-label="Pesquisar na Academia"
                className="h-12 w-full rounded-2xl border border-emerald-100 bg-white px-4 pl-10 text-sm text-ink shadow-sm outline-none placeholder:text-slate-400 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Pesquisar artigos"
                type="search"
                value={query}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
        <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Primeiros passos</p>
            <h2 className="mt-2 text-xl font-semibold leading-snug text-[#4A63C8]">
              Informações que você precisa saber sobre o status de trabalhador autônomo.
            </h2>
            <p className="mt-2 text-sm leading-5 text-[#4A63C8]/80">
              Antes de começar, entenda vantagens, limites, receitas, contribuições, proteção social e contabilidade.
            </p>

            <div className="mt-5 overflow-hidden rounded-2xl ring-1 ring-inset ring-line">
              {topics.map((topic) => {
                const active = topic.key === activeTopic;
                const count = articles.filter((article) => article.topic === topic.key).length;
                return (
                  <button
                    className={`flex w-full items-center justify-between gap-3 border-b border-line px-4 py-3 text-left text-sm transition last:border-b-0 ${
                      active ? "bg-[#2E2B5C] font-semibold text-white" : "bg-white text-slate-700 hover:bg-slate-50 hover:text-ink"
                    }`}
                    key={topic.key}
                    onClick={() => chooseTopic(topic.key)}
                    type="button"
                  >
                    <span>{topic.label}</span>
                    <span className={`flex items-center gap-2 text-xs ${active ? "text-white/75" : "text-slate-400"}`}>
                      {count}
                      <ArrowIcon />
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="min-w-0">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Artigos</p>
                <h2 className="mt-1 text-xl font-semibold text-[#4A63C8]">{topics.find((topic) => topic.key === activeTopic)?.label}</h2>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                {visibleArticles.length} artigo(s)
              </span>
            </div>

            {visibleArticles.length === 0 ? (
              <div className="rounded-2xl bg-white px-5 py-10 text-center text-sm text-muted shadow-sm ring-1 ring-black/5">
                Nenhum artigo encontrado neste assunto.
              </div>
            ) : (
              <div className="grid gap-3">
                {visibleArticles.map((article) => {
                  const active = article.id === selectedArticle.id;
                  return (
                    <button
                      className={`grid gap-4 rounded-2xl p-4 text-left shadow-sm transition sm:grid-cols-[140px_1fr] ${
                        active ? "bg-[#EAF0FF] ring-1 ring-inset ring-[#BFD2FF]" : "bg-white ring-1 ring-black/5 hover:bg-slate-50"
                      }`}
                      key={article.id}
                      onClick={() => setSelectedArticleId(article.id)}
                      type="button"
                    >
                      <Image alt="" className="h-24 w-full rounded object-cover" height={96} src={article.image} width={160} />
                      <span className="min-w-0">
                        <span className="block text-base font-semibold leading-snug text-ink">{article.title}</span>
                        <span className="mt-1 block text-sm leading-5 text-muted">{article.description}</span>
                        <span className="mt-2 block text-xs font-medium text-slate-400">{article.readTime}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>

      <article className="mt-6 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
        <div className="h-56 bg-slate-50">
          <Image alt="" className="h-full w-full object-cover" height={260} src={selectedArticle.image} width={1024} />
        </div>
        <div className="px-5 py-5 sm:px-8 sm:py-7">
          <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-slate-400">
            <span>Academia</span>
            <span>{selectedArticle.readTime}</span>
          </div>
          <h2 className="mt-3 text-2xl font-semibold leading-tight text-[#4A63C8]">{selectedArticle.title}</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[#4A63C8]/80">{selectedArticle.description}</p>

          <div className="mt-6 border-t border-line pt-6">
            {selectedArticle.sections.map((section) => (
              <section className="mb-8 last:mb-0" key={section.title}>
                <h3 className="text-lg font-semibold text-[#4A63C8]">{section.title}</h3>
                {section.paragraphs?.map((paragraph) => (
                  <p className="mt-4 text-sm leading-7 text-slate-700" key={paragraph}>
                    {paragraph}
                  </p>
                ))}
                {section.bullets ? (
                  <ul className="mt-4 space-y-2 pl-5 text-sm leading-7 text-slate-700">
                    {section.bullets.map((bullet) => (
                      <li className="list-disc" key={bullet}>{bullet}</li>
                    ))}
                  </ul>
                ) : null}
                {section.note ? (
                  <div className={`mt-5 rounded-2xl p-4 text-sm leading-6 ring-1 ring-inset ${
                    section.note.tone === "warning" ? "bg-rose-50 text-rose-900 ring-rose-200" : "bg-sky-50 text-sky-900 ring-sky-200"
                  }`}>
                    <p className="font-semibold">{section.note.title}</p>
                    <p className="mt-2">{section.note.body}</p>
                  </div>
                ) : null}
              </section>
            ))}
          </div>

          <div className="mt-8 rounded-2xl bg-slate-50 p-4 text-xs leading-5 text-slate-500 ring-1 ring-inset ring-line">
            Conteúdo educativo. Para números oficiais e regras atualizadas, confira os portais da administração francesa antes de declarar ou tomar decisões fiscais.
          </div>
        </div>
      </article>
    </main>
  );
}
