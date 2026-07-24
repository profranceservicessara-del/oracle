"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";
import { currentPlan, planLabels, statusLabels, subscriptionActive, type PlanTier } from "@/lib/plan";
import type { BillingInvoice } from "@/app/api/stripe/invoices/route";

// Pagamentos / Assinatura — billing real via Stripe. Nenhum dado de cartão é
// coletado aqui: o checkout e o portal acontecem no ambiente seguro do Stripe.
// A fonte da verdade são os campos billing do profile, sincronizados pelo webhook.

type Billing = {
  plan: string | null;
  subscription_status: string | null;
  current_period_end: string | null;
  stripe_customer_id: string | null;
};

type PlanCard = {
  key: "pro" | "premium" | "business";
  badge: { label: string; className: string };
  name: string;
  tagline: string;
  monthly: number;
  annual: number;
  recommended: boolean;
  external?: boolean;
  features: string[];
};

// Mesma identidade da página /offres. Start e Mestre são compráveis via Stripe
// (checkout keys pro/premium). Business abre a página completa de planos.
const plans: PlanCard[] = [
  {
    key: "pro",
    badge: { label: "Start", className: "bg-brand text-white" },
    name: "Para começar",
    tagline: "Dê destaque ao seu negócio.",
    monthly: 19,
    annual: 15,
    recommended: false,
    features: [
      "Faturas e orçamentos",
      "Lembrete: Urssaf, impostos e CFE",
      "Personalização de documentos",
      "Atendimento ao cliente"
    ]
  },
  {
    key: "premium",
    badge: { label: "Pro", className: "bg-amber-400 text-ink" },
    name: "Mestre",
    tagline: "Ambiente completo e integrado.",
    monthly: 29,
    annual: 23,
    recommended: true,
    features: [
      "Tudo da oferta Start",
      "Livro de receitas",
      "Personalização avançada de documentos",
      "Declaração de transferência para o Urssaf",
      "Modelos de contrato"
    ]
  },
  {
    key: "business",
    badge: { label: "Business", className: "bg-fuchsia-500 text-white" },
    name: "Indo além",
    tagline: "Sem limites para crescer.",
    monthly: 49,
    annual: 39,
    recommended: false,
    external: true,
    features: ["Tudo da oferta Pro", "Gestão de estoque", "Cobrança automática recorrente", "Atendimento prioritário"]
  }
];

const euro = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });

function planSavings(monthly: number, annual: number): number {
  return Math.round((1 - annual / monthly) * 100);
}

function PlanBadge({ label, className }: { label: string; className: string }) {
  return (
    <span
      className={`inline-flex -skew-x-12 items-center rounded-md px-2.5 py-1 text-[11px] font-black uppercase italic tracking-wide shadow-sm ${className}`}
    >
      <span className="skew-x-12">{label}</span>
    </span>
  );
}

function formatDate(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

// Valor em centavos (Stripe) -> moeda formatada. Fallback seguro se faltar.
function formatAmount(amount: number | null, currency: string | null): string {
  if (amount === null) return "—";
  try {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: currency ?? "EUR" }).format(amount / 100);
  } catch {
    return `${(amount / 100).toFixed(2)} ${currency ?? ""}`.trim();
  }
}

const invoiceStatusLabels: Record<string, string> = {
  paid: "Paga",
  open: "Em aberto",
  draft: "Rascunho",
  void: "Anulada",
  uncollectible: "Não recuperável"
};

