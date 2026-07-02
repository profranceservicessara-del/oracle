"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FormModal } from "@/components/ui/form-modal";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";

// Pagamentos / Assinatura — UI de billing. Sem provedor de pagamento integrado
// (Stripe/checkout) no projeto: o formulário é frontend-only, NÃO envia nem
// armazena dados de cartão (apenas estado temporário do input). Após "salvar", só
// uma pré-visualização mascarada (bandeira + últimos 4 + validade) fica em estado
// local, some ao recarregar. Planos e CTAs são placeholders não-destrutivos.

type SavedCard = { brand: string; last4: string; exp: string };
type CardForm = { holder: string; number: string; exp: string; cvc: string; country: string; postal: string };

const EMPTY_FORM: CardForm = { holder: "", number: "", exp: "", cvc: "", country: "França", postal: "" };

function detectBrand(number: string): string {
  const n = number.replace(/\D/g, "");
  if (/^4/.test(n)) return "Visa";
  if (/^(5[1-5]|2[2-7])/.test(n)) return "Mastercard";
  if (/^3[47]/.test(n)) return "Amex";
  return "Cartão";
}

const plans = [
  {
    key: "essentiel",
    name: "Essentiel",
    price: "9 €",
    tagline: "Para começar",
    features: ["Faturas e orçamentos ilimitados", "1 usuário", "Suporte por email"],
    recommended: false
  },
  {
    key: "pro",
    name: "Pro",
    price: "19 €",
    tagline: "Mais popular",
    features: ["Tudo do Essentiel", "CRM + agenda", "Lembretes automáticos", "Multi-moeda"],
    recommended: true
  },
  {
    key: "premium",
    name: "Premium",
    price: "39 €",
    tagline: "Para escalar",
    features: ["Tudo do Pro", "Usuários ilimitados", "Integrações", "Suporte prioritário"],
    recommended: false
  }
];

