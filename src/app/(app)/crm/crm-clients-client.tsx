"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FormModal } from "@/components/ui/form-modal";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { logActivity } from "@/lib/crm/activity";
import { t, type Locale } from "@/lib/i18n/dictionaries";
import { createClient } from "@/lib/supabase/client";
import type { CrmClient, CrmClientType, CrmCompany } from "@/lib/crm/types";

const emptyForm = { email: "", name: "", phone: "", type: "professionnel" as CrmClientType };

// Tamanho de página (espelha CRM_PAGE_SIZE do server em queries.ts). Definido
// local porque queries.ts é server-only (importa supabase/server) e não pode
// entrar no bundle client.
const CRM_PAGE_SIZE = 20;

// Sanitiza termo p/ o filtro .or() do PostgREST (evita quebra de sintaxe).
function sanitizeSearch(term: string): string {
  return term.replace(/[%,()*]/g, " ").trim();
}

export function CrmClientsClient({
  company,
  initialClients,
  locale,
  userId
}: {
  company: CrmCompany | null;
  initialClients: CrmClient[];
  locale: Locale;
  userId: string;
}) {
  const supabase = useMemo(() => createClient(), []);
  const { showToast } = useToast();
  const [clients, setClients] = useState(initialClients);
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | CrmClientType>("all");
  const [showArchived, setShowArchived] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(initialClients.length >= CRM_PAGE_SIZE);

  const isFiltered = Boolean(search.trim() || typeFilter !== "all" || showArchived);
  const loadMoreLabel = locale === "pt" ? "Carregar mais" : "Charger plus";
  const loadingLabel = locale === "pt" ? "Carregando…" : "Chargement…";

  // Busca server-side (browser client, RLS por company_member). Mesmos filtros
  // do helper listCrmClients — aqui p/ paginação/busca reativa no client.
  const fetchPage = useCallback(
    async (offset: number): Promise<{ rows: CrmClient[]; error: boolean }> => {
      if (!company) return { rows: [], error: false };
      let query = supabase.from("crm_clients").select("*").eq("company_id", company.id);
      if (!showArchived) query = query.eq("archived", false);
      if (typeFilter !== "all") query = query.eq("type", typeFilter);
      const term = sanitizeSearch(search);
      if (term) query = query.or(`name.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%`);
      const { data, error } = await query
        .order("created_at", { ascending: false })
        .range(offset, offset + CRM_PAGE_SIZE - 1);
      return { rows: (data ?? []) as CrmClient[], error: Boolean(error) };
    },
    [company, showArchived, typeFilter, search, supabase]
  );

  // Refetch da página 0 quando busca/filtros mudam (debounce). Pula o mount
  // inicial (usa initialClients do SSR) para evitar flicker.
  const isFirst = useRef(true);
  useEffect(() => {
    if (isFirst.current) {
      isFirst.current = false;
      return;
    }
    const handle = setTimeout(async () => {
      setLoading(true);
      const { rows, error } = await fetchPage(0);
      setLoading(false);
      if (error) {
        showToast(t(locale, "crm.createError"), "error");
        return;
      }
      setClients(rows);
      setHasMore(rows.length >= CRM_PAGE_SIZE);
    }, 300);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, typeFilter, showArchived]);

  async function loadMore() {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const { rows, error } = await fetchPage(clients.length);
    setLoadingMore(false);
    if (error) {
      showToast(t(locale, "crm.createError"), "error");
      return;
    }
    setClients((current) => {
      const seen = new Set(current.map((c) => c.id));
      return [...current, ...rows.filter((r) => !seen.has(r.id))];
    });
    setHasMore(rows.length >= CRM_PAGE_SIZE);
  }

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
      showToast(t(locale, "crm.createError"), "error");
      return;
    }

    const created = data as CrmClient;
    setClients((current) => [created, ...current]);
    setForm(emptyForm);
    setIsOpen(false);
    showToast(t(locale, "crm.created"), "success");
    void logActivity(supabase, {
      action: "create",
      clientId: created.id,
      companyId: company.id,
      entity: "client",
      entityId: created.id,
      label: created.name,
      userId
    });
  }

  async function unarchiveClient(client: CrmClient) {
    const { error } = await supabase.from("crm_clients").update({ archived: false }).eq("id", client.id);
    if (error) {
      showToast(t(locale, "crm.createError"), "error");
      return;
    }
    setClients((current) => current.map((c) => (c.id === client.id ? { ...c, archived: false } : c)));
    showToast(t(locale, "crm.unarchived"), "success");
  }

  if (!company) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-8">
        <div className="rounded-2xl bg-amber-50 p-5 text-sm text-amber-800 ring-1 ring-amber-200">
          {t(locale, "crm.bootError")}
        </div>
      </main>
    );
  }

  const showFullEmpty = clients.length === 0 && !isFiltered && !loading;

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{t(locale, "crm.subtitle")} · {company.name}</p>
          <h1 className="mt-1 text-2xl font-semibold text-ink">{t(locale, "crm.clients")}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            className="inline-flex h-11 items-center gap-2 rounded-2xl bg-white px-4 text-sm font-semibold text-ink shadow-sm ring-1 ring-black/5 transition hover:bg-slate-50"
            href="/crm/agenda"
          >
            <svg fill="none" height="16" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" viewBox="0 0 24 24" width="16">
              <rect height="18" rx="2" ry="2" width="18" x="3" y="4" />
              <path d="M16 2v4M8 2v4M3 10h18" />
            </svg>
            {t(locale, "crm.agenda")}
          </Link>
          <Button onClick={() => setIsOpen(true)} type="button">
            {t(locale, "crm.newClient")}
          </Button>
        </div>
      </div>

      {showFullEmpty ? (
        <div className="flex flex-col items-center rounded-2xl bg-white px-6 py-16 text-center shadow-sm ring-1 ring-black/5">
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 text-slate-400 ring-1 ring-black/5">
            <svg fill="none" height="28" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" viewBox="0 0 24 24" width="28">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
            </svg>
          </span>
          <h2 className="mt-5 text-lg font-semibold text-ink">{t(locale, "crm.emptyTitle")}</h2>
          <p className="mt-2 max-w-sm text-sm text-muted">{t(locale, "crm.emptyHint")}</p>
          <Button className="mt-6" onClick={() => setIsOpen(true)} type="button">
            {t(locale, "crm.newClient")}
          </Button>
        </div>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Input
              aria-label={t(locale, "crm.search")}
              className="min-w-[12rem] flex-1"
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t(locale, "crm.search")}
              value={search}
            />
            <Select
              aria-label={t(locale, "crm.type")}
              className="w-[12rem]"
              onChange={(event) => setTypeFilter(event.target.value as "all" | CrmClientType)}
              value={typeFilter}
            >
              <option value="all">{t(locale, "crm.filterAll")}</option>
              <option value="professionnel">{t(locale, "crm.professional")}</option>
              <option value="particulier">{t(locale, "crm.particular")}</option>
            </Select>
            <label className="flex cursor-pointer items-center gap-2 rounded-2xl bg-white px-3 py-2 text-sm font-medium text-slate-600 ring-1 ring-black/5">
              <input checked={showArchived} className="h-4 w-4 accent-[#002D72]" onChange={(event) => setShowArchived(event.target.checked)} type="checkbox" />
              {t(locale, "crm.showArchived")}
            </label>
          </div>

          {loading ? (
            <div className="rounded-2xl bg-white px-6 py-12 text-center text-sm text-muted shadow-sm ring-1 ring-black/5">
              {loadingLabel}
            </div>
          ) : clients.length === 0 ? (
            <div className="rounded-2xl bg-white px-6 py-12 text-center text-sm text-muted shadow-sm ring-1 ring-black/5">
              {t(locale, "crm.noResults")}
            </div>
          ) : (
            <>
              <div className="divide-y divide-line overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
                {clients.map((client) => (
                  <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 transition hover:bg-slate-50" key={client.id}>
                    <Link className="flex min-w-0 flex-1 items-center gap-3" href={`/crm/${client.id}`}>
                      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${client.archived ? "bg-slate-100 text-slate-400" : "bg-[#002D72]/10 text-[#002D72]"}`}>
                        {client.name.trim()[0]?.toUpperCase() ?? "?"}
                      </span>
                      <div className="min-w-0">
                        <p className={`font-medium ${client.archived ? "text-slate-400" : "text-ink"}`}>{client.name}</p>
                        <p className="text-xs text-muted">{client.email || client.phone || "—"}</p>
                      </div>
                    </Link>
                    <div className="flex shrink-0 items-center gap-2">
                      {client.archived ? (
                        <>
                          <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700 ring-1 ring-amber-200">
                            {t(locale, "crm.archivedBadge")}
                          </span>
                          <Button onClick={() => void unarchiveClient(client)} type="button" variant="secondary">
                            {t(locale, "crm.unarchive")}
                          </Button>
                        </>
                      ) : (
                        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200">
                          {client.type === "particulier" ? t(locale, "crm.particular") : t(locale, "crm.professional")}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {hasMore ? (
                <div className="mt-4 flex justify-center">
                  <Button disabled={loadingMore} onClick={() => void loadMore()} type="button" variant="secondary">
                    {loadingMore ? loadingLabel : loadMoreLabel}
                  </Button>
                </div>
              ) : null}
            </>
          )}
        </>
      )}

      <FormModal
        description={t(locale, "crm.modalDesc")}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={t(locale, "crm.modalTitle")}
      >
        <form className="grid gap-4" onSubmit={(event) => void createCrmClient(event)}>
          <label className="text-sm font-medium text-ink">
            {t(locale, "crm.name")}
            <Input
              className="mt-2"
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              required
              value={form.name}
            />
          </label>
          <label className="text-sm font-medium text-ink">
            {t(locale, "crm.type")}
            <Select
              className="mt-2"
              onChange={(event) => setForm((current) => ({ ...current, type: event.target.value as CrmClientType }))}
              value={form.type}
            >
              <option value="professionnel">{t(locale, "crm.professional")}</option>
              <option value="particulier">{t(locale, "crm.particular")}</option>
            </Select>
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium text-ink">
              {t(locale, "crm.email")}
              <Input
                className="mt-2"
                onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                type="email"
                value={form.email}
              />
            </label>
            <label className="text-sm font-medium text-ink">
              {t(locale, "crm.phone")}
              <Input
                className="mt-2"
                onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                value={form.phone}
              />
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <Button onClick={() => setIsOpen(false)} type="button" variant="secondary">
              {t(locale, "crm.cancel")}
            </Button>
            <Button disabled={isSaving || !form.name.trim()} type="submit">
              {isSaving ? t(locale, "crm.creating") : t(locale, "crm.create")}
            </Button>
          </div>
        </form>
      </FormModal>
    </main>
  );
}
