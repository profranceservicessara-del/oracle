"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { FormModal } from "@/components/ui/form-modal";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { fiscalConfig } from "@/config/fiscal";
import { createClient } from "@/lib/supabase/client";
import {
  categoryLabels,
  vatRegimeLabels,
  type ActivityCategory,
  type DeclarationPeriodicite,
  type Profile,
  type VatRegime
} from "@/lib/types";
import { validateUpload } from "@/lib/upload-validation";
import { formatSiret, profileSchema } from "@/lib/validation";

type ProfileFormState = {
  nome: string;
  prenom: string;
  adresse_rue: string;
  adresse_cp: string;
  adresse_ville: string;
  siret: string;
  code_ape: string;
  date_debut_activite: string;
  regime_tva: VatRegime;
  activite_principale: ActivityCategory;
  declaration_periodicite: DeclarationPeriodicite;
  acre: boolean;
  versement_liberatoire: boolean;
  monthly_summary_email: boolean;
  taux_penalites_retard: string;
  couleur_principale: string;
};

function toFormState(profile: Profile | null): ProfileFormState {
  return {
    nome: profile?.nome ?? "",
    prenom: profile?.prenom ?? "",
    adresse_rue: profile?.adresse_rue ?? "",
    adresse_cp: profile?.adresse_cp ?? "",
    adresse_ville: profile?.adresse_ville ?? "",
    siret: profile?.siret ? formatSiret(profile.siret) : "",
    code_ape: profile?.code_ape ?? "",
    date_debut_activite: profile?.date_debut_activite ?? "",
    regime_tva: profile?.regime_tva ?? "franchise",
    activite_principale: profile?.activite_principale ?? "service_bic",
    declaration_periodicite: profile?.declaration_periodicite ?? "trimestral",
    acre: profile?.acre ?? false,
    versement_liberatoire: profile?.versement_liberatoire ?? false,
    monthly_summary_email: profile?.monthly_summary_email ?? false,
    taux_penalites_retard: String(
      profile?.taux_penalites_retard ?? fiscalConfig.legalDocumentValues.defaultLatePenaltyRate
    ),
    couleur_principale: profile?.couleur_principale ?? ""
  };
}

function formatDebutActivite(value: string | null): string {
  if (!value) return "—";
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return value;
  const [, year, month, day] = match;
  return `${day}/${month}/${year}`;
}

