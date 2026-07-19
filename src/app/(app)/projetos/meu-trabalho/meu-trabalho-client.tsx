"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";
import type { MyWorkTask } from "@/lib/crm/queries";
import type { CrmTaskPriority, CrmTaskStatus } from "@/lib/crm/types";

type RecentProject = { id: string; name: string };
type TimeBucket = "overdue" | "today" | "week" | "next";

const PRIORITY: Record<CrmTaskPriority, { label: string; chip: string; tone: string }> = {
  high: { label: "Alto", chip: "bg-rose-100 text-rose-700", tone: "text-rose-600" },
  medium: { label: "Média", chip: "bg-amber-100 text-amber-700", tone: "text-amber-600" },
  low: { label: "Fraco", chip: "bg-sky-100 text-sky-700", tone: "text-sky-600" },
  none: { label: "Não definido", chip: "bg-slate-100 text-slate-500", tone: "text-slate-500" }
};
const STATUS_META: Record<CrmTaskStatus, { label: string; bar: string }> = {
  todo: { label: "A fazer", bar: "bg-slate-400" },
  doing: { label: "Em andamento", bar: "bg-blue-500" },
  done: { label: "Concluído", bar: "bg-emerald-500" }
};

function startOfDay(d: Date) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function parseDue(iso: string | null) { return iso ? startOfDay(new Date(`${iso}T00:00:00`)) : null; }
function fmtDate(iso: string | null) {
  if (!iso) return null;
  return new Date(`${iso}T00:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

export function MeuTrabalhoClient({
  initialTasks,
  recentProjects,
  allProjects
}: {
  initialTasks: MyWorkTask[];
  recentProjects: RecentProject[];
  allProjects: RecentProject[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const { showToast } = useToast();
  const [tasks, setTasks] = useState(initialTasks);
  const [topTab, setTopTab] = useState<"work" | "status">("work");
  const [timeTab, setTimeTab] = useState<TimeBucket>("today");
  const [prioTab, setPrioTab] = useState<CrmTaskPriority>("high");

  const bounds = useMemo(() => {
    const today = startOfDay(new Date());
    const endOfWeek = new Date(today);
    endOfWeek.setDate(today.getDate() + (6 - today.getDay())); // sábado desta semana
    const endOfNext = new Date(endOfWeek);
    endOfNext.setDate(endOfWeek.getDate() + 7);
    return { today, endOfWeek, endOfNext };
  }, []);

  const open = useMemo(() => tasks.filter((t) => t.status !== "done"), [tasks]);

  const byTime = useMemo(() => {
    const { today, endOfWeek, endOfNext } = bounds;
    const buckets: Record<TimeBucket, MyWorkTask[]> = { overdue: [], today: [], week: [], next: [] };
    for (const task of open) {
      const due = parseDue(task.due_date);
      if (!due) continue;
      if (due < today) buckets.overdue.push(task);
      else if (due.getTime() === today.getTime()) buckets.today.push(task);
      else if (due <= endOfWeek) buckets.week.push(task);
      else if (due <= endOfNext) buckets.next.push(task);
    }
    return buckets;
  }, [open, bounds]);

  const byPriority = useMemo(() => {
    const buckets: Record<CrmTaskPriority, MyWorkTask[]> = { high: [], medium: [], low: [], none: [] };
    for (const task of open) buckets[task.priority].push(task);
    return buckets;
  }, [open]);

  const statusCounts = useMemo(() => {
    const counts: Record<CrmTaskStatus, number> = { todo: 0, doing: 0, done: 0 };
    for (const task of tasks) counts[task.status] += 1;
    return counts;
  }, [tasks]);
  const statusTotal = tasks.length;

  const recentTasks = useMemo(
    () => [...tasks].sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? "")).slice(0, 5),
    [tasks]
  );

  async function complete(task: MyWorkTask) {
    const previous = tasks;
    setTasks((current) => current.map((t) => (t.id === task.id ? { ...t, status: "done" } : t)));
    const { error } = await supabase.from("crm_tasks").update({ status: "done" }).eq("id", task.id);
    if (error) {
      setTasks(previous);
      showToast("Não foi possível concluir a tarefa.", "error");
    }
  }

  const timeLabels: Record<TimeBucket, string> = { overdue: "Atraso", today: "Hoje", week: "Essa semana", next: "Próxima semana" };
  const timeTitle: Record<TimeBucket, string> = {
    overdue: "Tarefas em atraso",
    today: "Tarefas a concluir hoje",
    week: "Tarefas desta semana",
    next: "Tarefas da próxima semana"
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-4">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Produtividade</p>
        <h1 className="mt-1 text-2xl font-semibold text-ink">Meu trabalho</h1>
      </div>

      {/* Nav Projetos / Meu trabalho */}
      <div className="mb-5 flex gap-5 border-b border-line text-sm font-semibold">
        <Link className="border-b-2 border-transparent pb-2 text-slate-500 transition hover:text-ink" href="/projetos">Projetos</Link>
        <span className="border-b-2 border-brand pb-2 text-brand">Meu trabalho</span>
      </div>

      {/* Sub-tabs */}
      <div className="mb-4 flex gap-4 text-sm font-medium">
        {([["work", "Trabalho a ser feito"], ["status", "Status da tarefa"]] as const).map(([key, label]) => (
          <button className={`border-b-2 pb-1.5 transition ${topTab === key ? "border-ink text-ink" : "border-transparent text-slate-400 hover:text-ink"}`} key={key} onClick={() => setTopTab(key)} type="button">{label}</button>
        ))}
      </div>

      {topTab === "work" ? (
        <div className="grid gap-5 lg:grid-cols-[1fr_18rem]">
          <div className="space-y-5">
            {/* Por vencimento */}
            <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
              <div className="flex flex-wrap gap-4 border-b border-line pb-3 text-sm font-medium">
                {(["overdue", "today", "week", "next"] as TimeBucket[]).map((key) => (
                  <button className={`flex items-center gap-1.5 border-b-2 pb-2 transition ${timeTab === key ? "border-brand text-brand" : "border-transparent text-slate-400 hover:text-ink"}`} key={key} onClick={() => setTimeTab(key)} type="button">
                    {timeLabels[key]}
                    <span className={`rounded-full px-1.5 text-[11px] font-semibold ${byTime[key].length > 0 ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-400"}`}>{byTime[key].length}</span>
                  </button>
                ))}
              </div>
              <h2 className="mb-3 mt-4 text-base font-semibold text-ink">{timeTitle[timeTab]}</h2>
              <TaskList onComplete={complete} tasks={byTime[timeTab]} />
            </section>

            {/* Por prioridade */}
            <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
              <div className="flex flex-wrap gap-4 border-b border-line pb-3 text-sm font-medium">
                {(["high", "medium", "low", "none"] as CrmTaskPriority[]).map((key) => (
                  <button className={`flex items-center gap-1.5 border-b-2 pb-2 transition ${prioTab === key ? "border-brand text-brand" : "border-transparent text-slate-400 hover:text-ink"}`} key={key} onClick={() => setPrioTab(key)} type="button">
                    {PRIORITY[key].label}
                    <span className={`rounded-full px-1.5 text-[11px] font-semibold ${byPriority[key].length > 0 ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-400"}`}>{byPriority[key].length}</span>
                  </button>
                ))}
              </div>
              <h2 className="mb-3 mt-4 text-base font-semibold text-ink">Tarefas com prioridade {PRIORITY[prioTab].label.toLowerCase()}</h2>
              <TaskList onComplete={complete} tasks={byPriority[prioTab]} />
            </section>
          </div>

          {/* Sidebar */}
          <aside className="space-y-4">
            <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
              <div className="mb-3 flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-ink">Projetos recentes</p>
                {allProjects.length > 0 ? (
                  <select
                    aria-label="Acesse um projeto"
                    className="h-8 max-w-[10rem] rounded-full border border-slate-200 bg-white px-3 text-xs text-slate-600 outline-none transition focus:border-brand"
                    onChange={(e) => { if (e.target.value) router.push(`/projetos/${e.target.value}`); }}
                    value=""
                  >
                    <option value="">Acesse um projeto</option>
                    {allProjects.map((p) => (<option key={p.id} value={p.id}>{p.name || "Projeto sem nome"}</option>))}
                  </select>
                ) : null}
              </div>
              {recentProjects.length === 0 ? (
                <p className="text-sm text-muted">Nenhum projeto ainda.</p>
              ) : (
                <ul className="space-y-1">
                  {recentProjects.map((project) => (
                    <li key={project.id}>
                      <Link className="flex items-center gap-2.5 rounded-lg px-2 py-2 text-sm text-ink transition hover:bg-slate-50" href={`/projetos/${project.id}`}>
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand"><svg fill="none" height="16" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24" width="16"><rect height="14" rx="2" width="18" x="3" y="7" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg></span>
                        <span className="truncate font-medium">{project.name || "Projeto sem nome"}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
              <p className="mb-3 text-sm font-semibold text-ink">Tarefas recentes</p>
              {recentTasks.length === 0 ? (
                <p className="text-sm text-muted">Nenhuma tarefa ainda.</p>
              ) : (
                <ul className="divide-y divide-line">
                  {recentTasks.map((task) => (
                    <li key={task.id}>
                      <Link className="block rounded-lg px-1 py-2 transition hover:bg-slate-50" href={task.project_id ? `/projetos/${task.project_id}` : "/projetos"}>
                        <span className="block truncate text-sm font-medium text-ink">{task.title}</span>
                        <span className="mt-0.5 block truncate text-xs text-muted">
                          {task.crm_projects?.name ?? "Projeto"} · <span className="inline-flex items-center gap-1"><span className={`h-1.5 w-1.5 rounded-full ${STATUS_META[task.status].bar}`} />{STATUS_META[task.status].label}</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </aside>
        </div>
      ) : (
        <section className="max-w-2xl rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
          <p className="mb-4 text-base font-semibold text-ink">Tarefas por status</p>
          {statusTotal === 0 ? (
            <p className="text-sm text-muted">Nenhuma tarefa de projeto ainda.</p>
          ) : (
            <div className="space-y-3">
              {(["todo", "doing", "done"] as CrmTaskStatus[]).map((key) => {
                const count = statusCounts[key];
                const pct = statusTotal > 0 ? Math.round((count / statusTotal) * 100) : 0;
                return (
                  <div key={key}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="text-slate-600">{STATUS_META[key].label}</span>
                      <span className="font-semibold tabular-nums text-ink">{count}</span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${STATUS_META[key].bar}`} style={{ width: `${pct}%` }} /></div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}
    </main>
  );
}

function TaskList({ tasks, onComplete }: { tasks: MyWorkTask[]; onComplete: (task: MyWorkTask) => void }) {
  if (tasks.length === 0) {
    return <p className="py-6 text-center text-sm text-muted">Nenhuma tarefa aqui. 🎉</p>;
  }
  return (
    <ul className="divide-y divide-line">
      {tasks.map((task) => {
        const due = fmtDate(task.due_date);
        return (
          <li className="flex items-center gap-3 py-3" key={task.id}>
            <input aria-label="Concluir" checked={false} className="h-4 w-4 shrink-0 accent-emerald-600" onChange={() => onComplete(task)} type="checkbox" />
            {task.project_id ? (
              <Link className="shrink-0 rounded-md bg-brand px-2 py-0.5 text-[11px] font-semibold text-white transition hover:bg-[#003a94]" href={`/projetos/${task.project_id}`}>
                {task.crm_projects?.name ?? "Projeto"}
              </Link>
            ) : null}
            <span className="min-w-0 flex-1 truncate text-sm text-ink">{task.title}</span>
            {task.priority !== "none" ? <span className={`hidden shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold sm:inline ${PRIORITY[task.priority].chip}`}>{PRIORITY[task.priority].label}</span> : null}
            {due ? <span className="shrink-0 text-xs text-muted">📅 {due}</span> : null}
          </li>
        );
      })}
    </ul>
  );
}
