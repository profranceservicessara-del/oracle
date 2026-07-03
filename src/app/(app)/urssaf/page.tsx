"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";
import { formatSiret } from "@/lib/validation";

// Gestão > Declaração de Urssaf — tela de configuração. Frontend-safe: sem
// integração URSSAF nem cálculo de imposto. SIRET pré-preenchido do profile
// (fallback vazio). O CTA só salva um estado local + toast informativo.

const categories = [
  { key: "vente", label: "Venda de mercadorias (BIC)", desc: "Você exerce uma atividade comercial ou artesanal e vende produtos." },
  { key: "service_bic", label: "Serviços prestados (BIC)", desc: "Você administra um negócio comercial ou artesanal e vende serviços." },
  { key: "service_bnc", label: "Outros serviços (sem fins lucrativos)", desc: "Você é um profissional autônomo." },
  { key: "cipav", label: "Receitas CIPAV", desc: "Você exerce uma atividade autônoma regulamentada pelo regime CIPAV." }
];

export default function UrssafPage() {
  const supabase = useMemo(() => createClient(), []);
  const { showToast } = useToast();
  const [siret, setSiret] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let active = true;
    void (async () => {
      const {
        data: { user }
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("profiles").select("siret").eq("id", user.id).maybeSingle();
      if (active && data?.siret) setSiret(formatSiret(data.siret));
    })();
    return () => {
      active = false;
    };
  }, [supabase]);

  function toggle(key: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const valid = siret.replace(/\D/g, "").length >= 9 && birthDate.trim().length > 0 && selected.size > 0;

  function submit() {
    if (!valid) return;
    setSaved(true);
    showToast("Configuração salva. A declaração será disponibilizada em breve.", "success");
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <p className="text-sm font-semibold text-brand">Gestão</p>
      <h1 className="mt-1 text-2xl font-semibold text-ink">Declaração de Urssaf</h1>

      <section className="mt-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5 sm:p-8">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-ink">Configure suas declarações</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-muted">
            Precisamos de algumas informações adicionais para que você possa usar esse recurso.
          </p>
        </div>

        {/* Identificação */}
        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          <label className="text-sm">
            <span className="flex items-center gap-1.5 text-slate-400">
              <svg fill="none" height="16" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" viewBox="0 0 24 24" width="16"><line x1="4" x2="20" y1="9" y2="9" /><line x1="4" x2="20" y1="15" y2="15" /><line x1="10" x2="8" y1="3" y2="21" /><line x1="16" x2="14" y1="3" y2="21" /></svg>
            </span>
            <span className="mt-1 block font-medium text-ink">Confirme seu número SIRET.</span>
            <Input className="mt-2" inputMode="numeric" onChange={(event) => setSiret(formatSiret(event.target.value))} placeholder="000 000 000 000 00" value={siret} />
          </label>
          <label className="text-sm">
            <span className="flex items-center gap-1.5 text-slate-400">
              <svg fill="none" height="16" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" viewBox="0 0 24 24" width="16"><rect height="14" rx="2" width="18" x="3" y="5" /><path d="M8 3v4M16 3v4M3 11h18" /></svg>
            </span>
            <span className="mt-1 block font-medium text-ink">Confirme sua data de nascimento.</span>
            <Input className="mt-2" onChange={(event) => setBirthDate(event.target.value)} placeholder="JJ/MM/AAAA" type="date" value={birthDate} />
          </label>
        </div>

        <div className="my-8 border-t border-line" />

        {/* Declaração de receita */}
        <div>
          <h3 className="flex items-center gap-2 text-base font-semibold text-ink">
            <span className="text-slate-400">€</span> Declaração de receita
          </h3>
          <p className="mt-1 text-sm text-muted">
            Selecione aqui a(s) categoria(s) em que normalmente declara o seu volume de negócios ao Urssaf.
          </p>
          <div className="mt-4 space-y-3">
            {categories.map((cat) => (
              <label className="flex cursor-pointer items-start gap-3" key={cat.key}>
                <input
                  checked={selected.has(cat.key)}
                  className="mt-0.5 h-4 w-4 shrink-0 rounded accent-[#0075EB]"
                  onChange={() => toggle(cat.key)}
                  type="checkbox"
                />
                <span>
                  <span className="block text-sm font-medium text-ink">{cat.label}</span>
                  <span className="block text-sm text-muted">{cat.desc}</span>
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Aviso imposto final */}
        <div className="mt-6 flex items-start gap-3 rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-200">
          <svg className="mt-0.5 shrink-0 text-amber-600" fill="none" height="20" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24" width="20">
            <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
            <line x1="12" x2="12" y1="9" y2="13" />
            <line x1="12" x2="12" y1="17" y2="17" />
          </svg>
          <div>
            <p className="font-semibold text-amber-800">Imposto final</p>
            <p className="mt-1 text-sm text-amber-700">Nossa ferramenta não leva em consideração o cálculo do seu imposto retido na fonte.</p>
          </div>
        </div>

        <div className="my-8 border-t border-line" />

        <p className="text-center text-sm text-muted">
          Você poderá <span className="font-medium text-ink">alterar</span> essas informações posteriormente nas <span className="font-medium text-ink">configurações</span> da sua conta.
        </p>

        <div className="mt-6 flex justify-center">
          <Button disabled={!valid} onClick={submit} type="button">
            {saved ? "Configuração salva" : "Acesse a declaração"}
          </Button>
        </div>
      </section>
    </main>
  );
}
