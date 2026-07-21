"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FormModal } from "@/components/ui/form-modal";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { t, type Locale } from "@/lib/i18n/dictionaries";
import { createClient } from "@/lib/supabase/client";
import type { DealWithClient } from "@/lib/crm/queries";
import type { CrmClient, CrmCompany, CrmDealStage, CrmDealStatus } from "@/lib/crm/types";

const STAGES: Array<{ key: CrmDealStage; label: string; accent: string }> = [
  { key: "lead", label: "Lead", accent: "from-slate-300 to-slate-400" },
  { key: "qualified", label: "Qualificado", accent: "from-sky-300 to-sky-400" },
  { key: "proposal", label: "Proposta", accent: "from-indigo-300 to-indigo-400" },
  { key: "won", label: "Ganho", accent: "from-emerald-300 to-emerald-400" },
  { key: "lost", label: "Perdido", accent: "from-rose-300 to-rose-400" }
];

const stageBadge: Record<CrmDealStage, string> = {
  lead: "bg-slate-100 text-slate-600",
  qualified: "bg-sky-100 text-sky-700",
  proposal: "bg-indigo-100 text-indigo-700",
  won: "bg-emerald-100 text-emerald-700",
  lost: "bg-rose-100 text-rose-700"
};

const CURRENCIES = ["EUR", "USD", "GBP", "CHF"];

function stageStatus(stage: CrmDealStage): CrmDealStatus {
  if (stage === "won") return "won";
  if (stage === "lost") return "lost";
  return "open";
}

type DealForm = {
  title: string;
  client_id: string;
  value: string;
  currency: string;
  stage: CrmDealStage;
  expected_close_date: string;
  description: string;
};

const emptyForm: DealForm = {
  title: "",
  client_id: "",
  value: "",
  currency: "EUR",
  stage: "lead",
  expected_close_date: "",
  description: ""
};

