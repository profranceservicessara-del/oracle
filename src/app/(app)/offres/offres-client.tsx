"use client";

import { useState } from "react";
import Link from "next/link";
import type { PlanTier } from "@/lib/plan";
import { PlanCta } from "./plan-cta";

type Billing = "mensal" | "anual";

type PlanKey = "basico" | "start" | "pro" | "business";

type Plan = {
  key: PlanKey;
  name: string;
  tagline: string;
  subtitle: string;
  badge?: { label: string; className: string };
  monthly: number | null;
  annual: number | null;
  highlighted?: boolean;
  checkoutPlan?: "pro" | "premium";
  inherits?: string;
  software: string[];
  acompanhamento: string[];
};

const plans: Plan[] = [
  {
    key: "basico",
    name: "Básico",
    tagline: "Básico",
    subtitle: "Fature para seus clientes de forma simples.",
    monthly: 0,
    annual: 0,
    software: ["Crie faturas e orçamentos", "Lembrete: Urssaf, impostos e CFE"],
    acompanhamento: []
  },
  {
    key: "start",
    name: "Start",
    tagline: "Para começar",
    subtitle: "Dê destaque ao seu negócio.",
    badge: { label: "Start", className: "bg-brand text-white" },
    monthly: 11,
    annual: 9,
    checkoutPlan: "pro",
    software: [
      "Crie faturas",
      "Orçamentos",
      "Lembrete: Urssaf, impostos e CFE",
      "Personalização de documentos"
    ],
    acompanhamento: ["Serviço de atendimento ao cliente limitado"]
  },
  {
    key: "pro",
    name: "Pro",
    tagline: "Mestre",
    subtitle: "Trabalhe com tranquilidade graças a um ambiente completo e integrado.",
    badge: { label: "Pro", className: "bg-amber-400 text-ink" },
    monthly: 19,
    annual: 15,
    highlighted: true,
    checkoutPlan: "premium",
    inherits: "Tudo da oferta Start",
    software: [
      "Livro de receitas",
      "Personalização avançada de documentos",
      "Declaração de transferência para o Urssaf",
      "Modelos de contrato",
      "Academia",
      "Fluxo de caixa",
      "Agenda",
      "Clientes",
      "Projetos"
    ],
    acompanhamento: ["Serviço de atendimento ao cliente limitado"]
  },
  {
    key: "business",
    name: "Business",
    tagline: "Indo além",
    subtitle: "Use a ProFrance sem limites para garantir o crescimento do seu negócio.",
    badge: { label: "Business", className: "bg-fuchsia-500 text-white" },
    monthly: 39,
    annual: 33,
    inherits: "Tudo da oferta Pro",
    software: [
      "Gestão de estoque",
      "Envio de documentos por e-mail",
      "Garantir o pagamento em dia: acompanhar as faturas em atraso",
      "Assinar documentos online",
      "Cobrança automática recorrente",
      "Vários temas de documentos personalizados",
      "Ferramentas de produtividade ilimitadas (controle de tempo, vendas, clientes, etc.)",
      "Modo de arquivamento de documentos"
    ],
    acompanhamento: ["Atendimento prioritário ao cliente"]
  }
];

type CompletePlan = {
  key: string;
  name: string;
  subtitle: string;
  monthly: string;
  annual: string;
  /** Mesmo desconto anual aplicado aos planos de software. */
  discount: number;
  points: string[];
};

const completePlans: CompletePlan[] = [
  {
    key: "ae",
    name: "Gestão completa para AE",
    subtitle: "Auto-entrepreneur acompanhado de ponta a ponta pela nossa equipe.",
    monthly: "99 € – 199 €",
    annual: "79 € – 159 €",
    discount: 20,
    points: [
      "Tudo da oferta Business",
      "Declarações Urssaf preparadas e revisadas",
      "Conselheiro humano dedicado",
      "Acompanhamento contábil mensal"
    ]
  },
  {
    key: "btp",
    name: "Gestão completa para BTP",
    subtitle: "Solução completa para o setor da construção (BTP).",
    monthly: "199 € – 299 €",
    annual: "159 € – 239 €",
    discount: 20,
    points: [
      "Tudo da Gestão completa para AE",
      "Gestão de canteiros e situações de obra",
      "Faturamento e retenções específicas do BTP",
      "Conselheiro especializado em BTP"
    ]
  }
];

