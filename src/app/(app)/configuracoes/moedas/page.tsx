"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";

// Configurações > Moedas e idiomas.
// "Idioma padrão" is real (persists user_preferences.locale). The multi-currency
// controls are frontend-only placeholders (no currency schema yet).

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      aria-pressed={checked}
      className={`relative h-6 w-11 shrink-0 rounded-full transition ${checked ? "bg-[#002D72]" : "bg-slate-200"}`}
      onClick={() => onChange(!checked)}
      type="button"
    >
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${checked ? "left-[22px]" : "left-0.5"}`} />
    </button>
  );
}

export default function MoedasPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const { showToast } = useToast();

  const [locale, setLocale] = useState<"fr" | "pt">("fr");
  const [savingLocale, setSavingLocale] = useState(false);
  const [infoOpen, setInfoOpen] = useState(true);
  const [multiCurrency, setMultiCurrency] = useState(false);
  const [currency, setCurrency] = useState("EUR");
  const [customRates, setCustomRates] = useState(false);

  useEffect(() => {
    let active = true;
    void (async () => {
      const {
        data: { user }
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("user_preferences").select("locale").eq("user_id", user.id).maybeSingle();
      if (active && (data?.locale === "fr" || data?.locale === "pt")) setLocale(data.locale);
    })();
    return () => {
      active = false;
    };
  }, [supabase]);

  async function changeLocale(next: "fr" | "pt") {
    setLocale(next);
    setSavingLocale(true);
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("user_preferences").upsert({ locale: next, user_id: user.id }, { onConflict: "user_id" });
    }
    setSavingLocale(false);
    showToast("Idioma salvo.", "success");
    router.refresh();
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-brand">Configurações</p>
          <h1 className="mt-2 flex items-center gap-2 text-2xl font-semibold text-ink">
            <svg aria-hidden="true" className="text-brand" fill="none" height="22" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" viewBox="0 0 24 24" width="22">
              <circle cx="12" cy="12" r="9" />
              <path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" />
            </svg>
            Moedas e idiomas
          </h1>
        </div>
      </div>

      {infoOpen ? (
        <div className="mb-6 flex items-start justify-between gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
          <div>
            <p className="font-semibold text-ink">Configurar moedas</p>
            <p className="mt-1 text-sm text-muted">Ative o suporte a múltiplas moedas e escolha a moeda padrão para seus documentos.</p>
          </div>
          <button aria-label="Fechar" className="shrink-0 text-slate-400 transition hover:text-ink" onClick={() => setInfoOpen(false)} type="button">
            <svg fill="none" height="18" stroke="currentColor" strokeLinecap="round" strokeWidth="2" viewBox="0 0 24 24" width="18"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>
      ) : null}

      {/* Linguagem */}
      <section className="mb-6 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
        <div className="border-b border-line bg-slate-50 px-5 py-3">
          <h2 className="text-sm font-semibold text-ink">Linguagem</h2>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
          <div>
            <p className="text-sm font-medium text-ink">Idioma padrão</p>
            <p className="mt-0.5 text-xs text-muted">Idioma da interface e dos seus documentos.</p>
          </div>
          <Select
            aria-label="Idioma padrão"
            className="w-52"
            disabled={savingLocale}
            onChange={(event) => void changeLocale(event.target.value as "fr" | "pt")}
            value={locale}
          >
            <option value="fr">Français</option>
            <option value="pt">Português</option>
          </Select>
        </div>
      </section>

      {/* Moedas */}
      <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
        <div className="border-b border-line bg-slate-50 px-5 py-3">
          <h2 className="text-sm font-semibold text-ink">Moedas</h2>
        </div>
        <div className="divide-y divide-line">
          <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
            <div>
              <p className="text-sm font-medium text-ink">Ativar faturamento em múltiplas moedas</p>
              <p className="mt-0.5 text-xs text-muted">Emita documentos em outras moedas além da padrão.</p>
            </div>
            <Toggle checked={multiCurrency} onChange={setMultiCurrency} />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
            <div>
              <p className="text-sm font-medium text-ink">Moeda padrão</p>
              <p className="mt-0.5 text-xs text-muted">Moeda usada por padrão em novos documentos.</p>
            </div>
            <Select aria-label="Moeda padrão" className="w-52" onChange={(event) => setCurrency(event.target.value)} value={currency}>
              <option value="EUR">Euro (€)</option>
              <option value="USD">Dólar (US$)</option>
              <option value="GBP">Libra (£)</option>
              <option value="CHF">Franco suíço (CHF)</option>
              <option value="BRL">Real (R$)</option>
            </Select>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
            <div>
              <p className="text-sm font-medium text-ink">Personalize as taxas de câmbio</p>
              <p className="mt-0.5 text-xs text-muted">Defina manualmente as taxas de conversão.</p>
            </div>
            <Toggle checked={customRates} onChange={setCustomRates} />
          </div>
        </div>
      </section>

      <p className="mt-4 px-1 text-xs text-muted">
        O suporte a múltiplas moedas é uma prévia — as opções de moeda ainda não são salvas. O idioma padrão é aplicado imediatamente.
      </p>
    </main>
  );
}
