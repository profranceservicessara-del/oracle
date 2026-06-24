"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FormModal } from "@/components/ui/form-modal";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";
import type { CrmClient, CrmClientType, CrmCompany } from "@/lib/crm/types";

const emptyForm = { name: "", type: "professionnel" as CrmClientType, email: "", phone: "" };

export function CrmClientsClient({
  company,
  initialClients
}: {
  company: CrmCompany | null;
  initialClients: CrmClient[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const { showToast } = useToast();
  const [clients, setClients] = useState(initialClients);
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  async function createCrmClient(event: React.FormEvent) {
    event.preventDefault();
    if (!company || !form.name.trim()) {
      return;
    }

    setIsSaving(true);
    const { data, error } = await supabase
      .from("crm_clients")
      .insert({
        company_id: company.id,
        email: form.email.trim() || null,
        name: form.name.trim(),
        phone: form.phone.trim() || null,
        type: form.type
      })
      .select("*")
      .single();
    setIsSaving(false);

    if (error || !data) {
      showToast("Impossible de créer le client.", "error");
      return;
    }

    setClients((current) => [data as CrmClient, ...current]);
    setForm(emptyForm);
    setIsOpen(false);
    showToast("Client créé.", "success");
  }

  if (!company) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-8">
        <div className="rounded-2xl bg-amber-50 p-5 text-sm text-amber-800 ring-1 ring-amber-200">
          Impossible d&apos;initialiser votre espace CRM. Rechargez la page ou réessayez plus tard.
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">CRM · {company.name}</p>
          <h1 className="mt-1 text-2xl font-semibold text-ink">Clients</h1>
        </div>
        <Button onClick={() => setIsOpen(true)} type="button">
          + Nouveau client
        </Button>
      </div>

      {clients.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl bg-white px-6 py-16 text-center shadow-sm ring-1 ring-black/5">
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 text-slate-400 ring-1 ring-black/5">
            <svg fill="none" height="28" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" viewBox="0 0 24 24" width="28">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
            </svg>
          </span>
          <h2 className="mt-5 text-lg font-semibold text-ink">Aucun client pour le moment</h2>
          <p className="mt-2 max-w-sm text-sm text-muted">Ajoutez votre premier client pour commencer votre CRM.</p>
          <Button className="mt-6" onClick={() => setIsOpen(true)} type="button">
            + Nouveau client
          </Button>
        </div>
      ) : (
        <div className="divide-y divide-line overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
          {clients.map((client) => (
            <Link
              className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 transition hover:bg-slate-50"
              href={`/crm/${client.id}`}
              key={client.id}
            >
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#002D72]/10 text-sm font-semibold text-[#002D72]">
                  {client.name.trim()[0]?.toUpperCase() ?? "?"}
                </span>
                <div className="min-w-0">
                  <p className="font-medium text-ink">{client.name}</p>
                  <p className="text-xs text-muted">{client.email || client.phone || "—"}</p>
                </div>
              </div>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200">
                {client.type === "particulier" ? "Particulier" : "Professionnel"}
              </span>
            </Link>
          ))}
        </div>
      )}

      <FormModal
        description="Ajoutez un client à votre CRM."
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Nouveau client"
      >
        <form className="grid gap-4" onSubmit={(event) => void createCrmClient(event)}>
          <label className="text-sm font-medium text-ink">
            Nom
            <Input
              className="mt-2"
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              required
              value={form.name}
            />
          </label>
          <label className="text-sm font-medium text-ink">
            Type
            <Select
              className="mt-2"
              onChange={(event) =>
                setForm((current) => ({ ...current, type: event.target.value as CrmClientType }))
              }
              value={form.type}
            >
              <option value="professionnel">Professionnel</option>
              <option value="particulier">Particulier</option>
            </Select>
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium text-ink">
              Email
              <Input
                className="mt-2"
                onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                type="email"
                value={form.email}
              />
            </label>
            <label className="text-sm font-medium text-ink">
              Téléphone
              <Input
                className="mt-2"
                onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                value={form.phone}
              />
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <Button onClick={() => setIsOpen(false)} type="button" variant="secondary">
              Annuler
            </Button>
            <Button disabled={isSaving || !form.name.trim()} type="submit">
              {isSaving ? "Création..." : "Créer"}
            </Button>
          </div>
        </form>
      </FormModal>
    </main>
  );
}
