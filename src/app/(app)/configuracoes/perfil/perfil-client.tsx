"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { fiscalConfig } from "@/config/fiscal";
import { createClient } from "@/lib/supabase/client";
import {
  categoryLabels,
  vatRegimeLabels,
  type ActivityCategory,
  type Profile,
  type VatRegime
} from "@/lib/types";
import { formatSiret, profileSchema } from "@/lib/validation";

type ProfileFormState = {
  nome: string;
  prenom: string;
  adresse_rue: string;
  adresse_cp: string;
  adresse_ville: string;
  siret: string;
  code_ape: string;
  regime_tva: VatRegime;
  activite_principale: ActivityCategory;
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
    regime_tva: profile?.regime_tva ?? "franchise",
    activite_principale: profile?.activite_principale ?? "service_bic",
    acre: profile?.acre ?? false,
    versement_liberatoire: profile?.versement_liberatoire ?? false,
    monthly_summary_email: profile?.monthly_summary_email ?? false,
    taux_penalites_retard: String(
      profile?.taux_penalites_retard ?? fiscalConfig.legalDocumentValues.defaultLatePenaltyRate
    ),
    couleur_principale: profile?.couleur_principale ?? ""
  };
}

export function PerfilClient({
  initialProfile,
  userId
}: {
  initialProfile: Profile | null;
  userId: string;
}) {
  const supabase = useMemo(() => createClient(), []);
  const { showToast } = useToast();
  const [profile, setProfile] = useState(initialProfile);
  const [form, setForm] = useState<ProfileFormState>(() => toFormState(initialProfile));
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoSignedUrl, setLogoSignedUrl] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

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
    const { error } = await supabase.storage.from("logos").upload(path, logoFile, {
      cacheControl: "3600",
      upsert: true
    });

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
      const payload = {
        ...parsed.data,
        id: userId,
        logo_url: logoUrl
      };

      const { data, error } = await supabase.from("profiles").upsert(payload).select("*").single();

      if (error) {
        throw error;
      }

      setProfile(data as Profile);
      setLogoFile(null);
      showToast("Perfil fiscal salvo.", "success");
    } catch {
      showToast("Não foi possível salvar o perfil fiscal.", "error");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6">
        <p className="text-sm font-semibold text-brand">Configurações</p>
        <h1 className="mt-2 text-2xl font-semibold text-ink">Perfil fiscal</h1>
        <p className="mt-2 text-sm text-muted">
          Estes dados são necessários para emitir documentos fiscais franceses.
        </p>
      </div>

      <form
        className="grid gap-6 rounded-lg border border-line bg-white p-6 shadow-sm"
        onSubmit={(event) => {
          event.preventDefault();
          void saveProfile();
        }}
      >
        <section className="grid gap-4 sm:grid-cols-2">
          <FieldError error={errors.nome}>
            <label className="text-sm font-medium text-ink">
              Nome
              <Input
                className="mt-2"
                onChange={(event) => setForm((current) => ({ ...current, nome: event.target.value }))}
                value={form.nome}
              />
            </label>
          </FieldError>
          <label className="text-sm font-medium text-ink">
            Prénom
            <Input
              className="mt-2"
              onChange={(event) => setForm((current) => ({ ...current, prenom: event.target.value }))}
              value={form.prenom}
            />
          </label>
        </section>

        <section className="grid gap-4">
          <FieldError error={errors.adresse_rue}>
            <label className="text-sm font-medium text-ink">
              Rua
              <Input
                className="mt-2"
                onChange={(event) =>
                  setForm((current) => ({ ...current, adresse_rue: event.target.value }))
                }
                value={form.adresse_rue}
              />
            </label>
          </FieldError>
          <div className="grid gap-4 sm:grid-cols-3">
            <FieldError error={errors.adresse_cp}>
              <label className="text-sm font-medium text-ink">
                Código postal
                <Input
                  className="mt-2"
                  onChange={(event) =>
                    setForm((current) => ({ ...current, adresse_cp: event.target.value }))
                  }
                  value={form.adresse_cp}
                />
              </label>
            </FieldError>
            <FieldError error={errors.adresse_ville}>
              <label className="text-sm font-medium text-ink sm:col-span-2">
                Cidade
                <Input
                  className="mt-2"
                  onChange={(event) =>
                    setForm((current) => ({ ...current, adresse_ville: event.target.value }))
                  }
                  value={form.adresse_ville}
                />
              </label>
            </FieldError>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2">
          <FieldError error={errors.siret}>
            <label className="text-sm font-medium text-ink">
              SIRET
              <Input
                className="mt-2"
                inputMode="numeric"
                onChange={(event) =>
                  setForm((current) => ({ ...current, siret: formatSiret(event.target.value) }))
                }
                placeholder="000 000 000 000 00"
                value={form.siret}
              />
            </label>
          </FieldError>
          <label className="text-sm font-medium text-ink">
            Código APE
            <Input
              className="mt-2"
              onChange={(event) => setForm((current) => ({ ...current, code_ape: event.target.value }))}
              value={form.code_ape}
            />
          </label>
        </section>

        <section className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium text-ink">
            Regime de TVA
            <Select
              className="mt-2"
              onChange={(event) =>
                setForm((current) => ({ ...current, regime_tva: event.target.value as VatRegime }))
              }
              value={form.regime_tva}
            >
              <option value="franchise">{vatRegimeLabels.franchise}</option>
              <option value="assujetti">{vatRegimeLabels.assujetti}</option>
            </Select>
          </label>
          <label className="text-sm font-medium text-ink">
            Atividade principal
            <Select
              className="mt-2"
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  activite_principale: event.target.value as ActivityCategory
                }))
              }
              value={form.activite_principale}
            >
              <option value="vente">{categoryLabels.vente}</option>
              <option value="service_bic">{categoryLabels.service_bic}</option>
              <option value="service_bnc">{categoryLabels.service_bnc}</option>
            </Select>
          </label>
        </section>

        <section className="grid gap-4 sm:grid-cols-3">
          <label className="flex items-center gap-2 text-sm font-medium text-ink">
            <input
              checked={form.acre}
              onChange={(event) => setForm((current) => ({ ...current, acre: event.target.checked }))}
              type="checkbox"
            />
            ACRE
          </label>
          <label className="flex items-center gap-2 text-sm font-medium text-ink">
            <input
              checked={form.versement_liberatoire}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  versement_liberatoire: event.target.checked
                }))
              }
              type="checkbox"
            />
            Versement libératoire
          </label>
          <label className="flex items-center gap-2 text-sm font-medium text-ink">
            <input
              checked={form.monthly_summary_email}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  monthly_summary_email: event.target.checked
                }))
              }
              type="checkbox"
            />
            Resumo mensal por email
          </label>
        </section>

        <section className="grid gap-4 sm:grid-cols-3">
          <FieldError error={errors.taux_penalites_retard}>
            <label className="text-sm font-medium text-ink">
              Penalidades de atraso (%)
              <Input
                className="mt-2"
                min="0"
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    taux_penalites_retard: event.target.value
                  }))
                }
                step="0.01"
                type="number"
                value={form.taux_penalites_retard}
              />
            </label>
          </FieldError>
        </section>

        <section className="grid gap-4 sm:grid-cols-[1fr_220px]">
          <label className="text-sm font-medium text-ink">
            Logo
            <Input
              accept="image/png,image/jpeg,image/webp"
              className="mt-2"
              onChange={(event) => setLogoFile(event.target.files?.[0] ?? null)}
              type="file"
            />
          </label>
          <label className="text-sm font-medium text-ink">
            Cor principal
            <Input
              className="mt-2"
              onChange={(event) =>
                setForm((current) => ({ ...current, couleur_principale: event.target.value }))
              }
              placeholder="#0f766e"
              value={form.couleur_principale}
            />
          </label>
          {logoSignedUrl ? (
            <div className="sm:col-span-2">
              <p className="mb-2 text-sm font-medium text-ink">Logo atual</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt="Logo do perfil fiscal"
                className="h-20 w-20 rounded-md border border-line object-contain"
                src={logoSignedUrl}
              />
            </div>
          ) : null}
        </section>

        <div className="flex justify-end">
          <Button disabled={isSaving} type="submit">
            {isSaving ? "Salvando..." : "Salvar perfil"}
          </Button>
        </div>
      </form>
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