const faqs = [
  {
    q: "Posso parar a qualquer momento?",
    a: "Você pode cancelar facilmente a qualquer momento. Com um clique na sua conta ProFrance, você cancela sua assinatura."
  },
  {
    q: "Quais são os métodos de pagamento aceitos?",
    a: "A ProFrance aceita a maioria dos cartões de crédito. Você também pode pagar com Google Pay e Apple Pay."
  },
  {
    q: "Meus dados estão seguros?",
    a: "Tomamos o máximo cuidado para fazer backup dos seus dados, para que você não perca nada. O acesso é protegido e somente você tem acesso a eles."
  },
  {
    q: "O que acontece se eu tiver um problema?",
    a: "Caso encontre alguma dificuldade, pode entrar em contato conosco via chat ou por telefone, dependendo do seu plano."
  },
  {
    q: "Ganho algo ao recomendar a ProFrance?",
    a: "Com certeza. Você pode participar do nosso programa de embaixadores e receber recompensas ao recomendar a ProFrance para outras pessoas."
  },
  {
    q: "Não encontrou uma resposta?",
    a: "Você pode entrar em contato conosco via chat e falar com um de nossos consultores."
  }
];

const euro = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });

function savings(monthly: number, annual: number) {
  return Math.round((1 - annual / monthly) * 100);
}

