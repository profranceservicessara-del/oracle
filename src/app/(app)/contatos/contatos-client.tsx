"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { FormModal } from "@/components/ui/form-modal";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";

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
  fullName: string;
  role: string | null;
  email: string | null;
  phone: string | null;
  mobile: string | null;
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

// Filtros do painel esquerdo (Fase 3 os torna funcionais; por ora são visuais).
const FILTERS = [
  "Pertence a grupo(s)", "Arquivo", "Canal de inscrição", "Categoria de preços", "Código NAF",
  "Data de criação", "Data da última atividade", "Data da última modificação", "Data de conversão para o cliente",
  "Departamento / CEP", "E-mail", "Estado/província", "Fax", "Situação jurídica", "Gestão de campanhas",
  "Móvel", "Nome", "Número de funcionários", "Número de IVA intracomunitário", "Oportunidade",
  "Compartilhado com", "País", "Proprietário", "RCS", "Referência do cliente", "Pontuação",
  "Setor empresarial", "Sirene", "Siret", "Site", "Etiquetas inteligentes", "Status de proprietário",
  "Tipo", "Telefone", "Cidade"
];

const addLabel: Record<TabKey, string> = {
  clientes: "Adicionar um cliente",
  perspectivas: "Adicionar um potencial cliente",
  fornecedores: "Adicionar fornecedor",
  empresas: "Adicionar",
  individuos: "Adicionar",
  contatos: "Adicionar contato"
};