export default function PagamentosPage() {
  const { showToast } = useToast();
  const [bannerOpen, setBannerOpen] = useState(true);
  const [isCardOpen, setIsCardOpen] = useState(false);
  const [form, setForm] = useState<CardForm>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [savedCard, setSavedCard] = useState<SavedCard | null>(null);

  function update<K extends keyof CardForm>(key: K, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function openCardModal() {
    setForm(EMPTY_FORM);
    setErrors({});
    setIsCardOpen(true);
  }

  function saveCard() {
    const next: Record<string, string> = {};
    const digits = form.number.replace(/\D/g, "");
    if (!form.holder.trim()) next.holder = "Informe o nome no cartão.";
    if (digits.length < 13) next.number = "Número de cartão inválido.";
    if (!/^\d{2}\/\d{2}$/.test(form.exp.trim())) next.exp = "Use o formato MM/AA.";
    if (!/^\d{3,4}$/.test(form.cvc.trim())) next.cvc = "CVC inválido.";
    if (!form.postal.trim()) next.postal = "Informe o código postal.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    // Frontend-only: guarda apenas o mascarado. Número/CVC nunca são persistidos.
    setSavedCard({ brand: detectBrand(digits), last4: digits.slice(-4), exp: form.exp.trim() });
    setForm(EMPTY_FORM);
    setIsCardOpen(false);
    showToast("Método de pagamento salvo (pré-visualização local).", "success");
  }

  function notConfigured() {
    showToast("O processamento de pagamento ainda não está configurado.", "info");
  }

  function scrollToPlans() {
    document.getElementById("planos")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <main className="mx-auto max-w-3xl px-1 py-2 md:py-0">
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-brand">Configurações</p>
          <h1 className="mt-2 text-2xl font-semibold text-ink">Pagamentos / Assinatura</h1>
          <p className="mt-2 text-sm text-muted">Gerencie seus métodos de pagamento e sua assinatura.</p>
        </div>
        <button
          className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-line bg-white px-3 py-2 text-sm font-medium text-ink shadow-sm transition hover:bg-slate-50"
          onClick={notConfigured}
          type="button"
        >
          Saber mais
          <svg fill="none" height="16" stroke="currentColor" strokeLinecap="round" strokeWidth="2" viewBox="0 0 24 24" width="16">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
      </div>

      {bannerOpen ? (
        <div className="mb-6 flex items-start justify-between gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
          <div>
            <p className="font-semibold text-ink">Configure seus métodos de pagamento e assinatura.</p>
            <p className="mt-1 text-sm text-muted">Adicione um método de pagamento e acompanhe sua assinatura do Oracle.</p>
            <button className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:underline" onClick={notConfigured} type="button">
              <svg fill="none" height="16" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24" width="16">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              </svg>
              Como funciona?
            </button>
          </div>
          <button aria-label="Fechar" className="shrink-0 text-slate-400 transition hover:text-ink" onClick={() => setBannerOpen(false)} type="button">
            <svg fill="none" height="18" stroke="currentColor" strokeLinecap="round" strokeWidth="2" viewBox="0 0 24 24" width="18"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>
      ) : null}

      {/* Método de pagamento */}
      <section className="mb-6 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
        <div className="border-b border-line bg-slate-50 px-5 py-3">
          <h2 className="text-base font-semibold text-ink">Método de pagamento</h2>
        </div>
        {savedCard ? (
          <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-5">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-14 items-center justify-center rounded-lg bg-[#0B1B3F] text-[10px] font-bold uppercase tracking-wide text-white">
                {savedCard.brand}
              </span>
              <div>
                <p className="text-sm font-semibold text-ink">{savedCard.brand} terminando em {savedCard.last4}</p>
                <p className="text-xs text-muted">Expira em {savedCard.exp}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button className="rounded-lg px-3 py-1.5 text-xs font-semibold text-brand ring-1 ring-inset ring-slate-200 transition hover:bg-slate-50" onClick={openCardModal} type="button">
                Atualizar
              </button>
              <button className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-700 ring-1 ring-inset ring-slate-200 transition hover:bg-slate-50" onClick={() => setSavedCard(null)} type="button">
                Remover
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 px-5 py-8 text-center">
            <p className="text-sm text-muted">Você ainda não adicionou um método de pagamento.</p>
            <Button onClick={openCardModal} type="button">Adicionar um método de pagamento</Button>
          </div>
        )}
      </section>

      {/* Assinaturas */}
      <section className="mb-6 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
        <div className="flex items-center justify-between gap-3 border-b border-line bg-slate-50 px-5 py-3">
          <h2 className="text-base font-semibold text-ink">Assinaturas</h2>
          <Link className="inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline" href="/facturation">
            Ver minhas faturas
            <svg fill="none" height="15" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24" width="15">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><path d="M15 3h6v6" /><path d="M10 14 21 3" />
            </svg>
          </Link>
        </div>
        <div className="flex flex-col items-center gap-3 px-5 py-10 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#EAF0FF] text-[#1D4ED8]">
            <svg fill="none" height="28" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" viewBox="0 0 24 24" width="28">
              <rect height="14" rx="2" width="20" x="2" y="3" /><line x1="8" x2="16" y1="21" y2="21" /><line x1="12" x2="12" y1="17" y2="21" />
            </svg>
          </span>
          <p className="text-lg font-semibold text-ink">Sem assinatura</p>
          <p className="max-w-sm text-sm text-muted">Você ainda não se inscreveu em uma assinatura.</p>
          <Button className="mt-1" onClick={scrollToPlans} type="button">
            <svg className="mr-1.5" fill="none" height="16" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24" width="16">
              <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91 0z" /><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" /><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" /><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
            </svg>
            Descubra as nossas ofertas
          </Button>
        </div>
      </section>

      {/* Planos */}
      <section className="mb-6 scroll-mt-6" id="planos">
        <div className="mb-4">
          <h2 className="text-base font-semibold text-ink">Escolha o seu plano</h2>
          <p className="mt-1 text-sm text-muted">Preços indicativos. A cobrança será ativada quando o pagamento estiver configurado.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {plans.map((plan) => (
            <div
              className={`relative flex flex-col rounded-2xl bg-white p-5 shadow-sm transition ${
                plan.recommended ? "ring-2 ring-[#1D4ED8]" : "ring-1 ring-black/5"
              }`}
              key={plan.key}
            >
              {plan.recommended ? (
                <span className="absolute -top-2.5 left-5 rounded-full bg-[#1D4ED8] px-2.5 py-0.5 text-[11px] font-semibold text-white shadow-sm">
                  Recomendado
                </span>
              ) : null}
              <p className="text-sm font-semibold text-ink">{plan.name}</p>
              <p className="mt-0.5 text-xs text-muted">{plan.tagline}</p>
              <p className="mt-3">
                <span className="text-2xl font-bold text-ink">{plan.price}</span>
                <span className="text-sm text-muted"> /mês</span>
              </p>
              <ul className="mt-4 flex-1 space-y-2 text-sm text-slate-600">
                {plan.features.map((feature) => (
                  <li className="flex items-start gap-2" key={feature}>
                    <svg className="mt-0.5 shrink-0 text-[#1D4ED8]" fill="none" height="16" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="16">
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>
              <Button
                className="mt-5 w-full"
                onClick={notConfigured}
                type="button"
                variant={plan.recommended ? "primary" : "secondary"}
              >
                Escolher plano
              </Button>
            </div>
          ))}
        </div>
      </section>

      {/* Testes gratuitos */}
      <section className="mb-6 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
        <div className="border-b border-line bg-slate-50 px-5 py-3">
          <h2 className="text-base font-semibold text-ink">Testes gratuitos (sem pagamentos programados)</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-5 py-3">Data</th>
                <th className="px-5 py-3">Produto</th>
                <th className="px-5 py-3">Fim do período de teste gratuito</th>
                <th className="px-5 py-3">Estado</th>
                <th className="px-5 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="px-5 py-8 text-center text-muted" colSpan={5}>
                  Nenhum teste gratuito em andamento.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <FormModal
        description="Seus dados de cartão não são enviados nem armazenados — o processamento de pagamento ainda não está configurado."
        isOpen={isCardOpen}
        onClose={() => setIsCardOpen(false)}
        title="Adicionar método de pagamento"
      >
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            saveCard();
          }}
        >
          <label className="text-sm font-medium text-ink">
            Nome no cartão
            <Input className="mt-2" onChange={(event) => update("holder", event.target.value)} placeholder="Bruna Silva" value={form.holder} />
            {errors.holder ? <span className="mt-1 block text-xs text-red-600">{errors.holder}</span> : null}
          </label>

          <label className="text-sm font-medium text-ink">
            Número do cartão
            <Input className="mt-2" inputMode="numeric" onChange={(event) => update("number", event.target.value)} placeholder="4242 4242 4242 4242" value={form.number} />
            {errors.number ? <span className="mt-1 block text-xs text-red-600">{errors.number}</span> : null}
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium text-ink">
              Validade
              <Input className="mt-2" onChange={(event) => update("exp", event.target.value)} placeholder="MM/AA" value={form.exp} />
              {errors.exp ? <span className="mt-1 block text-xs text-red-600">{errors.exp}</span> : null}
            </label>
            <label className="text-sm font-medium text-ink">
              CVC
              <Input className="mt-2" inputMode="numeric" onChange={(event) => update("cvc", event.target.value)} placeholder="123" value={form.cvc} />
              {errors.cvc ? <span className="mt-1 block text-xs text-red-600">{errors.cvc}</span> : null}
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium text-ink">
              País de cobrança
              <Select className="mt-2" onChange={(event) => update("country", event.target.value)} value={form.country}>
                <option value="França">França</option>
                <option value="Portugal">Portugal</option>
                <option value="Bélgica">Bélgica</option>
                <option value="Luxemburgo">Luxemburgo</option>
                <option value="Suíça">Suíça</option>
                <option value="Outro">Outro</option>
              </Select>
            </label>
            <label className="text-sm font-medium text-ink">
              Código postal
              <Input className="mt-2" onChange={(event) => update("postal", event.target.value)} placeholder="75001" value={form.postal} />
              {errors.postal ? <span className="mt-1 block text-xs text-red-600">{errors.postal}</span> : null}
            </label>
          </div>

          <div className="flex items-center gap-2 rounded-xl bg-slate-50 p-3 text-xs text-slate-500 ring-1 ring-black/5">
            <svg className="shrink-0 text-slate-400" fill="none" height="16" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24" width="16">
              <rect height="11" rx="2" width="18" x="3" y="11" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            Pré-visualização local. Nenhum dado de cartão é enviado ou armazenado.
          </div>

          <div className="flex justify-end gap-2">
            <Button onClick={() => setIsCardOpen(false)} type="button" variant="secondary">
              Cancelar
            </Button>
            <Button type="submit">Salvar método de pagamento</Button>
          </div>
        </form>
      </FormModal>
    </main>
  );
}