function CheckIcon({ tone = "brand" }: { tone?: "brand" | "emerald" }) {
  return (
    <svg
      aria-hidden="true"
      className={`mt-0.5 shrink-0 ${tone === "emerald" ? "text-emerald-600" : "text-brand"}`}
      fill="none"
      height="18"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2.5"
      viewBox="0 0 24 24"
      width="18"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function Badge({ label, className }: { label: string; className: string }) {
  return (
    <span
      className={`inline-flex -skew-x-12 items-center rounded-md px-2.5 py-1 text-xs font-black uppercase italic tracking-wide shadow-sm ${className}`}
    >
      <span className="skew-x-12">{label}</span>
    </span>
  );
}

// publicMode: mesma vitrine na landing (visitante deslogado). Sem checkout —
// todos os CTAs levam ao cadastro. Fonte única de verdade dos planos.
export function OffresClient({ currentPlan, publicMode = false }: { currentPlan: PlanTier; publicMode?: boolean }) {
  const [billing, setBilling] = useState<Billing>("anual");

  return (
    <div>
      {/* Toggle Mensal / Anual */}
      <div className="mt-8 flex justify-center">
        <div className="inline-flex items-center rounded-full bg-white p-1 shadow-sm ring-1 ring-black/5">
          {(["mensal", "anual"] as const).map((option) => (
            <button
              className={`rounded-full px-6 py-2 text-sm font-semibold capitalize transition ${
                billing === option ? "bg-brand text-white shadow-sm" : "text-slate-500 hover:text-ink"
              }`}
              key={option}
              onClick={() => setBilling(option)}
              type="button"
            >
              {option}
              {option === "anual" ? <span className="ml-1.5 text-xs font-bold text-emerald-500">-35%</span> : null}
            </button>
          ))}
        </div>
      </div>

      {/* Cards */}
      <div className="mt-8 grid items-start gap-5 lg:grid-cols-4">
        {plans.map((plan) => {
          const isCurrent =
            (plan.key === "basico" && currentPlan === "free") ||
            (plan.checkoutPlan === "pro" && currentPlan === "pro") ||
            (plan.checkoutPlan === "premium" && currentPlan === "premium");
          const price = billing === "anual" ? plan.annual : plan.monthly;
          const isFree = plan.monthly === 0;
          const showDiscount = billing === "anual" && plan.monthly && plan.annual && plan.monthly > plan.annual;

          return (
            <div
              className={`relative flex h-full flex-col rounded-3xl bg-white p-6 ${
                plan.highlighted ? "shadow-lg ring-2 ring-brand" : "shadow-sm ring-1 ring-black/5"
              }`}
              key={plan.key}
            >
              {plan.highlighted ? (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-ink px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
                  O mais popular
                </span>
              ) : null}

              <div className="flex min-h-[2rem] items-center gap-2">
                {plan.badge ? <Badge className={plan.badge.className} label={plan.badge.label} /> : null}
              </div>
              <h3 className="mt-3 text-xl font-bold text-ink">{plan.tagline}</h3>
              <p className="mt-1.5 min-h-[6rem] text-sm leading-6 text-muted">{plan.subtitle}</p>

              {/* Preço */}
              <div className="mt-4 flex min-h-[5rem] flex-col justify-end">
                {isFree ? (
                  <p className="text-3xl font-bold text-ink">Grátis</p>
                ) : (
                  <>
                    {showDiscount ? (
                      <p className="flex items-center gap-2 text-sm">
                        <span className="rounded bg-rose-500 px-1.5 py-0.5 text-[11px] font-bold text-white">
                          -{savings(plan.monthly as number, plan.annual as number)}%
                        </span>
                        <span className="text-slate-400 line-through">{euro.format(plan.monthly as number)} €</span>
                      </p>
                    ) : null}
                    <p className="mt-1 flex items-baseline gap-1">
                      <span className="text-3xl font-bold tabular-nums text-ink">{euro.format(price as number)} €</span>
                      <span className="text-sm text-muted">/mês, sem IVA</span>
                    </p>
                    {billing === "anual" ? <p className="text-xs text-muted">cobrado anualmente</p> : null}
                  </>
                )}
              </div>

              {/* CTA */}
              <div className="mt-5">
                {publicMode ? (
                  <Link
                    className={`inline-flex h-11 w-full items-center justify-center rounded-full px-4 text-sm font-semibold shadow-sm transition ${
                      isFree
                        ? "bg-white text-ink ring-1 ring-black/10 hover:bg-slate-50"
                        : "bg-brand text-white ring-1 ring-[#002D72]/20 hover:bg-[#003a94] active:bg-[#001F4D]"
                    }`}
                    href="/cadastro"
                  >
                    {isFree ? "Começar grátis" : "Assine agora"}
                  </Link>
                ) : isCurrent ? (
                  <button
                    className="inline-flex h-11 w-full cursor-not-allowed items-center justify-center rounded-full bg-slate-100 px-4 text-sm font-semibold text-slate-400"
                    disabled
                    type="button"
                  >
                    Plano atual
                  </button>
                ) : plan.checkoutPlan ? (
                  <PlanCta
                    className={`inline-flex h-11 w-full items-center justify-center rounded-full px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                      plan.highlighted
                        ? "bg-brand text-white shadow-sm ring-1 ring-[#002D72]/20 hover:bg-[#003a94] active:bg-[#001F4D]"
                        : "bg-brand text-white shadow-sm ring-1 ring-[#002D72]/20 hover:bg-[#003a94] active:bg-[#001F4D]"
                    }`}
                    label="Assine agora"
                    plan={plan.checkoutPlan}
                  />
                ) : plan.key === "business" ? (
                  <Link
                    className="inline-flex h-11 w-full items-center justify-center rounded-full bg-brand px-4 text-sm font-semibold text-white shadow-sm ring-1 ring-[#002D72]/20 transition hover:bg-[#003a94] active:bg-[#001F4D]"
                    href="/conselheiro"
                  >
                    Assine agora
                  </Link>
                ) : (
                  <button
                    className="inline-flex h-11 w-full cursor-not-allowed items-center justify-center rounded-full bg-slate-100 px-4 text-sm font-semibold text-slate-400"
                    disabled
                    type="button"
                  >
                    Incluído
                  </button>
                )}
                {!isFree ? (
                  <p className="mt-2 text-center text-xs text-muted">Experimente grátis por 14 dias.</p>
                ) : (
                  <p className="mt-2 text-center text-xs text-muted">Experimente grátis</p>
                )}
              </div>

              {/* Software */}
              <div className="mt-6 border-t border-line pt-5">
                <p className="text-[11px] font-bold uppercase tracking-wide text-brand">Software</p>
                {plan.inherits ? (
                  <p className="mt-3 flex gap-2 text-sm font-semibold text-ink">
                    <CheckIcon />
                    {plan.inherits} +
                  </p>
                ) : null}
                <ul className="mt-3 space-y-2.5">
                  {plan.software.map((feature) => (
                    <li className="flex gap-2 text-sm text-slate-700" key={feature}>
                      <CheckIcon />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Acompanhamento — omitido quando o plano não oferece nenhum. */}
              {plan.acompanhamento.length === 0 ? null : (
              <div className="mt-5 rounded-2xl bg-emerald-50/60 p-4">
                <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-700">Acompanhamento</p>
                <ul className="mt-3 space-y-2.5">
                  {plan.acompanhamento.map((feature) => (
                    <li className="flex gap-2 text-sm text-slate-700" key={feature}>
                      <CheckIcon tone="emerald" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Gestão completa (braços Business) */}
      <div className="mt-14">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-ink">Gestão completa, feita pela nossa equipe</h2>
          <p className="mx-auto mt-2 max-w-2xl text-sm text-muted">
            Prefere delegar? Nossos especialistas cuidam de tudo por você — do faturamento à declaração.
          </p>
        </div>

        <div className="mx-auto mt-8 grid max-w-4xl gap-5 md:grid-cols-2">
          {completePlans.map((plan) => (
            <div className="flex flex-col rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/5" key={plan.key}>
              <Badge className="bg-fuchsia-500 text-white" label="Business" />
              <h3 className="mt-3 min-h-[3.5rem] text-lg font-bold text-ink">{plan.name}</h3>
              <p className="mt-1 min-h-[3rem] text-sm leading-6 text-muted">{plan.subtitle}</p>
              {billing === "anual" ? (
                <p className="mt-4 flex items-center gap-2 text-sm">
                  <span className="rounded bg-rose-500 px-1.5 py-0.5 text-[11px] font-bold text-white">
                    -{plan.discount}%
                  </span>
                  <span className="text-slate-400 line-through">{plan.monthly}</span>
                </p>
              ) : null}
              <p className={`${billing === "anual" ? "mt-1" : "mt-4"} flex items-baseline gap-1`}>
                <span className="text-2xl font-bold tabular-nums text-ink">
                  {billing === "anual" ? plan.annual : plan.monthly}
                </span>
                <span className="text-sm text-muted">/mês, sem IVA</span>
              </p>
              <p className="text-xs text-muted">
                {billing === "anual" ? "cobrado anualmente" : "conforme o pacote escolhido"}
              </p>
              <Link
                className="mt-5 inline-flex h-11 w-full items-center justify-center rounded-full bg-brand px-4 text-sm font-semibold text-white shadow-sm ring-1 ring-[#002D72]/20 transition hover:bg-[#003a94] active:bg-[#001F4D]"
                href={publicMode ? "/cadastro" : "/conselheiro"}
              >
                Falar com a equipe
              </Link>
              <ul className="mt-6 space-y-2.5 border-t border-line pt-5">
                {plan.points.map((point) => (
                  <li className="flex gap-2 text-sm text-slate-700" key={point}>
                    <CheckIcon />
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Dúvidas frequentes */}
      <div className="mt-16">
        <h2 className="text-center text-2xl font-bold text-ink">Alguma pergunta?</h2>
        <div className="mx-auto mt-8 grid max-w-5xl gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
          {faqs.map((item) => (
            <div key={item.q}>
              <h3 className="text-base font-bold text-ink">{item.q}</h3>
              <p className="mt-2 text-sm leading-6 text-muted">{item.a}</p>
            </div>
          ))}
        </div>
      </div>

      <p className="mx-auto mt-14 max-w-2xl text-center text-xs leading-5 text-muted">
        Os valores exibidos são orientativos e não incluem IVA. A cobrança efetiva é processada no checkout seguro.
        Cancele quando quiser.
      </p>
    </div>
  );
}
