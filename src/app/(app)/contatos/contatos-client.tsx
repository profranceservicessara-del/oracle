"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";
import { ThirdForm, emptyThirdFull, toThirdFull, type ThirdFull } from "./third-form";
import { PersonForm, emptyPersonFull, personToFull, type PersonFull } from "./person-form";

export type Third = {
  id: string;
  entityKind: "company" | "individual";
  thirdType: "client" | "prospect" | "supplier";
  name: string;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  website: string | null;
  linkedin: string | null;
  businessSector: string | null;
  billingAddress: string | null;
  contactsCount: number;
};

export type Person = {
  id: string;
  thirdId: string | null;
  thirdName: string | null;
  civility: string | null;
  firstName: string | null;
  lastName: string | null;
  fullName: string;
  role: string | null;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  fax: string | null;
  birthDate: string | null;
};

type TabKey = "clientes" | "perspectivas" | "fornecedores" | "empresas" | "individuos" | "contatos";

const TABS: { key: TabKey; label: string }[] = [
  { key: "clientes", label: "Clientes" },
  { key: "perspectivas", label: "Perspectivas" },
  { key: "fornecedores", label: "Fornecedores" },
  { key: "empresas", label: "Empresas" },
  { key: "individuos", label: "Indivíduos" },
  { key: "contatos", label: "Contatos" }
];

const typeBadge: Record<Third["thirdType"], { label: string; className: string }> = {
  client: { label: "Cliente", className: "bg-sky-50 text-sky-700" },
  prospect: { label: "Perspectiva", className: "bg-violet-50 text-violet-700" },
  supplier: { label: "Fornecedor", className: "bg-rose-50 text-rose-700" }
};

// Colunas por visão. locked nunca some (é a identidade da linha).
type ColDef = { key: string; label: string; locked?: boolean; numeric?: boolean };
const THIRD_COLS: ColDef[] = [
  { key: "name", label: "Nome", locked: true },
  { key: "thirdType", label: "Tipo" },
  { key: "email", label: "E-mail" },
  { key: "phone", label: "Telefone" },
  { key: "mobile", label: "Móvel" },
  { key: "businessSector", label: "Setor" },
  { key: "contactsCount", label: "Contatos", numeric: true },
  { key: "website", label: "Site" }
];
const PERSON_COLS: ColDef[] = [
  { key: "fullName", label: "Nome completo", locked: true },
  { key: "role", label: "Função" },
  { key: "thirdName", label: "Empresa" },
  { key: "email", label: "E-mail" },
  { key: "phone", label: "Telefone" },
  { key: "mobile", label: "Móvel" }
];

// Filtros funcionais por visão. text = contém, select = igual.
type FilterDef = { key: string; label: string; kind: "text" | "select"; options?: { value: string; label: string }[] };
const THIRD_FILTERS: FilterDef[] = [
  { key: "name", label: "Nome", kind: "text" },
  { key: "email", label: "E-mail", kind: "text" },
  { key: "phone", label: "Telefone", kind: "text" },
  { key: "mobile", label: "Móvel", kind: "text" },
  { key: "businessSector", label: "Setor empresarial", kind: "text" },
  { key: "website", label: "Site", kind: "text" },
  { key: "billingAddress", label: "Cidade / endereço", kind: "text" },
  {
    key: "thirdType",
    label: "Tipo",
    kind: "select",
    options: [
      { value: "client", label: "Cliente" },
      { value: "prospect", label: "Perspectiva" },
      { value: "supplier", label: "Fornecedor" }
    ]
  }
];
const PERSON_FILTERS: FilterDef[] = [
  { key: "fullName", label: "Nome completo", kind: "text" },
  { key: "role", label: "Função", kind: "text" },
  { key: "thirdName", label: "Empresa", kind: "text" },
  { key: "email", label: "E-mail", kind: "text" },
  { key: "phone", label: "Telefone", kind: "text" },
  { key: "mobile", label: "Móvel", kind: "text" }
];

const addLabel: Record<TabKey, string> = {
  clientes: "Adicionar um cliente",
  perspectivas: "Adicionar um potencial cliente",
  fornecedores: "Adicionar fornecedor",
  empresas: "Adicionar",
  individuos: "Adicionar",
  contatos: "Adicionar contato"
};

const COLS_KEY = "contatos.columns.v1";

