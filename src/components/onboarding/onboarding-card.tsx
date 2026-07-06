"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { FormModal } from "@/components/ui/form-modal";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";
import { profileChecklist, profileCompletion } from "@/lib/profile-completeness";
import type { Profile } from "@/lib/types";
import { formatSiret } from "@/lib/validation";

// Onboarding premium: card no dashboard + wizard de 4 passos. Salva apenas em
// colunas existentes de `profiles` (upsert), preservando os demais dados.

type WizardForm = {
  nome: string;
  prenom: string;
  siret: string;
  adresse_rue: string;
  adresse_cp: string;
  adresse_ville: string;
};

const steps = ["Dados da empresa", "Endereço profissional", "Dados de contato", "Confirmação"] as const;

export function OnboardingCard({
  initialProfile,
  userId,
  email
}: {
  initialProfile: Profile | null;
  userId: string;
  email: string;
}) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const { showToast } = useToast();
  const [profile, setProfile] = useState(initialProfile);
  const [dismissed, setDismissed] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState<WizardForm>(() => ({
    nome: initialProfile?.nome ?? "",
    prenom: initialProfile?.prenom ?? "",
    siret: initialProfile?.siret ? formatSiret(initialProfile.siret) : "",
    adresse_rue: initialProfile?.adresse_rue ?? "",
    adresse_cp: initialProfile?.adresse_cp ?? "",
    adresse_ville: initialProfile?.adresse_ville ?? ""
  }));

  const { filled, total } = profileCompletion(profile, Boolean(email));
  const checklist = profileChecklist(profile, Boolean(email));

  if (dismissed || filled >= total) return null;

  function set<K extends keyof WizardForm>(key: K, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function validateStep(current: number): boolean {
    const next: Record<string, string> = {};
    if (current === 0) {
      if (!form.nome.trim()) next.nome = "Informe o nome da empresa.";
      if (form.siret.replace(/\D/g, "").length !== 14) next.siret = "O SIRET deve ter 14 dígitos.";
    } else if (current === 1) {
      if (!form.adresse_rue.trim()) next.adresse_rue = "Informe o endereço.";
      if (!form.adresse_cp.trim()) next.adresse_cp = "Informe o código postal.";
      if (!form.adresse_ville.trim()) next.adresse_ville = "Informe o município.";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function goNext() {
    if (!validateStep(step)) return;
    setStep((s) => Math.min(steps.length - 1, s + 1));
  }

  function goBack() {
    setErrors({});
    setStep((s) => Math.max(0, s - 1));
  }

  function openWizard() {
    setStep(0);
    setErrors({});
    setIsOpen(true);
  }

  async function save() {
    if (!validateStep(0) || !validateStep(1)) {
      showToast("Revise os campos obrigatórios.", "error");
      return;
    }
    setSaving(true);
    // upsert só das colunas do wizard: preserva os demais campos do perfil.
    const { data, error } = await supabase
      .from("profiles")
      .upsert({
        id: userId,
        nome: form.nome.trim(),
        prenom: form.prenom.trim() || null,
        siret: form.siret.replace(/\D/g, ""),
        adresse_rue: form.adresse_rue.trim(),
        adresse_cp: form.adresse_cp.trim(),
        adresse_ville: form.adresse_ville.trim()
      })
      .select("*")
      .single();
    setSaving(false);
    if (error || !data) {
      showToast("Não foi possível salvar. Tente novamente.", "error");
      return;
    }
    setProfile(data as Profile);
    setIsOpen(false);
    showToast("Informações salvas com sucesso.", "success");
    router.refresh();
  }

  const summaryRows: Array<{ label: string; value: string }> = [
    { label: "Nome da empresa", value: form.nome || "—" },
    { label: "Situação jurídica", value: "Micro-entreprise (auto-entrepreneur)" },
    { label: "SIRET", value: form.siret || "—" },
    { label: "Endereço", value: form.adresse_rue || "—" },
    { label: "Código postal", value: form.adresse_cp || "—" },
    { label: "Município", value: form.adresse_ville || "—" },
    { label: "Primeiro nome", value: form.prenom || "—" },
    { label: "E-mail", value: email || "—" }
  ];

  return (
    <>
      <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
        <div className="h-1 bg-gradient-to-r from-[#1D4ED8] to-[#3B82F6]" />
        <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#EAF1FF] text-[#1D4ED8]">
                <svg fill="none" height="18" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24" width="18">
                  <path d="M3 21h18" /><path d="M5 21V7l8-4v18" /><path d="M19 21V11l-6-4" />
                </svg>
              </span>
              <h2 className="text-base font-semibold text-ink">Finalize a configuração da sua empresa</h2>
            </div>
            <p className="mt-2 max-w-xl text-sm text-muted">
              Complete suas informações profissionais para emitir faturas, gerar documentos e manter sua conta pronta para uso.
            </p>
            <div className="mt-3 max-w-xs">
              <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                <span>{filled} de {total} informações preenchidas</span>
                <span className="tabular-nums">{Math.round((filled / total) * 100)}%</span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-[#1D4ED8] transition-all" style={{ width: `${(filled / total) * 100}%` }} />
              </div>
            </div>
          </div>
          <div className="flex shrink-0 flex-col gap-2 sm:items-end">
            <Button onClick={openWizard} type="button">Completar agora</Button>
            <button className="text-xs font-medium text-slate-400 transition hover:text-slate-600" onClick={() => setDismissed(true)} type="button">
              Depois
            </button>
          </div>
        </div>
      </section>

      <FormModal
        description={`Passo ${step + 1} de ${steps.length} · ${steps[step]}`}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Configuração da empresa"
      >
        {/* Stepper */}
        <ol className="mb-6 flex items-center gap-2">
          {steps.map((label, index) => (
            <li className="flex flex-1 items-center gap-2" key={label}>
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition ${
                  index < step ? "bg-[#1D4ED8] text-white" : index === step ? "bg-[#EAF1FF] text-[#1D4ED8] ring-2 ring-[#1D4ED8]" : "bg-slate-100 text-slate-400"
                }`}
              >
                {index < step ? "✓" : index + 1}
              </span>
              {index < steps.length - 1 ? <span className={`h-0.5 flex-1 rounded ${index < step ? "bg-[#1D4ED8]" : "bg-slate-100"}`} /> : null}
            </li>
          ))}
        </ol>

        <div className="grid gap-4">
          {step === 0 ? (
            <>
              <Field error={errors.nome} label="Nome da empresa">
                <Input onChange={(e) => set("nome", e.target.value)} placeholder="ex.: Silva Serviços" value={form.nome} />
              </Field>
              <label className="text-sm font-medium text-ink">
                Situação jurídica
                <Input className="mt-2 bg-slate-50 text-slate-500" disabled readOnly value="Micro-entreprise (auto-entrepreneur)" />
              </label>
              <Field error={errors.siret} label="SIRET">
                <Input inputMode="numeric" onChange={(e) => set("siret", formatSiret(e.target.value))} placeholder="000 000 000 000 00" value={form.siret} />
              </Field>
            </>
          ) : null}

          {step === 1 ? (
            <>
              <Field error={errors.adresse_rue} label="Endereço">
                <Input onChange={(e) => set("adresse_rue", e.target.value)} placeholder="12 rue de la Paix" value={form.adresse_rue} />
              </Field>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="sm:col-span-1">
                  <Field error={errors.adresse_cp} label="Código postal">
                    <Input onChange={(e) => set("adresse_cp", e.target.value)} placeholder="75002" value={form.adresse_cp} />
                  </Field>
                </div>
                <div className="sm:col-span-2">
                  <Field error={errors.adresse_ville} label="Município">
                    <Input onChange={(e) => set("adresse_ville", e.target.value)} placeholder="Paris" value={form.adresse_ville} />
                  </Field>
                </div>
              </div>
            </>
          ) : null}

          {step === 2 ? (
            <>
              <Field label="Primeiro nome">
                <Input onChange={(e) => set("prenom", e.target.value)} placeholder="Bruna" value={form.prenom} />
              </Field>
              <Field label="Nome">
                <Input onChange={(e) => set("nome", e.target.value)} value={form.nome} />
              </Field>
              <label className="text-sm font-medium text-ink">
                E-mail
                <Input className="mt-2 bg-slate-50 text-slate-500" disabled readOnly value={email} />
              </label>
            </>
          ) : null}

          {step === 3 ? (
            <div className="overflow-hidden rounded-xl ring-1 ring-black/5">
              <dl className="divide-y divide-line text-sm">
                {summaryRows.map((row) => (
                  <div className="flex items-center justify-between gap-3 px-4 py-2.5" key={row.label}>
                    <dt className="text-slate-500">{row.label}</dt>
                    <dd className="min-w-0 truncate text-right font-medium text-ink">{row.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ) : null}
        </div>

        <div className="mt-6 flex items-center justify-between gap-3">
          <button
            className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-500 transition hover:bg-slate-100 disabled:opacity-0"
            disabled={step === 0}
            onClick={goBack}
            type="button"
          >
            Voltar
          </button>
          {step < steps.length - 1 ? (
            <Button onClick={goNext} type="button">Continuar</Button>
          ) : (
            <Button disabled={saving} onClick={() => void save()} type="button">
              {saving ? "Salvando…" : "Salvar e continuar"}
            </Button>
          )}
        </div>
      </FormModal>

      {/* checklist compacto (acessível), reflete o estado atual */}
      <span className="sr-only">
        {checklist.map((c) => `${c.label}: ${c.filled ? "preenchido" : "faltando"}`).join(", ")}
      </span>
    </>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm font-medium text-ink">
      {label}
      <div className="mt-2">{children}</div>
      {error ? <p className="mt-1 text-sm text-red-600">{error}</p> : null}
    </label>
  );
}