export default function PagamentosPage() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [billing, setBilling] = useState<Billing | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [invoices, setInvoices] = useState<BillingInvoice[]>([]);
  const [invoicesState, setInvoicesState] = useState<"loading" | "ok" | "empty" | "no-customer" | "error">("loading");
  const [period, setPeriod] = useState<"mensal" | "anual">("anual");

  const load = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("profiles")
      .select("plan, subscription_status, current_period_end, stripe_customer_id")
      .eq("id", user.id)
      .maybeSingle();
    setBilling(data as Billing | null);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    async function loadInvoices() {
      try {
        const response = await fetch("/api/stripe/invoices");
        if (!response.ok) {
          setInvoicesState("error");
          return;
        }
        const data = (await response.json()) as { hasCustomer?: boolean; invoices?: BillingInvoice[] };
        if (!data.hasCustomer) {
          setInvoicesState("no-customer");
          return;
        }
        const list = data.invoices ?? [];
        setInvoices(list);
        setInvoicesState(list.length > 0 ? "ok" : "empty");
      } catch {
        setInvoicesState("error");
      }
    }
    void loadInvoices();
  }, []);

  useEffect(() => {
    // Retorno do checkout: informa e recarrega o estado (o webhook pode levar
    // alguns segundos para sincronizar).
    const params = new URLSearchParams(window.location.search);
    const checkout = params.get("checkout");
    if (checkout === "success") {
      showToast("Pagamento concluído. Sua assinatura será ativada em instantes.", "success");
      window.history.replaceState({}, "", "/configuracoes/pagamentos");
    } else if (checkout === "cancel") {
      showToast("Pagamento cancelado.", "info");
      window.history.replaceState({}, "", "/configuracoes/pagamentos");
    }
  }, [showToast]);

  async function choosePlan(plan: PlanTier) {
    setPending(plan);
    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan })
      });
      const data = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !data.url) {
        showToast(data.error ?? "Não foi possível iniciar o pagamento.", "error");
        setPending(null);
        return;
      }
      window.location.href = data.url;
    } catch {
      showToast("Não foi possível iniciar o pagamento.", "error");
      setPending(null);
    }
  }

  async function manageSubscription() {
    setPending("portal");
    try {
      const response = await fetch("/api/stripe/portal", { method: "POST" });
      const data = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !data.url) {
        showToast(data.error ?? "Não foi possível abrir o portal.", "error");
        setPending(null);
        return;
      }
      window.location.href = data.url;
    } catch {
      showToast("Não foi possível abrir o portal.", "error");
      setPending(null);
    }
  }

  const active = subscriptionActive(billing);
  const tier = currentPlan(billing);
  const status = billing?.subscription_status ?? "inactive";
  const periodEnd = formatDate(billing?.current_period_end ?? null);

  return (
    <main className="mx-auto max-w-3xl px-1 py-2 md:py-0">
      <div className="mb-6">
        <p className="text-sm font-semibold text-brand">Configurações</p>
        <h1 className="mt-2 text-2xl font-semibold text-ink">Pagamentos / Assinatura</h1>
        <p className="mt-2 text-sm text-muted">Gerencie sua assinatura do Oracle com segurança via Stripe.</p>
      </div>

      {/* Assinatura atual */}
      <section className="mb-6 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
        <div className="flex items-center justify-between gap-3 border-b border-line bg-slate-50 px-5 py-3">
          <h2 className="text-base font-semibold text-ink">Assinatura atual</h2>
          <Link className="inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline" href="/facturation">
            Ver minhas faturas
            <svg fill="none" height="15" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24" width="15">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><path d="M15 3h6v6" /><path d="M10 14 21 3" />
            </svg>
          </Link>
        </div>

        {loading ? (
          <div className="px-5 py-10 text-center text-sm text-muted">Carregando…</div>
        ) : active ? (
          <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-6">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold text-ink">Plano {planLabels[tier]}</span>
                <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200">
                  {statusLabels[status] ?? "Ativa"}
                </span>
              </div>
              {periodEnd ? (
                <p className="mt-1.5 text-sm text-muted">
                  {status === "canceled" ? "Acesso até" : "Renova em"} {periodEnd}
                </p>
              ) : null}
            </div>
            <Button disabled={pending === "portal"} onClick={manageSubscription} type="button">
              {pending === "portal" ? "Abrindo…" : "Gerenciar assinatura"}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 px-5 py-10 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#EAF0FF] text-[#1D4ED8]">
              <svg fill="none" height="28" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" viewBox="0 0 24 24" width="28">
                <rect height="14" rx="2" width="20" x="2" y="3" /><line x1="8" x2="16" y1="21" y2="21" /><line x1="12" x2="12" y1="17" y2="21" />
              </svg>
            </span>
            <p className="text-lg font-semibold text-ink">Sem assinatura ativa</p>
            <p className="max-w-sm text-sm text-muted">Escolha um plano abaixo para desbloquear todos os recursos do Oracle.</p>
          </div>
        )}
      </section>

      {/* Planos */}
      <section className="mb-6 scroll-mt-6" id="planos">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-ink">{active ? "Alterar plano" : "Escolha o seu plano"}</h2>
            <p className="mt-1 text-sm text-muted">
              Cobrança segura via Stripe.{" "}
              <Link className="font-medium text-brand hover:underline" href="/offres">
                Ver todos os planos
              </Link>
              .
            </p>
          </div>
          {/* Toggle Mensal / Anual */}
          <div className="inline-flex items-center rounded-full bg-slate-100 p-1 text-sm font-semibold">
            {(["mensal", "anual"] as const).map((option) => (
              <button
                className={`rounded-full px-4 py-1.5 capitalize transition ${
                  period === option ? "bg-brand text-white shadow-sm" : "text-slate-500 hover:text-ink"
                }`}
                key={option}
                onClick={() => setPeriod(option)}
                type="button"
              >
                {option}
                {option === "anual" ? <span className="ml-1 text-xs font-bold text-emerald-500">-20%</span> : null}
              </button>
            ))}
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {plans.map((plan) => {
            const isCurrent = active && tier === plan.key;
            const price = period === "anual" ? plan.annual : plan.monthly;
            const showDiscount = period === "anual" && plan.monthly > plan.annual;
            return (
              <div
                className={`relative flex flex-col rounded-2xl bg-white p-5 shadow-sm transition ${
                  plan.recommended ? "ring-2 ring-brand" : "ring-1 ring-black/5"
                }`}
                key={plan.key}
              >
                {plan.recommended ? (
                  <span className="absolute -top-2.5 right-5 rounded-full bg-ink px-2.5 py-0.5 text-[11px] font-semibold text-white shadow-sm">
                    Mais popular
                  </span>
                ) : null}
                <div className="flex min-h-[1.75rem] items-center">
                  <PlanBadge className={plan.badge.className} label={plan.badge.label} />
                </div>
                <p className="mt-2.5 text-base font-bold text-ink">{plan.name}</p>
                <p className="mt-0.5 min-h-[2.5rem] text-xs leading-5 text-muted">{plan.tagline}</p>
                <div className="mt-2 flex min-h-[3.25rem] flex-col justify-end">
                  {showDiscount ? (
                    <p className="flex items-center gap-1.5 text-xs">
                      <span className="rounded bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                        -{planSavings(plan.monthly, plan.annual)}%
                      </span>
                      <span className="text-slate-400 line-through">{euro.format(plan.monthly)} €</span>
                    </p>
                  ) : null}
                  <p>
                    <span className="text-2xl font-bold tabular-nums text-ink">{euro.format(price)} €</span>
                    <span className="text-sm text-muted"> /mês</span>
                  </p>
                  {period === "anual" ? <p className="text-[11px] text-muted">cobrado anualmente</p> : null}
                </div>
                <ul className="mt-4 flex-1 space-y-2 text-sm text-slate-600">
                  {plan.features.map((feature) => (
                    <li className="flex items-start gap-2" key={feature}>
                      <svg className="mt-0.5 shrink-0 text-brand" fill="none" height="16" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="16">
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>
                {plan.external ? (
                  <Link
                    className="mt-5 inline-flex h-11 w-full items-center justify-center rounded bg-white px-4 text-sm font-semibold text-ink shadow-sm ring-1 ring-black/5 transition hover:bg-slate-50"
                    href="/offres"
                  >
                    Ver planos
                  </Link>
                ) : isCurrent ? (
                  <Button className="mt-5 w-full" disabled type="button" variant="secondary">
                    Plano atual
                  </Button>
                ) : (
                  <Button
                    className="mt-5 w-full"
                    disabled={pending !== null}
                    onClick={() => (active ? manageSubscription() : choosePlan(plan.key as PlanTier))}
                    type="button"
                    variant={plan.recommended ? "primary" : "secondary"}
                  >
                    {pending === plan.key ? "Redirecionando…" : active ? "Trocar de plano" : "Escolher plano"}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Faturas da assinatura */}
      <section className="mb-6 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
        <div className="flex items-center justify-between gap-3 border-b border-line bg-slate-50 px-5 py-3">
          <h2 className="text-base font-semibold text-ink">Faturas da assinatura</h2>
          {billing?.stripe_customer_id ? (
            <button
              className="inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline disabled:opacity-60"
              disabled={pending === "portal"}
              onClick={manageSubscription}
              type="button"
            >
              Gerenciar no portal Stripe
              <svg fill="none" height="15" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24" width="15">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><path d="M15 3h6v6" /><path d="M10 14 21 3" />
              </svg>
            </button>
          ) : null}
        </div>

        {invoicesState === "loading" ? (
          <div className="px-5 py-10 text-center text-sm text-muted">Carregando faturas…</div>
        ) : invoicesState === "no-customer" ? (
          <div className="px-5 py-10 text-center text-sm text-muted">Nenhuma fatura de assinatura disponível.</div>
        ) : invoicesState === "empty" ? (
          <div className="px-5 py-10 text-center text-sm text-muted">Você ainda não possui faturas de assinatura.</div>
        ) : invoicesState === "error" ? (
          <div className="px-5 py-10 text-center text-sm text-muted">Não foi possível carregar suas faturas agora. Tente novamente mais tarde.</div>
        ) : (
          <ul className="divide-y divide-line">
            {invoices.map((invoice, index) => (
              <li className="flex flex-wrap items-center justify-between gap-3 px-5 py-4" key={invoice.number ?? index}>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-ink">{invoice.number ?? "Fatura"}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        invoice.paid || invoice.status === "paid"
                          ? "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200"
                          : "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200"
                      }`}
                    >
                      {invoice.status ? invoiceStatusLabels[invoice.status] ?? invoice.status : "—"}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted">
                    {formatDate(invoice.date) ?? "—"} · {formatAmount(invoice.amount, invoice.currency)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {invoice.hostedUrl ? (
                    <a
                      className="rounded-lg px-3 py-1.5 text-xs font-semibold text-brand ring-1 ring-inset ring-slate-200 transition hover:bg-slate-50"
                      href={invoice.hostedUrl}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      Ver fatura
                    </a>
                  ) : null}
                  {invoice.pdfUrl ? (
                    <a
                      className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-700 ring-1 ring-inset ring-slate-200 transition hover:bg-slate-50"
                      href={invoice.pdfUrl}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      Baixar recibo
                    </a>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Nota de segurança */}
      <div className="mb-6 flex items-center gap-2.5 rounded-xl bg-slate-50 p-4 text-xs text-slate-500 ring-1 ring-black/5">
        <svg className="shrink-0 text-slate-400" fill="none" height="16" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24" width="16">
          <rect height="11" rx="2" width="18" x="3" y="11" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
        Pagamentos processados com segurança pela Stripe. O Oracle nunca vê nem armazena os dados do seu cartão.
      </div>
    </main>
  );
}