export function ContatosClient({
  initialThirds,
  initialPeople,
  userId
}: {
  initialThirds: Third[];
  initialPeople: Person[];
  userId: string;
}) {
  const supabase = useMemo(() => createClient(), []);
  const { showToast } = useToast();
  const [thirds, setThirds] = useState(initialThirds);
  const [people, setPeople] = useState(initialPeople);
  const [tab, setTab] = useState<TabKey>("clientes");
  const [sort, setSort] = useState<{ col: string; dir: "asc" | "desc" }>({ col: "name", dir: "asc" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [search, setSearch] = useState("");
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});
  const [filterQuery, setFilterQuery] = useState("");
  const [colsOpen, setColsOpen] = useState(false);
  // Visibilidade default: tudo ligado. Persistência carrega no mount (evita mismatch de hidratação).
  const [colVisible, setColVisible] = useState<{ thirds: Record<string, boolean>; contatos: Record<string, boolean> }>({
    thirds: Object.fromEntries(THIRD_COLS.map((c) => [c.key, true])),
    contatos: Object.fromEntries(PERSON_COLS.map((c) => [c.key, true]))
  });

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [formValue, setFormValue] = useState<ThirdFull>(emptyThirdFull);
  const [personOpen, setPersonOpen] = useState(false);
  const [personMode, setPersonMode] = useState<"create" | "edit">("create");
  const [personValue, setPersonValue] = useState<PersonFull>(emptyPersonFull);

  const isContatos = tab === "contatos";
  const view = isContatos ? "contatos" : "thirds";
  const allCols = isContatos ? PERSON_COLS : THIRD_COLS;
  const filterDefs = isContatos ? PERSON_FILTERS : THIRD_FILTERS;
  const visibleCols = allCols.filter((c) => c.locked || colVisible[view][c.key]);

  // Carrega config de colunas persistida.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(COLS_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as Partial<typeof colVisible>;
      setColVisible((cur) => ({
        thirds: { ...cur.thirds, ...(saved.thirds ?? {}) },
        contatos: { ...cur.contatos, ...(saved.contatos ?? {}) }
      }));
    } catch {
      /* localStorage indisponível, mantém default */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleCol(key: string) {
    setColVisible((cur) => {
      const next = { ...cur, [view]: { ...cur[view], [key]: !cur[view][key] } };
      try {
        window.localStorage.setItem(COLS_KEY, JSON.stringify(next));
      } catch {
        /* ignora */
      }
      return next;
    });
  }

  const rows = useMemo(() => {
    if (isContatos) return people as Array<Record<string, unknown>>;
    return (thirds as Third[]).filter((t) => {
      if (tab === "clientes") return t.thirdType === "client";
      if (tab === "perspectivas") return t.thirdType === "prospect";
      if (tab === "fornecedores") return t.thirdType === "supplier";
      if (tab === "empresas") return t.entityKind === "company";
      if (tab === "individuos") return t.entityKind === "individual";
      return true;
    }) as unknown as Array<Record<string, unknown>>;
  }, [thirds, people, tab, isContatos]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const activeEntries = Object.entries(activeFilters).filter(([, v]) => v.trim() !== "");
    return rows.filter((r) => {
      for (const [key, val] of activeEntries) {
        const def = filterDefs.find((d) => d.key === key);
        if (!def) continue;
        const cell = String(r[key] ?? "").toLowerCase();
        if (def.kind === "select") {
          if (cell !== val.toLowerCase()) return false;
        } else if (!cell.includes(val.trim().toLowerCase())) {
          return false;
        }
      }
      if (q) {
        const hay = Object.values(r).map((v) => String(v ?? "")).join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, search, activeFilters, filterDefs]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    const { col, dir } = sort;
    const numeric = allCols.find((c) => c.key === col)?.numeric;
    arr.sort((a, b) => {
      if (numeric) {
        const na = Number(a[col] ?? 0);
        const nb = Number(b[col] ?? 0);
        return dir === "asc" ? na - nb : nb - na;
      }
      const va = String(a[col] ?? "").toLowerCase();
      const vb = String(b[col] ?? "").toLowerCase();
      return dir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
    });
    return arr;
  }, [filtered, sort, allCols]);

  const total = sorted.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, pageCount);
  const pageRows = sorted.slice((safePage - 1) * pageSize, safePage * pageSize);

  function toggleSort(col: string) {
    setSort((s) => (s.col === col ? { col, dir: s.dir === "asc" ? "desc" : "asc" } : { col, dir: "asc" }));
  }
  function changeTab(k: TabKey) {
    setTab(k);
    setPage(1);
    setSelected(new Set());
    setSearch("");
    setActiveFilters({});
    setFilterQuery("");
    setSort({ col: k === "contatos" ? "fullName" : "name", dir: "asc" });
  }
  function toggleRow(id: string) {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }
  const allChecked = pageRows.length > 0 && pageRows.every((r) => selected.has((r as { id: string }).id));

  function addFilter(key: string) {
    setActiveFilters((f) => (key in f ? f : { ...f, [key]: "" }));
    setPage(1);
  }
  function setFilterValue(key: string, val: string) {
    setActiveFilters((f) => ({ ...f, [key]: val }));
    setPage(1);
  }
  function removeFilter(key: string) {
    setActiveFilters((f) => {
      const n = { ...f };
      delete n[key];
      return n;
    });
    setPage(1);
  }

  function handleSaved(saved: Third, mode: "create" | "edit") {
    if (mode === "create") {
      setThirds((cur) => [saved, ...cur]);
    } else {
      setThirds((cur) => cur.map((t) => (t.id === saved.id ? { ...saved, contactsCount: t.contactsCount } : t)));
    }
    setFormOpen(false);
  }

  async function openEdit(id: string) {
    const [{ data: row }, { data: addr }] = await Promise.all([
      supabase.from("contact_thirds").select("*").eq("id", id).single(),
      supabase.from("contact_addresses").select("*").eq("third_id", id).eq("kind", "billing").maybeSingle()
    ]);
    if (!row) {
      showToast("Não foi possível abrir o registro.", "error");
      return;
    }
    setFormValue(toThirdFull(row as Record<string, unknown>, (addr as Record<string, unknown>) ?? null));
    setFormMode("edit");
    setFormOpen(true);
  }

  // Vincular/desvincular ajusta a contagem "Contatos" do Third na hora.
  function handlePersonSaved(saved: Person, mode: "create" | "edit") {
    const prevThirdId = mode === "edit" ? people.find((p) => p.id === saved.id)?.thirdId ?? null : null;
    setPeople((cur) => (mode === "create" ? [saved, ...cur] : cur.map((p) => (p.id === saved.id ? saved : p))));
    if (prevThirdId !== saved.thirdId) {
      setThirds((cur) =>
        cur.map((t) => {
          if (t.id === prevThirdId) return { ...t, contactsCount: Math.max(0, t.contactsCount - 1) };
          if (t.id === saved.thirdId) return { ...t, contactsCount: t.contactsCount + 1 };
          return t;
        })
      );
    }
    setPersonOpen(false);
  }

  function openEditPerson(id: string) {
    const p = people.find((x) => x.id === id);
    if (!p) return;
    setPersonValue(personToFull(p));
    setPersonMode("edit");
    setPersonOpen(true);
  }

  function openAdd() {
    if (isContatos) {
      setPersonValue(emptyPersonFull);
      setPersonMode("create");
      setPersonOpen(true);
    } else {
      const preset = tab === "perspectivas" ? "prospect" : tab === "fornecedores" ? "supplier" : "client";
      setFormValue({ ...emptyThirdFull, third_type: preset, entity_kind: tab === "individuos" ? "individual" : "company" });
      setFormMode("create");
      setFormOpen(true);
    }
  }

  // Opções de empresa para vincular uma pessoa (todos os thirds carregados).
  const thirdOptions = useMemo(
    () => [...thirds].sort((a, b) => a.name.localeCompare(b.name)).map((t) => ({ id: t.id, name: t.name })),
    [thirds]
  );

  const th = "px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400";
  const Sortable = ({ col, label }: { col: string; label: string }) => (
    <button className="inline-flex items-center gap-1 hover:text-ink" onClick={() => toggleSort(col)} type="button">
      {label}
      <span className="text-slate-300">{sort.col === col ? (sort.dir === "asc" ? "↑" : "↓") : "↕"}</span>
    </button>
  );

  function renderCell(col: ColDef, raw: Record<string, unknown>) {
    if (isContatos) {
      const p = raw as unknown as Person;
      if (col.key === "fullName") return <span className="font-medium text-ink">{p.fullName}</span>;
      const v = (p as unknown as Record<string, unknown>)[col.key];
      return <span className="text-slate-600">{(v as string) ?? ""}</span>;
    }
    const t = raw as unknown as Third;
    if (col.key === "name") return <span className="font-medium text-ink">{t.name}</span>;
    if (col.key === "thirdType") {
      const b = typeBadge[t.thirdType];
      return <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${b.className}`}>{b.label}</span>;
    }
    if (col.key === "contactsCount") return <span className="tabular-nums text-slate-600">{t.contactsCount || ""}</span>;
    if (col.key === "website")
      return t.website ? (
        <a className="text-brand hover:underline" href={t.website} onClick={(e) => e.stopPropagation()} rel="noopener" target="_blank">
          {t.website.replace(/^https?:\/\//, "")}
        </a>
      ) : (
        ""
      );
    const v = (t as unknown as Record<string, unknown>)[col.key];
    return <span className="text-slate-600">{(v as string) ?? ""}</span>;
  }

  const availableFilters = filterDefs.filter(
    (d) => !(d.key in activeFilters) && d.label.toLowerCase().includes(filterQuery.trim().toLowerCase())
  );
  const activeCount = Object.values(activeFilters).filter((v) => v.trim() !== "").length;

  return (
    <main className="mx-auto max-w-[100rem] px-4 py-6">
      {/* Topo */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Produtividade</p>
          <h1 className="mt-1 text-2xl font-semibold text-ink">Contatos</h1>
        </div>
        <div className="flex items-center gap-2">
          <button className="inline-flex h-10 items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50" title="Em breve (Fase 6)" type="button">
            Ações
            <svg fill="none" height="14" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="14"><path d="m6 9 6 6 6-6" /></svg>
          </button>
          <Button onClick={openAdd} type="button">+ {addLabel[tab]}</Button>
        </div>
      </div>

      {/* Abas */}
      <div className="mb-5 flex flex-wrap gap-1 border-b border-line">
        {TABS.map((t) => (
          <button
            className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-semibold transition ${
              tab === t.key ? "border-brand text-brand" : "border-transparent text-slate-500 hover:text-ink"
            }`}
            key={t.key}
            onClick={() => changeTab(t.key)}
            type="button"
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[260px_1fr]">
        {/* Painel de filtros funcionais */}
        <aside className="hidden lg:block">
          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-ink">Filtros</p>
              {activeCount > 0 ? (
                <button className="text-xs font-semibold text-brand hover:underline" onClick={() => setActiveFilters({})} type="button">
                  Limpar ({activeCount})
                </button>
              ) : null}
            </div>
            <input
              className="mt-3 h-9 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-brand"
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="Pesquisar um filtro"
              type="search"
              value={filterQuery}
            />
            <ul className="mt-3 max-h-[60vh] space-y-1 overflow-y-auto pr-1">
              {availableFilters.length === 0 ? (
                <li className="px-1 py-2 text-xs text-slate-400">Nenhum filtro disponível.</li>
              ) : (
                availableFilters.map((f) => (
                  <li key={f.key}>
                    <button
                      className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-sm text-slate-600 transition hover:bg-slate-50 hover:text-ink"
                      onClick={() => addFilter(f.key)}
                      type="button"
                    >
                      {f.label}
                      <span className="text-slate-300">+</span>
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>
        </aside>

        {/* Tabela */}
        <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
            <p className="text-sm text-muted">
              <span className="font-semibold text-ink tabular-nums">{total}</span> resultado{total === 1 ? "" : "s"}
            </p>
            <div className="flex items-center gap-2">
              <div className="relative">
                <svg className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" fill="none" height="15" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="15"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
                <input
                  className="h-9 w-48 rounded-xl border border-slate-200 pl-8 pr-3 text-sm outline-none focus:border-brand sm:w-64"
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  placeholder="Buscar na lista"
                  type="search"
                  value={search}
                />
              </div>
              <div className="relative">
                <button
                  aria-label="Configurar colunas"
                  className={`rounded-lg p-1.5 transition ${colsOpen ? "bg-slate-100 text-ink" : "text-slate-400 hover:bg-slate-50 hover:text-ink"}`}
                  onClick={() => setColsOpen((o) => !o)}
                  title="Configurar colunas"
                  type="button"
                >
                  <svg fill="none" height="16" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24" width="16"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6h.09A1.65 1.65 0 0 0 10 3.09V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
                </button>
                {colsOpen ? (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setColsOpen(false)} />
                    <div className="absolute right-0 top-full z-20 mt-2 w-56 rounded-xl bg-white p-3 shadow-lg ring-1 ring-black/10">
                      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Colunas</p>
                      <ul className="space-y-0.5">
                        {allCols.map((c) => (
                          <li key={c.key}>
                            <label className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm ${c.locked ? "text-slate-400" : "cursor-pointer text-slate-700 hover:bg-slate-50"}`}>
                              <input
                                checked={c.locked ? true : colVisible[view][c.key]}
                                disabled={c.locked}
                                onChange={() => toggleCol(c.key)}
                                type="checkbox"
                              />
                              {c.label}
                            </label>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </>
                ) : null}
              </div>
            </div>
          </div>

          {/* Chips de filtros ativos */}
          {activeCount > 0 || Object.keys(activeFilters).length > 0 ? (
            <div className="flex flex-wrap items-center gap-2 border-b border-line bg-slate-50/50 px-4 py-2.5">
              {Object.keys(activeFilters).map((key) => {
                const def = filterDefs.find((d) => d.key === key);
                if (!def) return null;
                return (
                  <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white pl-2.5 text-sm shadow-sm" key={key}>
                    <span className="text-slate-500">{def.label}:</span>
                    {def.kind === "select" ? (
                      <select
                        className="bg-transparent py-1 pr-1 text-ink outline-none"
                        onChange={(e) => setFilterValue(key, e.target.value)}
                        value={activeFilters[key]}
                      >
                        <option value="">Qualquer</option>
                        {def.options?.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        autoFocus
                        className="w-32 bg-transparent py-1 text-ink outline-none placeholder:text-slate-300"
                        onChange={(e) => setFilterValue(key, e.target.value)}
                        placeholder="contém…"
                        value={activeFilters[key]}
                      />
                    )}
                    <button className="px-1.5 text-slate-400 hover:text-ink" onClick={() => removeFilter(key)} type="button">×</button>
                  </div>
                );
              })}
            </div>
          ) : null}

          {total === 0 ? (
            <div className="px-6 py-20 text-center">
              <p className="text-lg font-semibold text-ink">
                {search || activeCount > 0 ? "Nenhum resultado." : "Nada por aqui ainda."}
              </p>
              <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
                {search || activeCount > 0 ? (
                  "Ajuste a busca ou os filtros."
                ) : (
                  <>Clique em <span className="font-medium text-ink">{addLabel[tab]}</span> para criar o primeiro registro.</>
                )}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-line bg-slate-50/60">
                  <tr>
                    <th className="w-10 px-4 py-3">
                      <input
                        checked={allChecked}
                        onChange={(e) =>
                          setSelected((s) => {
                            const n = new Set(s);
                            pageRows.forEach((r) => (e.target.checked ? n.add((r as { id: string }).id) : n.delete((r as { id: string }).id)));
                            return n;
                          })
                        }
                        type="checkbox"
                      />
                    </th>
                    {visibleCols.map((c) => (
                      <th className={th} key={c.key}><Sortable col={c.key} label={c.label} /></th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {pageRows.map((raw) => {
                    const id = (raw as { id: string }).id;
                    return (
                      <tr
                        className="cursor-pointer hover:bg-slate-50/50"
                        key={id}
                        onClick={isContatos ? () => openEditPerson(id) : () => void openEdit(id)}
                      >
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <input checked={selected.has(id)} onChange={() => toggleRow(id)} type="checkbox" />
                        </td>
                        {visibleCols.map((c) => (
                          <td className="px-4 py-3" key={c.key}>{renderCell(c, raw)}</td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Paginação */}
          {total > 0 ? (
            <div className="flex flex-wrap items-center justify-center gap-4 border-t border-line px-4 py-3 text-sm text-muted">
              <label className="flex items-center gap-2">
                Linhas por página
                <Select className="w-20" onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }} value={pageSize}>
                  {[25, 50, 100].map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </Select>
              </label>
              <div className="flex items-center gap-3 tabular-nums">
                <button className="rounded p-1 disabled:opacity-40" disabled={safePage <= 1} onClick={() => setPage((p) => p - 1)} type="button">‹</button>
                <span>{(safePage - 1) * pageSize + 1} - {Math.min(safePage * pageSize, total)} de {total}</span>
                <button className="rounded p-1 disabled:opacity-40" disabled={safePage >= pageCount} onClick={() => setPage((p) => p + 1)} type="button">›</button>
              </div>
            </div>
          ) : null}
        </section>
      </div>

      {/* Formulário completo do Third (criar/editar) */}
      <ThirdForm
        isOpen={formOpen}
        mode={formMode}
        onClose={() => setFormOpen(false)}
        onSaved={handleSaved}
        userId={userId}
        value={formValue}
      />

      {/* Formulário completo da pessoa (criar/editar + vínculo) */}
      <PersonForm
        isOpen={personOpen}
        mode={personMode}
        onClose={() => setPersonOpen(false)}
        onSaved={handlePersonSaved}
        thirds={thirdOptions}
        userId={userId}
        value={personValue}
      />
    </main>
  );
}