export function PipelineClient({
  clients,
  company,
  initialDeals,
  locale
}: {
  clients: CrmClient[];
  company: CrmCompany | null;
  initialDeals: DealWithClient[];
  locale: Locale;
}) {
  const supabase = useMemo(() => createClient(), []);
  const { showToast } = useToast();
  const [deals, setDeals] = useState<DealWithClient[]>(initialDeals);
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<DealForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [confirmDeal, setConfirmDeal] = useState<DealWithClient | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const inFlight = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!confirmDeal) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !confirmBusy) setConfirmDeal(null);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [confirmDeal, confirmBusy]);

  function money(cents: number, currency: string): string {
    try {
      return new Intl.NumberFormat(locale === "pt" ? "pt-BR" : "fr-FR", { style: "currency", currency: currency || "EUR" }).format(
        (Number(cents) || 0) / 100
      );
    } catch {
      return `${((Number(cents) || 0) / 100).toFixed(2)} ${currency || "EUR"}`;
    }
  }

  function clientName(deal: DealWithClient): string | null {
    return deal.crm_clients?.name ?? null;
  }

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setIsOpen(true);
  }

  function openEdit(deal: DealWithClient) {
    setEditingId(deal.id);
    setForm({
      title: deal.title,
      client_id: deal.client_id ?? "",
      value: deal.value_cents ? (deal.value_cents / 100).toString() : "",
      currency: deal.currency || "EUR",
      stage: deal.stage,
      expected_close_date: deal.expected_close_date ?? "",
      description: deal.description ?? ""
    });
    setIsOpen(true);
  }

  async function saveDeal(event: React.FormEvent) {
    event.preventDefault();
    if (!company || !form.title.trim() || saving) return;
    const valueCents = Math.max(0, Math.round((Number(form.value.replace(",", ".")) || 0) * 100));
    const payload = {
      company_id: company.id,
      client_id: form.client_id || null,
      title: form.title.trim(),
      description: form.description.trim() || null,
      value_cents: valueCents,
      currency: form.currency || "EUR",
      stage: form.stage,
      status: stageStatus(form.stage),
      expected_close_date: form.expected_close_date || null
    };
    setSaving(true);

    if (editingId) {
      const { data, error } = await supabase.from("crm_deals").update(payload).eq("id", editingId).select("*, crm_clients(name)").single();
      setSaving(false);
      if (error || !data) {
        showToast(t(locale, "detail.saveError"), "error");
        return;
      }
      setDeals((current) => current.map((d) => (d.id === editingId ? (data as DealWithClient) : d)));
      setIsOpen(false);
      showToast(t(locale, "detail.saved"), "success");
      return;
    }

    const { data, error } = await supabase.from("crm_deals").insert(payload).select("*, crm_clients(name)").single();
    setSaving(false);
    if (error || !data) {
      showToast(t(locale, "detail.addError"), "error");
      return;
    }
    setDeals((current) => [data as DealWithClient, ...current]);
    setIsOpen(false);
    showToast(t(locale, "detail.saved"), "success");
  }

  // ---- Undo (usa a ação do toast; não destrutivo) --------------------------
  const undoLabel = locale === "pt" ? "Desfazer" : "Annuler";

  async function applyStage(dealId: string, stage: CrmDealStage): Promise<boolean> {
    const { data, error } = await supabase
      .from("crm_deals")
      .update({ stage, status: stageStatus(stage) })
      .eq("id", dealId)
      .select("*, crm_clients(name)")
      .single();
    if (error || !data) {
      showToast(t(locale, "detail.saveError"), "error");
      return false;
    }
    setDeals((current) => current.map((d) => (d.id === dealId ? (data as DealWithClient) : d)));
    return true;
  }

  async function moveStage(deal: DealWithClient, direction: -1 | 1) {
    const key = `move:${deal.id}`;
    if (inFlight.current.has(key)) return;
    const index = STAGES.findIndex((s) => s.key === deal.stage);
    const next = STAGES[index + direction];
    if (!next) return;
    const prevStage = deal.stage;
    inFlight.current.add(key);
    const ok = await applyStage(deal.id, next.key);
    inFlight.current.delete(key);
    if (ok) {
      showToast(locale === "pt" ? "Etapa alterada." : "Étape modifiée.", "success", {
        action: { label: undoLabel, onClick: () => void applyStage(deal.id, prevStage) }
      });
    }
  }

  // Reinsere o negócio excluído (restaura dados; novo id). Sem alterar schema.
  async function restoreDeal(deal: DealWithClient) {
    const { data, error } = await supabase
      .from("crm_deals")
      .insert({
        company_id: deal.company_id,
        client_id: deal.client_id,
        title: deal.title,
        description: deal.description,
        value_cents: deal.value_cents,
        currency: deal.currency,
        stage: deal.stage,
        status: deal.status,
        expected_close_date: deal.expected_close_date
      })
      .select("*, crm_clients(name)")
      .single();
    if (error || !data) {
      showToast(t(locale, "detail.saveError"), "error");
      return;
    }
    setDeals((current) => [data as DealWithClient, ...current]);
  }

  async function confirmDeleteDeal() {
    if (!confirmDeal || confirmBusy) return;
    const removed = confirmDeal;
    setConfirmBusy(true);
    const { error } = await supabase.from("crm_deals").delete().eq("id", removed.id);
    setConfirmBusy(false);
    if (error) {
      showToast(t(locale, "detail.deleteError"), "error");
      return;
    }
    setDeals((current) => current.filter((d) => d.id !== removed.id));
    setConfirmDeal(null);
    showToast(locale === "pt" ? "Negócio excluído." : "Affaire supprimée.", "success", {
      action: { label: undoLabel, onClick: () => void restoreDeal(removed) }
    });
  }

  if (!company) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-8">
        <div className="rounded-2xl bg-amber-50 p-5 text-sm text-amber-800 ring-1 ring-amber-200">{t(locale, "crm.bootError")}</div>
      </main>
    );
  }

  const dealsByStage = (stage: CrmDealStage) => deals.filter((d) => d.stage === stage);
  const stageTotal = (stage: CrmDealStage) => dealsByStage(stage).reduce((sum, d) => sum + (Number(d.value_cents) || 0), 0);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <Link className="text-sm font-semibold text-muted transition hover:text-ink" href="/crm">
            ← {t(locale, "crm.clients")}
          </Link>
          <h1 className="mt-1 text-2xl font-semibold text-ink">Pipeline</h1>
          <p className="mt-1 text-sm text-muted">Acompanhe oportunidades, propostas e negócios em andamento.</p>
        </div>
        <Button onClick={openCreate} type="button">
          + Novo negócio
        </Button>
      </div>

      {deals.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl bg-white px-6 py-16 text-center shadow-sm ring-1 ring-black/5">
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 text-slate-400 ring-1 ring-black/5">
            <svg fill="none" height="28" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" viewBox="0 0 24 24" width="28">
              <path d="M3 3v18h18" />
              <path d="M18 9l-5 5-3-3-4 4" />
            </svg>
          </span>
          <h2 className="mt-5 text-lg font-semibold text-ink">Nenhum negócio cadastrado.</h2>
          <Button className="mt-6" onClick={openCreate} type="button">
            + Novo negócio
          </Button>
        </div>
      ) : (
        <div className="-mx-4 overflow-x-auto px-4 pb-2">
          <div className="flex min-w-max gap-4">
            {STAGES.map((stage) => {
              const columnDeals = dealsByStage(stage.key);
              const index = STAGES.findIndex((s) => s.key === stage.key);
              return (
                <div className="flex w-72 shrink-0 flex-col rounded-2xl bg-white shadow-sm ring-1 ring-black/5" key={stage.key}>
                  <div className={`h-1 rounded-t-2xl bg-gradient-to-r ${stage.accent}`} />
                  <div className="flex items-center justify-between gap-2 px-4 py-3">
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-semibold text-ink">{stage.label}</h2>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-slate-600">{columnDeals.length}</span>
                    </div>
                    <span className="text-xs font-semibold tabular-nums text-slate-500">{money(stageTotal(stage.key), "EUR")}</span>
                  </div>
                  <div className="flex flex-1 flex-col gap-2 px-3 pb-3">
                    {columnDeals.length === 0 ? (
                      <p className="rounded-xl bg-slate-50 px-3 py-6 text-center text-xs text-muted ring-1 ring-black/5">Nenhum negócio nesta etapa.</p>
                    ) : (
                      columnDeals.map((deal) => (
                        <div className="group rounded-xl bg-white p-3 shadow-sm ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:shadow-md" key={deal.id}>
                          <div className="flex items-start justify-between gap-2">
                            <p className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">{deal.title}</p>
                            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${stageBadge[deal.stage]}`}>{stage.label}</span>
                          </div>
                          {clientName(deal) ? <p className="mt-0.5 truncate text-xs text-muted">{clientName(deal)}</p> : null}
                          <div className="mt-2 flex items-center justify-between gap-2">
                            <span className="rounded-lg bg-slate-50 px-2 py-0.5 text-xs font-semibold tabular-nums text-ink ring-1 ring-black/5">
                              {money(deal.value_cents, deal.currency)}
                            </span>
                            {deal.expected_close_date ? <span className="text-[11px] text-muted">📅 {deal.expected_close_date}</span> : null}
                          </div>
                          <div className="mt-2.5 flex items-center justify-between gap-1 border-t border-line pt-2">
                            <div className="flex items-center gap-0.5">
                              <button
                                aria-label="Etapa anterior"
                                className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-ink disabled:opacity-30"
                                disabled={index === 0}
                                onClick={() => void moveStage(deal, -1)}
                                title="Etapa anterior"
                                type="button"
                              >
                                <svg fill="none" height="15" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="15"><path d="m15 18-6-6 6-6" /></svg>
                              </button>
                              <button
                                aria-label="Próxima etapa"
                                className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-ink disabled:opacity-30"
                                disabled={index === STAGES.length - 1}
                                onClick={() => void moveStage(deal, 1)}
                                title="Próxima etapa"
                                type="button"
                              >
                                <svg fill="none" height="15" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="15"><path d="m9 18 6-6-6-6" /></svg>
                              </button>
                            </div>
                            <div className="flex items-center gap-0.5">
                              <button aria-label={t(locale, "detail.edit")} className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-ink" onClick={() => openEdit(deal)} title={t(locale, "detail.edit")} type="button">
                                <svg fill="none" height="14" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24" width="14"><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" /></svg>
                              </button>
                              <button aria-label={t(locale, "detail.delete")} className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-600" onClick={() => setConfirmDeal(deal)} title={t(locale, "detail.delete")} type="button">
                                <svg fill="none" height="14" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24" width="14"><path d="M3 6h18" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <FormModal
        description="Cadastre uma oportunidade e acompanhe pela etapa."
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={editingId ? "Editar negócio" : "Novo negócio"}
      >
        <form className="grid gap-4" onSubmit={(event) => void saveDeal(event)}>
          <label className="text-sm font-medium text-ink">
            Título
            <Input className="mt-2" onChange={(event) => setForm((c) => ({ ...c, title: event.target.value }))} required value={form.title} />
          </label>
          <label className="text-sm font-medium text-ink">
            Cliente comercial
            <Select className="mt-2" onChange={(event) => setForm((c) => ({ ...c, client_id: event.target.value }))} value={form.client_id}>
              <option value="">—</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </Select>
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium text-ink">
              Valor
              <Input className="mt-2" inputMode="decimal" onChange={(event) => setForm((c) => ({ ...c, value: event.target.value }))} placeholder="0,00" value={form.value} />
            </label>
            <label className="text-sm font-medium text-ink">
              Moeda
              <Select className="mt-2" onChange={(event) => setForm((c) => ({ ...c, currency: event.target.value }))} value={form.currency}>
                {CURRENCIES.map((cur) => (
                  <option key={cur} value={cur}>
                    {cur}
                  </option>
                ))}
              </Select>
            </label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium text-ink">
              Etapa
              <Select className="mt-2" onChange={(event) => setForm((c) => ({ ...c, stage: event.target.value as CrmDealStage }))} value={form.stage}>
                {STAGES.map((stage) => (
                  <option key={stage.key} value={stage.key}>
                    {stage.label}
                  </option>
                ))}
              </Select>
            </label>
            <label className="text-sm font-medium text-ink">
              Data prevista de fechamento
              <Input className="mt-2" onChange={(event) => setForm((c) => ({ ...c, expected_close_date: event.target.value }))} type="date" value={form.expected_close_date} />
            </label>
          </div>
          <label className="text-sm font-medium text-ink">
            Descrição
            <Textarea className="mt-2" onChange={(event) => setForm((c) => ({ ...c, description: event.target.value }))} value={form.description} />
          </label>
          <div className="flex justify-end gap-2">
            <Button onClick={() => setIsOpen(false)} type="button" variant="secondary">
              {t(locale, "detail.cancel")}
            </Button>
            <Button disabled={saving || !form.title.trim()} type="submit">
              {saving ? t(locale, "crm.creating") : t(locale, "detail.save")}
            </Button>
          </div>
        </form>
      </FormModal>

      {confirmDeal ? (
        <div aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 py-8 backdrop-blur-sm" role="dialog">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-black/5">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-600 ring-1 ring-rose-100">
                <svg fill="none" height="18" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24" width="18"><path d="M3 6h18" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
              </span>
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-ink">{t(locale, "detail.delete")}</h2>
                <p className="mt-1 text-sm text-muted">{t(locale, "detail.deleteConfirm")}</p>
                <p className="mt-2 truncate rounded-lg bg-slate-50 px-3 py-1.5 text-sm font-medium text-ink ring-1 ring-black/5">{confirmDeal.title}</p>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <Button disabled={confirmBusy} onClick={() => setConfirmDeal(null)} type="button" variant="secondary">
                {t(locale, "detail.cancel")}
              </Button>
              <button
                className="inline-flex min-w-[6rem] items-center justify-center rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={confirmBusy}
                onClick={() => void confirmDeleteDeal()}
                type="button"
              >
                {confirmBusy ? "…" : t(locale, "detail.delete")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
