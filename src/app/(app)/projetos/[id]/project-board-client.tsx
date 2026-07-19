"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useToast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";
import type { ProjectTask } from "@/lib/crm/queries";
import type { CrmProject, CrmTaskStatus } from "@/lib/crm/types";

const COLUMNS: { key: CrmTaskStatus; label: string; dot: string; bar: string }[] = [
  { key: "todo", label: "A fazer", dot: "bg-slate-400", bar: "bg-slate-300" },
  { key: "doing", label: "Em andamento", dot: "bg-blue-500", bar: "bg-blue-500" },
  { key: "done", label: "Concluído", dot: "bg-emerald-500", bar: "bg-emerald-500" }
];
const ORDER: CrmTaskStatus[] = ["todo", "doing", "done"];

function fmtDate(iso: string | null) {
  if (!iso) return null;
  return new Date(`${iso}T00:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

export function ProjectBoardClient({
  companyId,
  project,
  initialTasks
}: {
  companyId: string;
  project: CrmProject;
  initialTasks: ProjectTask[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const { showToast } = useToast();
  const [tasks, setTasks] = useState(initialTasks);
  const [view, setView] = useState<"board" | "list">("board");
  const [newTitle, setNewTitle] = useState("");
  const [newDue, setNewDue] = useState("");
  const [newStatus, setNewStatus] = useState<CrmTaskStatus>("todo");
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);

  const total = tasks.length;
  const done = tasks.filter((t) => t.status === "done").length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  const byStatus = useMemo(() => {
    const map: Record<CrmTaskStatus, ProjectTask[]> = { todo: [], doing: [], done: [] };
    for (const task of tasks) map[task.status].push(task);
    return map;
  }, [tasks]);

  async function addTask() {
    const title = newTitle.trim();
    if (!title || saving) return;
    setSaving(true);
    const {
      data: { user }
    } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("crm_tasks")
      .insert({
        company_id: companyId,
        project_id: project.id,
        assignee_id: user?.id ?? null,
        title,
        status: newStatus,
        due_date: newDue || null
      })
      .select("id, title, status, due_date, created_at, project_id")
      .single();
    setSaving(false);
    if (error || !data) {
      showToast("Não foi possível criar a tarefa.", "error");
      return;
    }
    setTasks((current) => [...current, data as ProjectTask]);
    setNewTitle("");
    setNewDue("");
    setAdding(false);
  }

  async function moveTask(task: ProjectTask, direction: -1 | 1) {
    const index = ORDER.indexOf(task.status);
    const next = ORDER[index + direction];
    if (!next) return;
    const previous = tasks;
    setTasks((current) => current.map((t) => (t.id === task.id ? { ...t, status: next } : t)));
    const { error } = await supabase.from("crm_tasks").update({ status: next }).eq("id", task.id);
    if (error) {
      setTasks(previous);
      showToast("Não foi possível mover a tarefa.", "error");
    }
  }

  async function removeTask(id: string) {
    const previous = tasks;
    setTasks((current) => current.filter((t) => t.id !== id));
    const { error } = await supabase.from("crm_tasks").delete().eq("id", id);
    if (error) {
      setTasks(previous);
      showToast("Não foi possível excluir.", "error");
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <Link className="text-xs font-semibold text-muted transition hover:text-ink" href="/projetos">← Projetos</Link>

      <div className="mb-4 mt-2 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">{project.name || "Projeto sem nome"}</h1>
          <div className="mt-2 flex items-center gap-3">
            <div className="h-2 w-48 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-sm text-muted">{done}/{total} concluídas · {pct}%</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-full bg-slate-100 p-1 text-sm font-medium">
            {([["board", "Quadro"], ["list", "Lista"]] as const).map(([key, label]) => (
              <button className={`rounded-full px-3 py-1.5 transition ${view === key ? "bg-brand text-white shadow-sm" : "text-slate-500 hover:text-ink"}`} key={key} onClick={() => setView(key)} type="button">{label}</button>
            ))}
          </div>
          <button
            className="inline-flex h-10 items-center gap-1.5 rounded-full bg-brand px-4 text-sm font-semibold text-white shadow-sm ring-1 ring-[#002D72]/20 transition hover:bg-[#003a94] active:bg-[#001F4D]"
            onClick={() => setAdding((v) => !v)}
            type="button"
          >
            <svg fill="none" height="16" stroke="currentColor" strokeLinecap="round" strokeWidth="2" viewBox="0 0 24 24" width="16"><path d="M12 5v14M5 12h14" /></svg>
            Nova tarefa
          </button>
        </div>
      </div>

      {adding ? (
        <div className="mb-4 flex flex-wrap items-end gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
          <label className="min-w-[14rem] flex-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Título
            <input autoFocus className="mt-1 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-normal text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20" onChange={(e) => setNewTitle(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") void addTask(); }} placeholder="O que precisa ser feito?" value={newTitle} />
          </label>
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Coluna
            <select className="mt-1 h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-normal text-ink outline-none focus:border-brand" onChange={(e) => setNewStatus(e.target.value as CrmTaskStatus)} value={newStatus}>
              {COLUMNS.map((c) => (<option key={c.key} value={c.key}>{c.label}</option>))}
            </select>
          </label>
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Prazo
            <input className="mt-1 h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-normal text-ink outline-none focus:border-brand" onChange={(e) => setNewDue(e.target.value)} type="date" value={newDue} />
          </label>
          <button className="inline-flex h-11 items-center justify-center rounded-full bg-brand px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#003a94] disabled:opacity-60" disabled={saving || !newTitle.trim()} onClick={() => void addTask()} type="button">{saving ? "Salvando…" : "Adicionar"}</button>
        </div>
      ) : null}

      {view === "board" ? (
        <div className="grid gap-4 md:grid-cols-3">
          {COLUMNS.map((col) => (
            <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-black/5" key={col.key}>
              <div className="mb-3 flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${col.dot}`} />
                  <span className="text-sm font-semibold text-ink">{col.label}</span>
                </div>
                <span className="text-xs font-semibold text-muted">{byStatus[col.key].length}</span>
              </div>
              <div className="space-y-2">
                {byStatus[col.key].map((task) => {
                  const idx = ORDER.indexOf(task.status);
                  const due = fmtDate(task.due_date);
                  return (
                    <div className="group rounded-xl bg-white p-3 shadow-sm ring-1 ring-black/5" key={task.id}>
                      <p className={`text-sm ${task.status === "done" ? "text-muted line-through" : "font-medium text-ink"}`}>{task.title}</p>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-xs text-muted">{due ? `📅 ${due}` : ""}</span>
                        <div className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
                          <button aria-label="Voltar" className="flex h-6 w-6 items-center justify-center rounded text-slate-400 transition hover:bg-slate-100 hover:text-ink disabled:opacity-30" disabled={idx === 0} onClick={() => void moveTask(task, -1)} type="button"><svg fill="none" height="14" stroke="currentColor" strokeLinecap="round" strokeWidth="2" viewBox="0 0 24 24" width="14"><path d="m15 18-6-6 6-6" /></svg></button>
                          <button aria-label="Avançar" className="flex h-6 w-6 items-center justify-center rounded text-slate-400 transition hover:bg-slate-100 hover:text-ink disabled:opacity-30" disabled={idx === ORDER.length - 1} onClick={() => void moveTask(task, 1)} type="button"><svg fill="none" height="14" stroke="currentColor" strokeLinecap="round" strokeWidth="2" viewBox="0 0 24 24" width="14"><path d="m9 18 6-6-6-6" /></svg></button>
                          <button aria-label="Excluir" className="flex h-6 w-6 items-center justify-center rounded text-rose-400 transition hover:bg-rose-50 hover:text-rose-600" onClick={() => void removeTask(task.id)} type="button"><svg fill="none" height="14" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24" width="14"><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /></svg></button>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {byStatus[col.key].length === 0 ? <p className="px-1 py-4 text-center text-xs text-slate-400">Sem tarefas</p> : null}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
          {tasks.length === 0 ? (
            <p className="px-6 py-16 text-center text-sm text-muted">Nenhuma tarefa neste projeto.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  <th className="px-4 py-3">Tarefa</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Prazo</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {tasks.map((task) => {
                  const col = COLUMNS.find((c) => c.key === task.status);
                  const due = fmtDate(task.due_date);
                  return (
                    <tr key={task.id}>
                      <td className={`px-4 py-3 ${task.status === "done" ? "text-muted line-through" : "font-medium text-ink"}`}>{task.title}</td>
                      <td className="px-4 py-3"><span className="inline-flex items-center gap-1.5 text-sm text-slate-600"><span className={`h-2 w-2 rounded-full ${col?.dot}`} />{col?.label}</span></td>
                      <td className="px-4 py-3 text-muted">{due ?? "—"}</td>
                      <td className="px-4 py-3 text-right">
                        <button className="text-xs font-semibold text-rose-600 hover:underline" onClick={() => void removeTask(task.id)} type="button">Excluir</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </main>
  );
}