export function EmpresaClient({ initialProfile, userId }: { initialProfile: Profile | null; userId: string }) {
  const supabase = useMemo(() => createClient(), []);
  const { showToast } = useToast();
  const [profile, setProfile] = useState(initialProfile);
  const [form, setForm] = useState<ProfileFormState>(() => toFormState(initialProfile));
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoSignedUrl, setLogoSignedUrl] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  useEffect(() => {
    async function loadLogo() {
      if (!profile?.logo_url) {
        setLogoSignedUrl(null);
        return;
      }
      const { data } = await supabase.storage.from("logos").createSignedUrl(profile.logo_url, 900);
      setLogoSignedUrl(data?.signedUrl ?? null);
    }
    void loadLogo();
  }, [profile?.logo_url, supabase]);

  async function uploadLogo() {
    if (!logoFile) {
      return profile?.logo_url ?? null;
    }
    const extension = logoFile.name.split(".").pop()?.toLowerCase() || "png";
    const path = `${userId}/${Date.now()}.${extension}`;
    const { error } = await supabase.storage.from("logos").upload(path, logoFile, { cacheControl: "3600", upsert: true });
    if (error) {
      throw new Error("Não foi possível enviar o logo.");
    }
    return path;
  }

  async function saveProfile() {
    const parsed = profileSchema.safeParse(form);
    if (!parsed.success) {
      const nextErrors: Record<string, string> = {};
      parsed.error.issues.forEach((issue) => {
        const key = issue.path[0]?.toString() ?? "form";
        nextErrors[key] = issue.message;
      });
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    setIsSaving(true);
    try {
      const logoUrl = await uploadLogo();
      const { data, error } = await supabase
        .from("profiles")
        .upsert({ ...parsed.data, id: userId, logo_url: logoUrl })
        .select("*")
        .single();
      if (error) throw error;

      setProfile(data as Profile);
      setLogoFile(null);
      setIsEditOpen(false);
      showToast("Dados da empresa salvos.", "success");
    } catch {
      showToast("Não foi possível salvar os dados.", "error");
    } finally {
      setIsSaving(false);
    }
  }

  async function copySiret(value: string) {
    try {
      await navigator.clipboard.writeText(formatSiret(value));
      showToast("SIRET copiado.", "success");
    } catch {
      showToast("Não foi possível copiar o SIRET.", "error");
    }
  }

  const companyName = [profile?.prenom, profile?.nome].filter(Boolean).join(" ");
  const companyAddress = [profile?.adresse_rue, [profile?.adresse_cp, profile?.adresse_ville].filter(Boolean).join(" ")]
    .filter(Boolean)
    .join(", ");
  const activiteValue = profile?.activite_principale
    ? `${categoryLabels[profile.activite_principale]}${profile.code_ape ? ` (${profile.code_ape})` : ""}`
    : "—";
  const debutActiviteValue = formatDebutActivite(profile?.date_debut_activite ?? null);
  const siret = profile?.siret ?? "";
  const infoRows = [
    { label: "Atividade principal", value: activiteValue },
    { label: "Regime de TVA", value: profile ? vatRegimeLabels[profile.regime_tva] : "—" },
    {
      label: "Periodicidade de declaração",
      value: profile ? (profile.declaration_periodicite === "mensal" ? "Mensal" : "Trimestral") : "—"
    }
  ];

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-brand">Configurações</p>
          <h1 className="mt-2 text-2xl font-semibold text-ink">Empresa</h1>
          <p className="mt-2 text-sm text-muted">Dados da sua empresa para emitir documentos fiscais franceses.</p>
        </div>
        <Button onClick={() => setIsEditOpen(true)} type="button" variant="secondary">
          Editar
        </Button>
      </div>

      <section className="relative mb-6 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
        <div className="h-24 bg-[#00153A]" />
        <div className="px-6 pb-6">
          <div className="-mt-10 flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl bg-white ring-1 ring-black/5">
            {logoSignedUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img alt="Logo da empresa" className="h-full w-full object-contain p-2" src={logoSignedUrl} />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img alt="" aria-hidden="true" className="h-full w-full object-contain p-1" src="/illustrations/predio.png" />
            )}
          </div>
          <h2 className="mt-4 text-[26px] font-semibold tracking-tight text-ink" style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}>
            {companyName || "Sua empresa"}
          </h2>
          <p className="mt-1 text-sm text-muted">{companyAddress || "Endereço não informado"}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {siret ? (
              <button
                className="group inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold tabular-nums text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-200"
                onClick={() => void copySiret(siret)}
                title="Copiar SIRET"
                type="button"
              >
                SIRET: {formatSiret(siret)}
                <svg className="text-slate-400 transition group-hover:text-slate-600" fill="none" height="13" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" viewBox="0 0 24 24" width="13">
                  <rect height="13" rx="2" ry="2" width="13" x="9" y="9" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
              </button>
            ) : null}
            <span className="rounded-full bg-[#002D72]/10 px-3 py-1 text-xs font-semibold text-[#002D72]">Micro-entreprise</span>
          </div>
          <dl className="mt-6 divide-y divide-line">
            {infoRows.map((row) => (
              <div className="flex flex-col gap-1 py-3 text-sm sm:flex-row sm:items-center sm:justify-between" key={row.label}>
                <dt className="text-[11px] font-bold uppercase tracking-wide text-slate-900">{row.label}</dt>
                <dd className="font-semibold text-[#1E3A8A] sm:text-right">{row.value}</dd>
              </div>
            ))}
            <div className="flex flex-col gap-1 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
              <dt className="text-[11px] font-bold uppercase tracking-wide text-slate-900">Início da atividade</dt>
              <dd className="flex items-center gap-2 font-semibold text-[#1E3A8A] sm:justify-end">
                {debutActiviteValue}
                <button
                  aria-label="Editar início da atividade"
                  className="inline-flex h-7 w-7 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-[#002D72]"
                  onClick={() => setIsEditOpen(true)}
                  title="Editar início da atividade"
                  type="button"
                >
                  <svg fill="none" height="15" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" viewBox="0 0 24 24" width="15">
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                  </svg>
                </button>
              </dd>
            </div>
          </dl>
        </div>
      </section>

      <FormModal
        description="Estes dados são necessários para emitir documentos fiscais franceses."
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title="Editar dados da empresa"
      >
        <form
          className="grid gap-6"
          onSubmit={(event) => {
            event.preventDefault();
            void saveProfile();
          }}
        >
          <section className="grid gap-4 sm:grid-cols-2">
            <FieldError error={errors.nome}>
              <label className="text-sm font-medium text-ink">
                Nome
                <Input className="mt-2" onChange={(event) => setForm((current) => ({ ...current, nome: event.target.value }))} value={form.nome} />
              </label>
            </FieldError>
            <label className="text-sm font-medium text-ink">
              Prénom
              <Input className="mt-2" onChange={(event) => setForm((current) => ({ ...current, prenom: event.target.value }))} value={form.prenom} />
            </label>
          </section>

          <section className="grid gap-4">
            <FieldError error={errors.adresse_rue}>
              <label className="text-sm font-medium text-ink">
                Adresse
                <Input className="mt-2" onChange={(event) => setForm((current) => ({ ...current, adresse_rue: event.target.value }))} value={form.adresse_rue} />
              </label>
            </FieldError>
            <div className="grid gap-4 sm:grid-cols-3">
              <FieldError error={errors.adresse_cp}>
                <label className="text-sm font-medium text-ink">
                  Code Postal
                  <Input className="mt-2" onChange={(event) => setForm((current) => ({ ...current, adresse_cp: event.target.value }))} value={form.adresse_cp} />
                </label>
              </FieldError>
              <FieldError error={errors.adresse_ville}>
                <label className="text-sm font-medium text-ink sm:col-span-2">
                  Ville
                  <Input className="mt-2" onChange={(event) => setForm((current) => ({ ...current, adresse_ville: event.target.value }))} value={form.adresse_ville} />
                </label>
              </FieldError>
            </div>
          </section>

          <section className="grid gap-4 sm:grid-cols-2">
            <FieldError error={errors.siret}>
              <label className="text-sm font-medium text-ink">
                SIRET
                <Input className="mt-2" inputMode="numeric" onChange={(event) => setForm((current) => ({ ...current, siret: formatSiret(event.target.value) }))} placeholder="000 000 000 000 00" value={form.siret} />
              </label>
            </FieldError>
            <label className="text-sm font-medium text-ink">
              Código APE
              <Input className="mt-2" onChange={(event) => setForm((current) => ({ ...current, code_ape: event.target.value }))} value={form.code_ape} />
            </label>
            <label className="text-sm font-medium text-ink">
              Início da atividade
              <Input className="mt-2" onChange={(event) => setForm((current) => ({ ...current, date_debut_activite: event.target.value }))} type="date" value={form.date_debut_activite} />
            </label>
          </section>

          <section className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium text-ink">
              Regime de TVA
              <Select className="mt-2" onChange={(event) => setForm((current) => ({ ...current, regime_tva: event.target.value as VatRegime }))} value={form.regime_tva}>
                <option value="franchise">{vatRegimeLabels.franchise}</option>
                <option value="assujetti">{vatRegimeLabels.assujetti}</option>
              </Select>
            </label>
            <label className="text-sm font-medium text-ink">
              Atividade principal
              <Select className="mt-2" onChange={(event) => setForm((current) => ({ ...current, activite_principale: event.target.value as ActivityCategory }))} value={form.activite_principale}>
                <option value="vente">{categoryLabels.vente}</option>
                <option value="service_bic">{categoryLabels.service_bic}</option>
                <option value="service_bnc">{categoryLabels.service_bnc}</option>
              </Select>
            </label>
            <label className="text-sm font-medium text-ink">
              Periodicidade de declaração
              <Select className="mt-2" onChange={(event) => setForm((current) => ({ ...current, declaration_periodicite: event.target.value as DeclarationPeriodicite }))} value={form.declaration_periodicite}>
                <option value="trimestral">Trimestral</option>
                <option value="mensal">Mensal</option>
              </Select>
            </label>
          </section>

          <section className="grid gap-4 sm:grid-cols-3">
            <label className="flex items-center gap-2 text-sm font-medium text-ink">
              <input checked={form.acre} onChange={(event) => setForm((current) => ({ ...current, acre: event.target.checked }))} type="checkbox" />
              ACRE
            </label>
            <label className="flex items-center gap-2 text-sm font-medium text-ink">
              <input checked={form.versement_liberatoire} onChange={(event) => setForm((current) => ({ ...current, versement_liberatoire: event.target.checked }))} type="checkbox" />
              Versement libératoire
            </label>
            <label className="flex items-center gap-2 text-sm font-medium text-ink">
              <input checked={form.monthly_summary_email} onChange={(event) => setForm((current) => ({ ...current, monthly_summary_email: event.target.checked }))} type="checkbox" />
              Resumo mensal por email
            </label>
          </section>

          <section className="grid gap-4 sm:grid-cols-3">
            <FieldError error={errors.taux_penalites_retard}>
              <label className="text-sm font-medium text-ink">
                Penalidades de atraso (%)
                <Input className="mt-2" min="0" onChange={(event) => setForm((current) => ({ ...current, taux_penalites_retard: event.target.value }))} step="0.01" type="number" value={form.taux_penalites_retard} />
              </label>
            </FieldError>
          </section>

          <section className="grid gap-4 sm:grid-cols-[1fr_220px]">
            <label className="text-sm font-medium text-ink">
              Logo
              <Input
                accept="image/png,image/jpeg,image/webp"
                className="mt-2"
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  if (file) {
                    const validationError = validateUpload(file, "logo");
                    if (validationError) {
                      showToast(validationError, "error");
                      event.target.value = "";
                      setLogoFile(null);
                      return;
                    }
                  }
                  setLogoFile(file);
                }}
                type="file"
              />
            </label>
            <label className="text-sm font-medium text-ink">
              Cor principal
              <Input className="mt-2" onChange={(event) => setForm((current) => ({ ...current, couleur_principale: event.target.value }))} placeholder="#0f766e" value={form.couleur_principale} />
            </label>
            {logoSignedUrl ? (
              <div className="sm:col-span-2">
                <p className="mb-2 text-sm font-medium text-ink">Logo atual</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img alt="Logo da empresa" className="h-20 w-20 rounded-md border border-line object-contain" src={logoSignedUrl} />
              </div>
            ) : null}
          </section>

          <div className="flex justify-end">
            <Button disabled={isSaving} type="submit">
              {isSaving ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </FormModal>
    </main>
  );
}

function FieldError({ children, error }: { children: React.ReactNode; error?: string }) {
  return (
    <div>
      {children}
      {error ? <p className="mt-1 text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
