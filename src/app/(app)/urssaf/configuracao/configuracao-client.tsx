"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";
import type { ActivityCategory, DeclarationPeriodicite, Profile } from "@/lib/types";
import { formatSiret } from "@/lib/validation";

const CATEGORIES: { value: ActivityCategory; title: string; desc: string }[] = [
  { value: "vente", title: "Venda de mercadorias (BIC)", desc: "Atividade comercial ou artesanal que vende produtos." },
  { value: "service_bic", title: "Serviços prestados (BIC)", desc: "Negócio comercial ou artesanal que vende serviços." },
  { value: "service_bnc", title: "Outros serviços (BNC)", desc: "Profissional autônomo — atividade não comercial." }
];

const PERIODS: { value: DeclarationPeriodicite; label: string; desc: string }[] = [
  { value: "mensal", label: "Mensal", desc: "Você declara o faturamento todo mês." },
  { value: "trimestral", label: "Trimestral", desc: "Você declara o faturamento a cada trimestre." }
];

const CHECKLIST = [
  "Verificar o número SIRET",
  "Confirmar a categoria de atividade",
  "Escolher a periodicidade correta",
  "Conferir as receitas antes de declarar"
];

export function UrssafConfigClient({ initialProfile, userId }: { initialProfile: Profile | null; userId: string }) {
  const supabase = useMemo(() => createClient(), []);
  const { showToast } = useToast();
  const [siret, setSiret] = useState(initialProfile?.siret ? formatSiret(initialProfile.siret) : "");
  const [activite, setActivite] = useState<ActivityCategory>(initialProfile?.activite_principale ?? "service_bic");
  const [periodicite, setPeriodicite] = useState<DeclarationPeriodicite>(initialProfile?.declaration_periodicite ?? "trimestral");
  const [saving, setSaving] = useState(false);
  const [siretError, setSiretError] = useState<string | null>(null);

  async function save() {
    const digits = siret.replace(/\D/g, "");
    if (digits.length > 0 && digits.length !== 14) {
      setSiretError("O SIRET deve ter 14 dígitos.");
      return;
    }
    setSiretError(null);
    setSaving(true);
    // Update parcial — só os campos de declaração. Não toca outras colunas.
    const { error } = await supabase
      .from("profiles")
      .update({ siret: digits || null, activite_principale: activite, declaration_periodicite: periodicite })
      .eq("id", userId);
    setSaving(false);
    if (error) {
      showToast("Não foi possível salvar. Tente novamente.", "error");
      return;
    }
    showToast("Configuração salva.", "success");
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          <Link className="hover:text-brand hover:underline" href="/urssaf">URSSAF</Link> · Configuração
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-ink">Configurar declaração</h1>
        <p className="mt-1 text-sm text-muted">Confirme os dados usados para preparar suas declarações. Você pode alterá-los quando quiser.</p>
      </div>

      {/* Informações do contribuinte */}
      <section className="mb-5 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
        <h2 className="text-sm font-semibold text-ink">Informações do contribuinte</h2>
        <p className="mt-1 text-xs text-muted">Usadas apenas para identificar sua atividade na preparação.</p>
        <div className="mt-4 max-w-sm">
          <label className="text-sm font-medium text-ink" htmlFor="siret">Número SIRET</label>
          <Input
            className="mt-2"
            id="siret"
            inputMode="numeric"
            onChange={(e) => setSiret(formatSiret(e.target.value))}
            placeholder="000 000 000 00000"
            value={siret}
          />
          {siretError ? <p className="mt-1 text-xs text-red-600">{siretError}</p> : (
            <p className="mt-1 text-xs text-muted">14 dígitos. Também disponível em <Link className="font-medium text-brand hover:underline" href="/configuracoes/empresa">Dados da empresa</Link>.</p>
          )}
        </div>
      </section>

      {/* Categoria de atividade */}
      <section className="mb-5 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
        <h2 className="text-sm font-semibold text-ink">Categoria de atividade</h2>
        <p className="mt-1 text-xs text-muted">Selecione a categoria em que você declara seu faturamento à URSSAF.</p>
        <div className="mt-4 space-y-2.5">
          {CATEGORIES.map((c) => {
            const active = activite === c.value;
            return (
              <label
                className={`flex cursor-pointer items-start gap-3 rounded-xl p-4 ring-1 transition ${
                  active ? "bg-brand/5 ring-brand/40" : "bg-white ring-slate-200 hover:bg-slate-50"
                }`}
                key={c.value}
              >
                <input
                  checked={active}
                  className="mt-0.5 h-4 w-4 accent-[#1D4ED8]"
                  name="activite"
                  onChange={() => setActivite(c.value)}
                  type="radio"
                />
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-ink">{c.title}</span>
                  <span className="mt-0.5 block text-xs text-muted">{c.desc}</span>
                </span>
              </label>
            );
          })}
        </div>
      </section>

      {/* Periodicidade */}
      <section className="mb-5 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
        <h2 className="text-sm font-semibold text-ink">Periodicidade da declaração</h2>
        <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
          {PERIODS.map((p) => {
            const active = periodicite === p.value;
            return (
              <label
                className={`flex cursor-pointer items-start gap-3 rounded-xl p-4 ring-1 transition ${
                  active ? "bg-brand/5 ring-brand/40" : "bg-white ring-slate-200 hover:bg-slate-50"
                }`}
                key={p.value}
              >
                <input checked={active} className="mt-0.5 h-4 w-4 accent-[#1D4ED8]" name="periodicite" onChange={() => setPeriodicite(p.value)} type="radio" />
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-ink">{p.label}</span>
                  <span className="mt-0.5 block text-xs text-muted">{p.desc}</span>
                </span>
              </label>
            );
          })}
        </div>
      </section>

      {/* Aviso Imposto final */}
      <div className="mb-5 flex items-start gap-2.5 rounded-2xl bg-amber-50 p-4 text-sm text-amber-800 ring-1 ring-amber-200">
        <svg className="mt-0.5 shrink-0" fill="none" height="16" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24" width="16">
          <circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="8" y2="12" /><line x1="12" x2="12.01" y1="16" y2="16" />
        </svg>
        <span>
          <span className="font-semibold">Imposto na fonte</span>
          <span className="mt-0.5 block">Esta ferramenta ajuda a preparar sua declaração, mas não considera o cálculo do imposto retido na fonte. Confirme os valores oficiais na URSSAF.</span>
        </span>
      </div>

      {/* Checklist */}
      <section className="mb-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
        <h2 className="text-sm font-semibold text-ink">Antes de declarar</h2>
        <ul className="mt-3 space-y-2">
          {CHECKLIST.map((item) => (
            <li className="flex items-center gap-2.5 text-sm text-slate-600" key={item}>
              <svg className="shrink-0 text-emerald-500" fill="none" height="16" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" viewBox="0 0 24 24" width="16">
                <path d="M20 6 9 17l-5-5" />
              </svg>
              {item}
            </li>
          ))}
        </ul>
      </section>

      {/* CTA */}
      <div className="sticky bottom-4 flex justify-end">
        <Button className="shadow-lg" disabled={saving} onClick={() => void save()} type="button">
          {saving ? "Salvando…" : "Salvar configuração"}
        </Button>
      </div>
    </main>
  );
}