const emptyThird = { name: "", third_type: "client", entity_kind: "company", email: "", phone: "" };
const emptyPerson = { first_name: "", last_name: "", role: "", email: "", phone: "" };

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

  const [thirdOpen, setThirdOpen] = useState(false);
  const [thirdForm, setThirdForm] = useState(emptyThird);
  const [personOpen, setPersonOpen] = useState(false);
  const [personForm, setPersonForm] = useState(emptyPerson);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const isContatos = tab === "contatos";

  const rows = useMemo(() => {
    if (isContatos) return people;
    return thirds.filter((t) => {
      if (tab === "clientes") return t.thirdType === "client";
      if (tab === "perspectivas") return t.thirdType === "prospect";
      if (tab === "fornecedores") return t.thirdType === "supplier";
      if (tab === "empresas") return t.entityKind === "company";
      if (tab === "individuos") return t.entityKind === "individual";
      return true;
    });
  }, [thirds, people, tab, isContatos]);

  const sorted = useMemo(() => {
    const arr = [...(rows as Array<Record<string, unknown>>)];
    const { col, dir } = sort;
    arr.sort((a, b) => {
      const va = String(a[col] ?? "").toLowerCase();
      const vb = String(b[col] ?? "").toLowerCase();
      return dir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
    });
    return arr;
  }, [rows, sort]);

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

  async function saveThird() {
    setErr("");
    if (!thirdForm.name.trim()) {
      setErr("Informe o nome.");
      return;
    }
    setSaving(true);
    const { data, error } = await supabase
      .from("contact_thirds")
      .insert({
        user_id: userId,
        name: thirdForm.name.trim(),
        third_type: thirdForm.third_type,
        entity_kind: thirdForm.entity_kind,
        email: thirdForm.email || null,
        phone: thirdForm.phone || null
      })
      .select("id, entity_kind, third_type, name, email, phone, mobile, website, linkedin, business_sector")
      .single();
    setSaving(false);
    if (error || !data) {
      showToast("Não foi possível criar.", "error");
      return;
    }
    const r = data as Record<string, unknown>;
    setThirds((cur) => [
      {
        id: r.id as string,
        entityKind: r.entity_kind as Third["entityKind"],
        thirdType: r.third_type as Third["thirdType"],
        name: r.name as string,
        email: (r.email as string) ?? null,
        phone: (r.phone as string) ?? null,
        mobile: null,
        website: null,
        linkedin: null,
        businessSector: null,
        billingAddress: null,
        contactsCount: 0
      },
      ...cur
    ]);
    setThirdForm(emptyThird);
    setThirdOpen(false);
    showToast("Registro criado.", "success");
  }

  async function savePerson() {
    setErr("");
    if (!personForm.first_name.trim() && !personForm.last_name.trim()) {
      setErr("Informe ao menos o nome ou sobrenome.");
      return;
    }
    setSaving(true);
    const { data, error } = await supabase
      .from("contact_people")
      .insert({
        user_id: userId,
        first_name: personForm.first_name || null,
        last_name: personForm.last_name || null,
        role: personForm.role || null,
        email: personForm.email || null,
        phone: personForm.phone || null
      })
      .select("id, third_id, first_name, last_name, role, email, phone, mobile")
      .single();
    setSaving(false);
    if (error || !data) {
      showToast("Não foi possível criar o contato.", "error");
      return;
    }
    const r = data as Record<string, unknown>;
    const full = `${(r.first_name as string) ?? ""} ${(r.last_name as string) ?? ""}`.trim() || "Sem nome";
    setPeople((cur) => [
      {
        id: r.id as string,
        thirdId: (r.third_id as string) ?? null,
        fullName: full,
        role: (r.role as string) ?? null,
        email: (r.email as string) ?? null,
        phone: (r.phone as string) ?? null,
        mobile: (r.mobile as string) ?? null
      },
      ...cur
    ]);
    setPersonForm(emptyPerson);
    setPersonOpen(false);
    showToast("Contato criado.", "success");
  }

  function openAdd() {
    setErr("");
    if (isContatos) {
      setPersonForm(emptyPerson);
      setPersonOpen(true);
    } else {
      const preset =
        tab === "perspectivas" ? "prospect" : tab === "fornecedores" ? "supplier" : "client";
      setThirdForm({ ...emptyThird, third_type: preset, entity_kind: tab === "individuos" ? "individual" : "company" });
      setThirdOpen(true);
    }
  }

  const th = "px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400";
  const Sortable = ({ col, label }: { col: string; label: string }) => (
    <button className="inline-flex items-center gap-1 hover:text-ink" onClick={() => toggleSort(col)} type="button">
      {label}
      <span className="text-slate-300">{sort.col === col ? (sort.dir === "asc" ? "↑" : "↓") : "↕"}</span>
    </button>
  );

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
        {/* Painel de filtros (Fase 3 os torna funcionais) */}
        <aside className="hidden lg:block">
          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
            <p className="text-sm font-semibold text-ink">Filtros</p>
            <div className="mt-3 flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Favoritos</p>
              <span className="text-xs text-brand">Veja tudo</span>
            </div>
            <input
              className="mt-3 h-9 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-brand"
              placeholder="Pesquisar um filtro"
              type="search"
            />
            <ul className="mt-3 max-h-[60vh] space-y-1.5 overflow-y-auto pr-1">
              {FILTERS.map((f) => (
                <li className="cursor-default text-sm text-slate-600" key={f}>{f}</li>
              ))}
            </ul>
          </div>
        </aside>

        {/* Tabela */}
        <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
          <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
            <p className="text-sm text-muted">
              <span className="font-semibold text-ink tabular-nums">{total}</span> resultado{total === 1 ? "" : "s"}
            </p>
            <button className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-50 hover:text-ink" title="Configurar colunas (Fase 3)" type="button">
              <svg fill="none" height="16" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24" width="16"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6h.09A1.65 1.65 0 0 0 10 3.09V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
            </button>
          </div>

          {total === 0 ? (
            <div className="px-6 py-20 text-center">
              <p className="text-lg font-semibold text-ink">Nada por aqui ainda.</p>
              <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
                Clique em <span className="font-medium text-ink">{addLabel[tab]}</span> para criar o primeiro registro.
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
                    {isContatos ? (
                      <>
                        <th className={th}><Sortable col="fullName" label="Nome completo" /></th>
                        <th className={th}><Sortable col="role" label="Função" /></th>
                        <th className={th}><Sortable col="email" label="E-mail" /></th>
                        <th className={th}><Sortable col="phone" label="Telefone" /></th>
                        <th className={th}><Sortable col="mobile" label="Móvel" /></th>
                      </>
                    ) : (
                      <>
                        <th className={th}><Sortable col="name" label="Nome" /></th>
                        <th className={th}><Sortable col="thirdType" label="Tipo" /></th>
                        <th className={th}><Sortable col="email" label="E-mail" /></th>
                        <th className={th}><Sortable col="phone" label="Telefone" /></th>
                        <th className={th}><Sortable col="mobile" label="Móvel" /></th>
                        <th className={th}><Sortable col="businessSector" label="Setor" /></th>
                        <th className={th}>Contatos</th>
                        <th className={th}>Site</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {pageRows.map((raw) => {
                    const id = (raw as { id: string }).id;
                    return (
                      <tr className="hover:bg-slate-50/50" key={id}>
                        <td className="px-4 py-3">
                          <input checked={selected.has(id)} onChange={() => toggleRow(id)} type="checkbox" />
                        </td>
                        {isContatos ? (
                          (() => {
                            const p = raw as unknown as Person;
                            return (
                              <>
                                <td className="px-4 py-3 font-medium text-ink">{p.fullName}</td>
                                <td className="px-4 py-3 text-slate-600">{p.role ?? ""}</td>
                                <td className="px-4 py-3 text-slate-600">{p.email ?? ""}</td>
                                <td className="px-4 py-3 tabular-nums text-slate-600">{p.phone ?? ""}</td>
                                <td className="px-4 py-3 tabular-nums text-slate-600">{p.mobile ?? ""}</td>
                              </>
                            );
                          })()
                        ) : (
                          (() => {
                            const t = raw as unknown as Third;
                            const b = typeBadge[t.thirdType];
                            return (
                              <>
                                <td className="px-4 py-3 font-medium text-ink">{t.name}</td>
                                <td className="px-4 py-3">
                                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${b.className}`}>{b.label}</span>
                                </td>
                                <td className="px-4 py-3 text-slate-600">{t.email ?? ""}</td>
                                <td className="px-4 py-3 tabular-nums text-slate-600">{t.phone ?? ""}</td>
                                <td className="px-4 py-3 tabular-nums text-slate-600">{t.mobile ?? ""}</td>
                                <td className="px-4 py-3 text-slate-600">{t.businessSector ?? ""}</td>
                                <td className="px-4 py-3 tabular-nums text-slate-600">{t.contactsCount || ""}</td>
                                <td className="px-4 py-3 text-slate-600">
                                  {t.website ? <a className="text-brand hover:underline" href={t.website} rel="noopener" target="_blank">{t.website.replace(/^https?:\/\//, "")}</a> : ""}
                                </td>
                              </>
                            );
                          })()
                        )}
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

      {/* Modal criar terceiro (mínimo — Fase 4 traz o formulário completo) */}
      <FormModal description="Formulário completo virá na Fase 4." isOpen={thirdOpen} onClose={() => setThirdOpen(false)} title="Novo registro">
        <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); void saveThird(); }}>
          <label className="text-sm font-medium text-ink">
            Nome *
            <Input className="mt-2" onChange={(e) => setThirdForm((c) => ({ ...c, name: e.target.value }))} value={thirdForm.name} />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium text-ink">
              Tipo
              <Select className="mt-2" onChange={(e) => setThirdForm((c) => ({ ...c, third_type: e.target.value }))} value={thirdForm.third_type}>
                <option value="client">Cliente</option>
                <option value="prospect">Perspectiva</option>
                <option value="supplier">Fornecedor</option>
              </Select>
            </label>
            <label className="text-sm font-medium text-ink">
              Categoria
              <Select className="mt-2" onChange={(e) => setThirdForm((c) => ({ ...c, entity_kind: e.target.value }))} value={thirdForm.entity_kind}>
                <option value="company">Empresa</option>
                <option value="individual">Indivíduo</option>
              </Select>
            </label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium text-ink">
              E-mail
              <Input className="mt-2" onChange={(e) => setThirdForm((c) => ({ ...c, email: e.target.value }))} type="email" value={thirdForm.email} />
            </label>
            <label className="text-sm font-medium text-ink">
              Telefone
              <Input className="mt-2" onChange={(e) => setThirdForm((c) => ({ ...c, phone: e.target.value }))} value={thirdForm.phone} />
            </label>
          </div>
          {err ? <p className="text-sm text-red-600">{err}</p> : null}
          <div className="flex justify-end gap-2">
            <Button onClick={() => setThirdOpen(false)} type="button" variant="secondary">Cancelar</Button>
            <Button disabled={saving} type="submit">{saving ? "Salvando…" : "Salvar"}</Button>
          </div>
        </form>
      </FormModal>

      {/* Modal criar contato (pessoa) */}
      <FormModal description="Vincular a uma empresa virá na Fase 5." isOpen={personOpen} onClose={() => setPersonOpen(false)} title="Novo contato">
        <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); void savePerson(); }}>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium text-ink">
              Primeiro nome
              <Input className="mt-2" onChange={(e) => setPersonForm((c) => ({ ...c, first_name: e.target.value }))} value={personForm.first_name} />
            </label>
            <label className="text-sm font-medium text-ink">
              Nome
              <Input className="mt-2" onChange={(e) => setPersonForm((c) => ({ ...c, last_name: e.target.value }))} value={personForm.last_name} />
            </label>
          </div>
          <label className="text-sm font-medium text-ink">
            Função
            <Input className="mt-2" onChange={(e) => setPersonForm((c) => ({ ...c, role: e.target.value }))} value={personForm.role} />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium text-ink">
              E-mail
              <Input className="mt-2" onChange={(e) => setPersonForm((c) => ({ ...c, email: e.target.value }))} type="email" value={personForm.email} />
            </label>
            <label className="text-sm font-medium text-ink">
              Telefone
              <Input className="mt-2" onChange={(e) => setPersonForm((c) => ({ ...c, phone: e.target.value }))} value={personForm.phone} />
            </label>
          </div>
          {err ? <p className="text-sm text-red-600">{err}</p> : null}
          <div className="flex justify-end gap-2">
            <Button onClick={() => setPersonOpen(false)} type="button" variant="secondary">Cancelar</Button>
            <Button disabled={saving} type="submit">{saving ? "Salvando…" : "Salvar"}</Button>
          </div>
        </form>
      </FormModal>
    </main>
  );
}
