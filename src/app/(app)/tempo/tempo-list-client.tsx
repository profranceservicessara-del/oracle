"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/toast";
import type { TimeEntryRow } from "@/lib/crm/queries";
import { minutesToHM, sumMinutes, typeLabel } from "@/lib/time";
import { NovoHorarioModal, type ClientOpt, type MemberOpt, type ProjectOpt } from "./time-entry-modal";

type NavTab = "meus" | "todos" | "gestao";

const selCls = "h-9 rounded-full border border-slate-300 bg-white px-3 text-sm text-ink outline-none focus:border-brand";

export function TempoListClient({
  scope,
  companyId,
  userId,
  members,
  projects,
  clients,
  tasks,
  initialEntries
}: {
  scope: "mine" | "org";
  companyId: string;
  userId: string;
  members: MemberOpt[];
  projects: ProjectOpt[];
  clients: ClientOpt[];
  tasks: Array<{ id: string; title: string; project_id: string | null }>;
  initialEntries: TimeEntryRow[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const { showToast } = useToast();
  const [entries, setEntries] = useState(initialEntries);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState("");
  const [projFilter, setProjFilter] = useState("all");
  const [clientFilter, setClientFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [billFilter, setBillFilter] = useState<"all" | "yes" | "no">("all");
  const [modeFilter, setModeFilter] = useState<"all" | "planned" | "actual">("all");

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return entries.filter((e) => {
      if (projFilter !== "all" && e.project_id !== projFilter) return false;
      if (clientFilter !== "all" && e.client_id !== clientFilter) return false;
      if (typeFilter !== "all" && e.entry_type !== typeFilter) return false;
      if (billFilter === "yes" && !e.billable) return false;
      if (billFilter === "no" && e.billable) return false;
      if (modeFilter === "planned" && e.planned_minutes === 0) return false;
      if (modeFilter === "actual" && e.actual_minutes === 0) return false;
      if (q) {
        const hay = `${e.crm_projects?.name ?? ""} ${e.crm_clients?.name ?? ""} ${e.crm_tasks?.title ?? ""} ${e.comment ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [entries, search, projFilter, clientFilter, typeFilter, billFilter, modeFilter]);

  const totalPlanned = sumMinutes(visible.map((e) => e.planned_minutes));
  const totalActual = sumMinutes(visible.map((e) => e.actual_minutes));
  const totalBillable = sumMinutes(visible.filter((e) => e.billable).map((e) => e.actual_minutes));
  const diff = totalActual - totalPlanned;
  const memberName = (id: string) => members.find((m) => m.userId === id)?.name ?? "Membro";

  async function remove(id: string) {
    const prev = entries;
    setEntries((cur) => cur.filter((e) => e.id !== id));
    const { error } = await supabase.from("crm_time_entries").delete().eq("id", id);
    if (error) { setEntries(prev); showToast("Não foi possível excluir.", "error"); }
    else showToast("Horário excluído.", "success");
  }

  const activeTab: NavTab = scope === "mine" ? "meus" : "todos";

  return (
    <main className="mx-auto max-w-7xl px-4 py-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Tempo e planejamento</p>
          <h1 className="mt-1 text-2xl font-semibold text-ink">{scope === "mine" ? "Meus tempos" : "Todos os momentos"}</h1>
        </div>
        <button className="inline-flex h-10 items-center gap-1.5 rounded bg-brand px-4 text-sm font-semibold text-white shadow-sm ring-1 ring-[#002D72]/20 transition hover:bg-[#003a94]" onClick={() => setCreating(true)} type="button">
          <svg fill="none" height="16" stroke="currentColor" strokeLinecap="round" strokeWidth="2" viewBox="0 0 24 24" width="16"><path d="M12 5v14M5 12h14" /></svg>
          Novo horário
        </button>
      </div>

      <div className="mb-4 flex gap-5 border-b border-line text-sm font-semibold">
        <Tab active={false} href="/tempo" label="Gestão de Tempo" />
        <Tab active={activeTab === "meus"} href="/tempo/meus" label="Meus tempos" />
        <Tab active={activeTab === "todos"} href="/tempo/todos" label="Todos os momentos" />
      </div>

      {/* Totais */}
      <div className="mb-4 grid gap-3 sm:grid-cols-4">
        <Total label="Tempo planejado" value={minutesToHM(totalPlanned)} />
        <Total label="Tempo realizado" value={minutesToHM(totalActual)} />
        <Total label="Faturável (real)" tone="text-emerald-600" value={minutesToHM(totalBillable)} />
        <Total label="Diferença (real − plan.)" tone={diff < 0 ? "text-rose-600" : "text-ink"} value={minutesToHM(diff)} />
      </div>

      {/* Filtros */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input className="h-9 min-w-[12rem] flex-1 rounded-full border border-slate-300 bg-white px-4 text-sm text-ink outline-none placeholder:text-slate-400 focus:border-brand" onChange={(e) => setSearch(e.target.value)} placeholder="Buscar…" type="search" value={search} />
        <select aria-label="Projeto" className={selCls} onChange={(e) => setProjFilter(e.target.value)} value={projFilter}><option value="all">Todos os projetos</option>{projects.map((p) => (<option key={p.id} value={p.id}>{p.name || "Projeto sem nome"}</option>))}</select>
        <select aria-label="Cliente" className={selCls} onChange={(e) => setClientFilter(e.target.value)} value={clientFilter}><option value="all">Todos os clientes</option>{clients.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}</select>
        <select aria-label="Tipo" className={selCls} onChange={(e) => setTypeFilter(e.target.value)} value={typeFilter}><option value="all">Todos os tipos</option><option value="trabalho">Trabalho</option><option value="reuniao">Reunião</option><option value="deslocamento">Deslocamento</option><option value="administracao">Administração</option><option value="pausa">Pausa</option></select>
        <select aria-label="Faturável" className={selCls} onChange={(e) => setBillFilter(e.target.value as "all" | "yes" | "no")} value={billFilter}><option value="all">Faturável: todos</option><option value="yes">Só faturável</option><option value="no">Não faturável</option></select>
        <select aria-label="Planejado ou real" className={selCls} onChange={(e) => setModeFilter(e.target.value as "all" | "planned" | "actual")} value={modeFilter}><option value="all">Plan. e real</option><option value="planned">Só planejado</option><option value="actual">Só realizado</option></select>
      </div>

      <div className="overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
        <table className="w-full min-w-[52rem] text-sm">
          <thead>
            <tr className="border-b border-line bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              <th className="px-4 py-3">Data</th>
              {scope === "org" ? <th className="px-4 py-3">Usuário</th> : null}
              <th className="px-4 py-3">Projeto</th>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3">Tarefa</th>
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3 text-right">Plan.</th>
              <th className="px-4 py-3 text-right">Real</th>
              <th className="px-4 py-3">Faturável</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {visible.length === 0 ? (
              <tr><td className="px-4 py-12 text-center text-sm text-muted" colSpan={scope === "org" ? 10 : 9}>Nenhum lançamento no período.</td></tr>
            ) : null}
            {visible.map((e) => (
              <tr key={e.id}>
                <td className="whitespace-nowrap px-4 py-3 text-ink">{new Date(`${e.entry_date}T00:00:00`).toLocaleDateString("pt-BR")}</td>
                {scope === "org" ? <td className="px-4 py-3 text-muted">{memberName(e.user_id)}</td> : null}
                <td className="px-4 py-3 text-ink">{e.crm_projects?.name ?? "—"}</td>
                <td className="px-4 py-3 text-muted">{e.crm_clients?.name ?? "—"}</td>
                <td className="px-4 py-3 text-muted">{e.crm_tasks?.title ?? "—"}</td>
                <td className="px-4 py-3 text-muted">{typeLabel(e.entry_type)}</td>
                <td className="px-4 py-3 text-right tabular-nums text-muted">{minutesToHM(e.planned_minutes)}</td>
                <td className="px-4 py-3 text-right tabular-nums font-medium text-ink">{minutesToHM(e.actual_minutes)}</td>
                <td className="px-4 py-3">{e.billable ? <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">Sim</span> : <span className="text-muted">—</span>}</td>
                <td className="px-4 py-3 text-right">
                  {scope === "mine" || e.user_id === userId ? (
                    <button className="text-xs font-semibold text-rose-600 hover:underline" onClick={() => void remove(e.id)} type="button">Excluir</button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {creating ? (
        <NovoHorarioModal clients={clients} companyId={companyId} initialDate={new Date().toLocaleDateString("en-CA")} members={members} onClose={() => setCreating(false)} onSaved={(entry) => { setEntries((cur) => [entry, ...cur]); setCreating(false); }} projects={projects} tasks={tasks} userId={userId} />
      ) : null}
    </main>
  );
}

function Tab({ href, label, active }: { href: string; label: string; active: boolean }) {
  return active ? <span className="border-b-2 border-brand pb-2 text-brand">{label}</span> : <a className="border-b-2 border-transparent pb-2 text-slate-500 transition hover:text-ink" href={href}>{label}</a>;
}
function Total({ label, value, tone = "text-ink" }: { label: string; value: string; tone?: string }) {
  return (<div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5"><p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p><p className={`mt-1 text-xl font-semibold tabular-nums ${tone}`}>{value}</p></div>);
}
