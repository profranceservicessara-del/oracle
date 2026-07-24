"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { TimeEntryRow } from "@/lib/crm/queries";
import type { CrmTaskPriority } from "@/lib/crm/types";
import { minutesToHM } from "@/lib/time";
import { NovoHorarioModal, type ClientOpt, type MemberOpt, type ProjectOpt } from "./time-entry-modal";

type BacklogTask = { id: string; title: string; project_id: string | null; priority: CrmTaskPriority; due_date: string | null; project_name: string | null };
type CalView = "week" | "month";

const WEEKDAYS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const MONTHS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const PRIORITY_BAR: Record<CrmTaskPriority, string> = { high: "bg-rose-500", medium: "bg-amber-500", low: "bg-sky-400", none: "bg-slate-300" };

function startOfDay(d: Date) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function addDays(d: Date, n: number) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
function iso(d: Date) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
function startOfWeek(d: Date) { const x = startOfDay(d); return addDays(x, -x.getDay()); }
function fmtShort(iso: string) { return new Date(`${iso}T00:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }); }

export function GestaoTempoClient({
  companyId,
  userId,
  userName,
  members,
  projects,
  clients,
  tasks,
  initialEntries
}: {
  companyId: string;
  userId: string;
  userName: string;
  members: MemberOpt[];
  projects: ProjectOpt[];
  clients: ClientOpt[];
  tasks: BacklogTask[];
  initialEntries: TimeEntryRow[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const [anchor, setAnchor] = useState(() => startOfDay(new Date()));
  const [view, setView] = useState<CalView>("month");
  const [timeMode, setTimeMode] = useState<"both" | "actual" | "planned">("both");
  const [entries, setEntries] = useState(initialEntries);
  const [creating, setCreating] = useState<{ date: string; taskId?: string } | null>(null);
  const [backlogOpen, setBacklogOpen] = useState(true);
  const [prioFilter, setPrioFilter] = useState<"all" | CrmTaskPriority>("all");
  const [projFilter, setProjFilter] = useState("all");
  const today = startOfDay(new Date());

  const days = useMemo(() => {
    if (view === "week") { const s = startOfWeek(anchor); return Array.from({ length: 7 }, (_, i) => addDays(s, i)); }
    const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
    const n = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0).getDate();
    return Array.from({ length: n }, (_, i) => addDays(first, i));
  }, [anchor, view]);

  const rangeFrom = iso(days[0]);
  const rangeTo = iso(days[days.length - 1]);

  // Carrega só o período visível (performance + tenant via RLS).
  useEffect(() => {
    let alive = true;
    void supabase
      .from("crm_time_entries")
      .select("*, crm_projects(name), crm_clients(name), crm_tasks(title)")
      .eq("company_id", companyId)
      .gte("entry_date", rangeFrom)
      .lte("entry_date", rangeTo)
      .then(({ data }) => {
        if (!alive || !data) return;
        const norm = (v: unknown) => (Array.isArray(v) ? v[0] ?? null : v ?? null);
        setEntries((data as Array<Record<string, unknown>>).map((r) => ({ ...(r as TimeEntryRow), crm_projects: norm(r.crm_projects) as { name: string } | null, crm_clients: norm(r.crm_clients) as { name: string } | null, crm_tasks: norm(r.crm_tasks) as { title: string } | null })));
      });
    return () => { alive = false; };
  }, [supabase, companyId, rangeFrom, rangeTo]);

  const byDay = useMemo(() => {
    const map = new Map<string, TimeEntryRow[]>();
    for (const e of entries) { const l = map.get(e.entry_date) ?? []; l.push(e); map.set(e.entry_date, l); }
    return map;
  }, [entries]);

  const label = view === "month" ? `${MONTHS[anchor.getMonth()]} de ${anchor.getFullYear()}` : `${fmtShort(iso(days[0]))} – ${fmtShort(iso(days[6]))}`;
  function go(n: number) { setAnchor((d) => (view === "week" ? addDays(d, n * 7) : new Date(d.getFullYear(), d.getMonth() + n, 1))); }

  const backlog = useMemo(
    () => tasks.filter((t) => (prioFilter === "all" || t.priority === prioFilter) && (projFilter === "all" || t.project_id === projFilter)),
    [tasks, prioFilter, projFilter]
  );

  function handleSaved(entry: TimeEntryRow) {
    setEntries((cur) => [entry, ...cur.filter((e) => e.id !== entry.id)]);
    setCreating(null);
  }

  return (
    <main className="mx-auto max-w-[100rem] px-4 py-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-ink">Gestão de Tempo</h1>
        <button className="inline-flex h-10 items-center gap-1.5 rounded bg-brand px-4 text-sm font-semibold text-white shadow-sm ring-1 ring-[#002D72]/20 transition hover:bg-[#003a94]" onClick={() => setCreating({ date: iso(today) })} type="button">
          <svg fill="none" height="16" stroke="currentColor" strokeLinecap="round" strokeWidth="2" viewBox="0 0 24 24" width="16"><path d="M12 5v14M5 12h14" /></svg>
          Novo horário
        </button>
      </div>

      <div className="mb-4 flex gap-5 border-b border-line text-sm font-semibold">
        <span className="border-b-2 border-brand pb-2 text-brand">Gestão de Tempo</span>
        <a className="border-b-2 border-transparent pb-2 text-slate-500 transition hover:text-ink" href="/tempo/meus">Meus tempos</a>
        <a className="border-b-2 border-transparent pb-2 text-slate-500 transition hover:text-ink" href="/tempo/todos">Todos os momentos</a>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
        {/* Planner */}
        <section className="min-w-0 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <button aria-label="Anterior" className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 ring-1 ring-black/5 transition hover:text-ink" onClick={() => go(-1)} type="button"><svg fill="none" height="16" stroke="currentColor" strokeLinecap="round" strokeWidth="2" viewBox="0 0 24 24" width="16"><path d="m15 18-6-6 6-6" /></svg></button>
              <span className="min-w-[10rem] text-center text-sm font-semibold capitalize text-ink">{label}</span>
              <button aria-label="Próximo" className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 ring-1 ring-black/5 transition hover:text-ink" onClick={() => go(1)} type="button"><svg fill="none" height="16" stroke="currentColor" strokeLinecap="round" strokeWidth="2" viewBox="0 0 24 24" width="16"><path d="m9 18 6-6-6-6" /></svg></button>
              <button className="h-8 rounded bg-white px-3 text-sm font-semibold text-ink ring-1 ring-black/5 transition hover:bg-slate-50" onClick={() => setAnchor(startOfDay(new Date()))} type="button">Hoje</button>
            </div>
            <div className="flex items-center gap-2">
              <select aria-label="Tempo real ou planejado" className="h-9 rounded-full border border-slate-300 bg-white px-3 text-sm text-ink outline-none focus:border-brand" onChange={(e) => setTimeMode(e.target.value as "both" | "actual" | "planned")} value={timeMode}>
                <option value="both">Real e planejado</option>
                <option value="actual">Tempo real</option>
                <option value="planned">Tempo planejado</option>
              </select>
              <div className="flex items-center rounded-full bg-slate-100 p-1 text-sm font-medium">
                {([["week", "Semana"], ["month", "Mês"]] as const).map(([k, l]) => (
                  <button className={`rounded-full px-3 py-1.5 transition ${view === k ? "bg-brand text-white shadow-sm" : "text-slate-500 hover:text-ink"}`} key={k} onClick={() => setView(k)} type="button">{l}</button>
                ))}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <div className="grid" style={{ gridTemplateColumns: `9rem repeat(${days.length}, minmax(5.5rem, 1fr))` }}>
              <div className="border-b border-line" />
              {days.map((d) => {
                const isToday = iso(d) === iso(today);
                return (
                  <button className={`border-b border-l border-line px-1 py-2 text-center text-xs transition hover:bg-slate-50 ${isToday ? "bg-brand/5" : ""}`} key={iso(d)} onClick={() => setCreating({ date: iso(d) })} type="button">
                    <span className="block text-slate-400">{WEEKDAYS[d.getDay()]}</span>
                    <span className={`mx-auto mt-0.5 flex h-6 w-6 items-center justify-center rounded-full font-semibold ${isToday ? "bg-brand text-white" : "text-ink"}`}>{d.getDate()}</span>
                  </button>
                );
              })}
              {/* resource row = usuário autenticado (+ membros) */}
              {members.map((m) => (
                <div className="contents" key={m.userId}>
                  <div className={`flex items-center border-b border-line px-3 py-3 text-sm font-medium ${m.userId === userId ? "text-brand" : "text-ink"}`}>{m.name}</div>
                  {days.map((d) => {
                    const list = (byDay.get(iso(d)) ?? []).filter((e) => e.user_id === m.userId);
                    return (
                      <button className="min-h-[4.5rem] space-y-1 border-b border-l border-line p-1 text-left align-top transition hover:bg-slate-50/70" key={m.userId + iso(d)} onClick={() => setCreating({ date: iso(d) })} type="button">
                        {list.map((e) => {
                          const mins = timeMode === "planned" ? e.planned_minutes : timeMode === "actual" ? e.actual_minutes : e.actual_minutes || e.planned_minutes;
                          const planned = timeMode !== "actual" && e.actual_minutes === 0 && e.planned_minutes > 0;
                          return (
                            <span className={`block truncate rounded px-1.5 py-1 text-[10px] font-medium text-white ${planned ? "bg-emerald-500" : "bg-brand"}`} key={e.id} title={`${e.crm_projects?.name ?? "Sem projeto"} · ${minutesToHM(mins)}`}>
                              {e.billable ? "€ " : ""}{e.crm_tasks?.title || e.crm_projects?.name || "Horário"} · {minutesToHM(mins)}
                            </span>
                          );
                        })}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted">
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-brand" /> Realizado</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Planejado</span>
            <span>€ = faturável</span>
          </div>
        </section>

        {/* Backlog */}
        <aside className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-ink">Tarefas a planejar</p>
            <button className="text-xs font-medium text-brand hover:underline lg:hidden" onClick={() => setBacklogOpen((v) => !v)} type="button">{backlogOpen ? "Ocultar" : "Mostrar"}</button>
          </div>
          <div className={backlogOpen ? "space-y-2" : "hidden space-y-2 lg:block"}>
            <select aria-label="Filtrar por prioridade" className="h-9 w-full rounded-full border border-slate-300 bg-white px-3 text-sm text-ink outline-none focus:border-brand" onChange={(e) => setPrioFilter(e.target.value as "all" | CrmTaskPriority)} value={prioFilter}>
              <option value="all">Filtrar por prioridade</option>
              <option value="high">Alta</option><option value="medium">Média</option><option value="low">Fraca</option><option value="none">Não definida</option>
            </select>
            <select aria-label="Filtrar por projeto" className="h-9 w-full rounded-full border border-slate-300 bg-white px-3 text-sm text-ink outline-none focus:border-brand" onChange={(e) => setProjFilter(e.target.value)} value={projFilter}>
              <option value="all">Filtrar por projeto</option>
              {projects.map((p) => (<option key={p.id} value={p.id}>{p.name || "Projeto sem nome"}</option>))}
            </select>
            {backlog.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted">Nenhuma tarefa. 🎉</p>
            ) : (
              backlog.map((t) => (
                <button className="flex w-full gap-2 rounded-lg border border-line p-2.5 text-left transition hover:border-brand/40 hover:bg-slate-50" key={t.id} onClick={() => setCreating({ date: iso(today), taskId: t.id })} type="button">
                  <span className={`mt-0.5 w-1 shrink-0 self-stretch rounded ${PRIORITY_BAR[t.priority]}`} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-ink">{t.title}</span>
                    <span className="block truncate text-xs text-muted">{t.project_name ?? "Sem projeto"}{t.due_date ? ` · ${fmtShort(t.due_date)}` : ""}</span>
                  </span>
                </button>
              ))
            )}
          </div>
        </aside>
      </div>

      {creating ? (
        <NovoHorarioModal clients={clients} companyId={companyId} initialDate={creating.date} members={members} onClose={() => setCreating(null)} onSaved={handleSaved} prefillTaskId={creating.taskId} projects={projects} tasks={tasks.map((t) => ({ id: t.id, title: t.title, project_id: t.project_id }))} userId={userId} />
      ) : null}
    </main>
  );
}
