import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PlanCta } from "./plan-cta";

type Plan = {
  name: string;
  price: string;
  oldPrice?: string;
  description: string;
  cta: string;
  ctaDisabled?: boolean;
  checkoutPlan?: "pro" | "premium";
  highlighted?: boolean;
  features: string[];
};

const plans: Plan[] = [
  {
    name: "Essencial",
    price: "0 €",
    description: "As ferramentas essenciais para gerenciar seu negócio de forma simples e gratuita.",
    cta: "Plano atual",
    ctaDisabled: true,
    features: ["Contabilidade automatizada", "Suporte limitado", "Orçamentos e faturamento", "Documentos essenciais"]
  },
  {
    name: "Pro",
    price: "9 €",
    description: "Todos os recursos avançados para ganhar tempo e gerenciar seu negócio.",
    cta: "Escolher Pro",
    checkoutPlan: "pro",
    features: [
      "Acompanhamento personalizado",
      "Assinatura eletrônica de orçamentos",
      "Cobranças automáticas de inadimplência",
      "Faturas recorrentes",
      "Acompanhamento dos limites de TVA"
    ]
  },
  {
    name: "Premium",
    price: "19 €",
    description: "Todas as suas declarações e acompanhamento administrativo com suporte prioritário.",
    cta: "Escolher Premium",
    checkoutPlan: "premium",
    highlighted: true,
    features: [
      "Acompanhamento prioritário",
      "Declarações fiscais",
      "Declaração de TVA",
      "Ajuda na declaração de renda",
      "Suporte prioritário"
    ]
  }
];

function CheckIcon() {
  return (
    <svg aria-hidden="true" className="mt-0.5 shrink-0 text-emerald-600" fill="none" height="18" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" viewBox="0 0 24 24" width="18">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export default async function OffresPage() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex items-center justify-between">
        <Link className="text-sm font-semibold text-muted transition hover:text-ink" href="/facturation">
          ← Voltar
        </Link>
      </div>

      <div className="mt-6 text-center">
        <h1 className="mx-auto max-w-2xl text-2xl font-semibold leading-tight text-ink sm:text-3xl">
          O software de gestão mais adequado ao seu negócio
        </h1>
        <p className="mt-3 text-sm text-muted">
          <span className="font-semibold text-emerald-600">Trustpilot 4.8/5</span> · +13 000 avaliações
        </p>

        {/* TODO: Connect billing period toggle (Mensuel/Annuel) to subscription pricing. */}
        <div className="mt-6 inline-flex items-center gap-1 rounded-2xl bg-slate-100 p-1 text-sm font-semibold">
          <span className="rounded-xl px-4 py-2 text-slate-500">Mensal</span>
          <span className="rounded-xl bg-white px-4 py-2 text-ink shadow-sm">Anual</span>
          <span className="ml-1 rounded-full bg-[#002D72]/10 px-2.5 py-0.5 text-xs font-semibold text-[#002D72]">Até -48€</span>
        </div>
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-3">
        {plans.map((plan) => (
          <div
            className={`flex flex-col rounded-2xl bg-white p-6 shadow-sm ${
              plan.highlighted ? "ring-2 ring-[#002D72]" : "ring-1 ring-black/5"
            }`}
            key={plan.name}
          >
            {plan.highlighted ? (
              <span className="mb-3 inline-flex w-fit rounded-full bg-[#002D72]/10 px-2.5 py-0.5 text-[11px] font-semibold text-[#002D72]">
                O mais popular
              </span>
            ) : null}
            <p className="text-sm font-semibold text-ink">{plan.name}</p>
            <p className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-semibold tabular-nums text-ink">{plan.price}</span>
              {plan.oldPrice ? <span className="text-sm text-slate-400 line-through">{plan.oldPrice}</span> : null}
              <span className="text-sm text-muted">/mês sem imposto</span>
            </p>
            <p className="mt-2 text-sm leading-6 text-muted">{plan.description}</p>
            {plan.checkoutPlan ? (
              <PlanCta
                className={`mt-5 inline-flex h-11 items-center justify-center rounded-2xl px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                  plan.highlighted
                    ? "bg-brand text-white shadow-sm ring-1 ring-[#002D72]/20 hover:bg-[#003a94] active:bg-[#001F4D]"
                    : "bg-white text-ink shadow-sm ring-1 ring-black/5 hover:bg-slate-50"
                }`}
                label={plan.cta}
                plan={plan.checkoutPlan}
              />
            ) : (
              <button
                className="mt-5 inline-flex h-11 cursor-not-allowed items-center justify-center rounded-2xl bg-slate-100 px-4 text-sm font-semibold text-slate-400"
                disabled
                type="button"
              >
                {plan.cta}
              </button>
            )}
            <ul className="mt-5 flex-1 space-y-2.5">
              {plan.features.map((feature) => (
                <li className="flex gap-2 text-sm text-slate-700" key={feature}>
                  <CheckIcon />
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </main>
  );
}
