"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useToast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";
import type { ProjectTask } from "@/lib/crm/queries";
import type { CrmProject, CrmProjectStatus, CrmTaskPriority, CrmTaskStatus } from "@/lib/crm/types";

// Evita anos absurdos (ex.: 2563) vindos do campo de data nativo.
function saneDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const year = Number(iso.slice(0, 4));
  return year >= 2000 && year <= 2100 ? iso : null;
}

const COLUMNS: { key: CrmTaskStatus; label: string; dot: string }[] = [
  { key: "todo", label: "A fazer", dot: "bg-slate-400" },
  { key: "doing", label: "Em andamento", dot: "bg-blue-500" },
  { key: "done", label: "Concluído", dot: "bg-emerald-500" }
];
const ORDER: CrmTaskStatus[] = ["todo", "doing", "done"];

const PRIORITY: Record<CrmTaskPriority, { label: string; chip: string; dot: string }> = {
  none: { label: "Não definido", chip: "bg-slate-100 text-slate-500", dot: "bg-slate-300" },
  low: { label: "Fraca", chip: "bg-sky-100 text-sky-700", dot: "bg-sky-400" },
  medium: { label: "Média", chip: "bg-amber-100 text-amber-700", dot: "bg-amber-500" },
  high: { label: "Alta", chip: "bg-rose-100 text-rose-700", dot: "bg-rose-500" }
};
const PRIORITY_KEYS: CrmTaskPriority[] = ["high", "medium", "low", "none"];

function fmtDate(iso: string | null) {
  if (!iso) return null;
  return new Date(`${iso}T00:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

const inputCls =
  "h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20";

export function ProjectBoardClient({
  companyId,
  project: initialProject,
  initialTasks
}: {
  companyId: string;
  project: CrmProject;
  initialTasks: ProjectTask[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const { showToast } = useToast();
  const [project, setProject] = useState(initialProject);
  const [editingProject, setEditingProject] = useState(false);
  const [tasks, setTasks] = useState(initialTasks);
  const [view, setView] = useState<"summary" | "board" | "list">("summary");
  const [newTitle, setNewTitle] = useState("");
  const [newDue, setNewDue] = useState("");
  const [newStatus, setNewStatus] = useState<CrmTaskStatus>("todo");
  const [newPriority, setNewPriority] = useState<CrmTaskPriority>("none");
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  const topLevel = useMemo(() => tasks.filter((t) => !t.parent_task_id), [tasks]);
  const total = topLevel.length;
  const done = topLevel.filter((t) => t.status === "done").length;
  const doing = topLevel.filter((t) => t.status === "doing").length;
  const todo = topLevel.filter((t) => t.status === "todo").length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const todayIso = new Date().toLocaleDateString("en-CA");
  const overdue = topLevel.filter((t) => t.status !== "done" && t.due_date && t.due_date < todayIso).length;
  const dueToday = topLevel.filter((t) => t.status !== "done" && t.due_date === todayIso).length;

  const byStatus = useMemo(() => {
    const map: Record<CrmTaskStatus, ProjectTask[]> = { todo: [], doing: [], done: [] };
    for (const task of topLevel) map[task.status].push(task);
    return map;
  }, [topLevel]);

  const detailTask = detailId ? tasks.find((t) => t.id === detailId) ?? null : null;
  const subtasks = useMemo(
    () => (detailId ? tasks.filter((t) => t.parent_task_id === detailId) : []),
    [tasks, detailId]
  );

  async function insertTask(fields: { title: string; status: CrmTaskStatus; priority: CrmTaskPriority; due_date: string | null; parent_task_id: string | null }) {
    const {
      data: { user }
    } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("crm_tasks")
      .insert({
        company_id: companyId,
        project_id: project.id,
        assignee_id: user?.id ?? null,
        title: fields.title,
        status: fields.status,
        priority: fields.priority,
        due_date: fields.due_date,
        parent_task_id: fields.parent_task_id
      })
      .select("id, title, description, status, priority, due_date, created_at, project_id, parent_task_id")
      .single();
    if (error || !data) {
      showToast("Não foi possível criar a tarefa.", "error");
      return null;
    }
    setTasks((current) => [...current, data as ProjectTask]);
    return data as ProjectTask;
  }

  async function addTask() {
    const title = newTitle.trim();
    if (!title || saving) return;
    setSaving(true);
    const created = await insertTask({ title, status: newStatus, priority: newPriority, due_date: newDue || null, parent_task_id: null });
    setSaving(false);
    if (created) {
      setNewTitle("");
      setNewDue("");
      setNewPriority("none");
      setAdding(false);
    }
  }

  async function updateTask(id: string, patch: Partial<ProjectTask>) {
    const previous = tasks;
    setTasks((current) => current.map((t) => (t.id === id ? { ...t, ...patch } : t)));
    const { error } = await supabase.from("crm_tasks").update(patch).eq("id", id);
    if (error) {
      setTasks(previous);
      showToast("Não foi possível salvar.", "error");
    }
  }

  async function moveTask(task: ProjectTask, direction: -1 | 1) {
    const next = ORDER[ORDER.indexOf(task.status) + direction];
    if (next) await updateTask(task.id, { status: next });
  }

  async function removeTask(id: string) {
    const previous = tasks;
    setTasks((current) => current.filter((t) => t.id !== id && t.parent_task_id !== id));
    if (detailId === id) setDetailId(null);
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
            {([["summary", "Resumo"], ["board", "Quadro"], ["list", "Lista"]] as const).map(([key, label]) => (
              <button className={`rounded-full px-3 py-1.5 transition ${view === key ? "bg-brand text-white shadow-sm" : "text-slate-500 hover:text-ink"}`} key={key} onClick={() => setView(key)} type="button">{label}</button>
            ))}
          </div>
          <button className="inline-flex h-10 items-center gap-1.5 rounded-full bg-brand px-4 text-sm font-semibold text-white shadow-sm ring-1 ring-[#002D72]/20 transition hover:bg-[#003a94] active:bg-[#001F4D]" onClick={() => setAdding((v) => !v)} type="button">
            <svg fill="none" height="16" stroke="currentColor" strokeLinecap="round" strokeWidth="2" viewBox="0 0 24 24" width="16"><path d="M12 5v14M5 12h14" /></svg>
            Nova tarefa
          </button>
        </div>
      </div>

      {adding ? (
        <div className="mb-4 flex flex-wrap items-end gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
          <label className="min-w-[12rem] flex-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Título
            <input autoFocus className={`mt-1 font-normal ${inputCls}`} onChange={(e) => setNewTitle(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") void addTask(); }} placeholder="O que precisa ser feito?" value={newTitle} />
          </label>
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Coluna
            <select className={`mt-1 font-normal ${inputCls}`} onChange={(e) => setNewStatus(e.target.value as CrmTaskStatus)} value={newStatus}>
              {COLUMNS.map((c) => (<option key={c.key} value={c.key}>{c.label}</option>))}
            </select>
          </label>
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Prioridade
            <select className={`mt-1 font-normal ${inputCls}`} onChange={(e) => setNewPriority(e.target.value as CrmTaskPriority)} value={newPriority}>
              {PRIORITY_KEYS.map((p) => (<option key={p} value={p}>{PRIORITY[p].label}</option>))}
            </select>
          </label>
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Prazo
            <input className={`mt-1 font-normal ${inputCls}`} onChange={(e) => setNewDue(e.target.value)} type="date" value={newDue} />
          </label>
          <button className="inline-flex h-11 items-center justify-center rounded-full bg-brand px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#003a94] disabled:opacity-60" disabled={saving || !newTitle.trim()} onClick={() => void addTask()} type="button">{saving ? "Salvando…" : "Adicionar"}</button>
        </div>
      ) : null}

      {view === "summary" ? (
        <div className="grid gap-4 lg:grid-cols-3">
          {/* Elementos criados */}
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5 lg:col-span-3">
            <p className="mb-4 text-sm font-semibold text-ink">Elementos do projeto</p>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className={`text-3xl font-bold ${overdue > 0 ? "text-rose-600" : "text-ink"}`}>{overdue}</p>
                <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Tarefas atrasadas</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-ink">{dueToday}</p>
                <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Tarefas hoje</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-ink">{total}</p>
                <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Total de tarefas</p>
              </div>
            </div>
          </div>

          {/* Progresso do projeto (donut) */}
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5 lg:col-span-2">
            <p className="mb-4 text-sm font-semibold text-ink">Progresso do projeto</p>
            <div className="flex flex-col items-center gap-5 sm:flex-row sm:justify-center">
              <ProgressDonut done={done} doing={doing} todo={todo} total={total} />
              <div className="space-y-2 text-sm">
                <Legend color="bg-slate-400" count={todo} label="Pendente" />
                <Legend color="bg-blue-500" count={doing} label="Em andamento" />
                <Legend color="bg-emerald-500" count={done} label="Concluído" />
                <p className="pt-1 text-xs text-muted">Total {total}</p>
              </div>
            </div>
            <div className="mt-5">
              <div className="mb-1 text-center text-sm font-medium text-ink">{pct}% do projeto concluído</div>
              <div className="h-2.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} /></div>
            </div>
          </div>

          {/* Informações do projeto */}
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-ink">Informações do projeto</p>
              <button aria-label="Editar projeto" className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-ink" onClick={() => setEditingProject(true)} type="button">
                <svg fill="none" height="15" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24" width="15"><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
              </button>
            </div>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Status</dt>
                <dd className="mt-0.5 text-ink">{project.status === "active" ? "Ativo" : project.status === "on_hold" ? "Em espera" : project.status === "done" ? "Concluído" : "Arquivado"}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Datas</dt>
                <dd className="mt-0.5 text-ink">
                  de {project.start_date ? fmtDate(project.start_date) : "—"} a {project.end_date ? fmtDate(project.end_date) : "indefinido"}
                </dd>
              </div>
            </dl>
          </div>

          {/* Detalhamento por status */}
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5 lg:col-span-3">
            <p className="mb-4 text-sm font-semibold text-ink">Detalhamento por status</p>
            {total === 0 ? (
              <p className="text-sm text-muted">Nenhuma tarefa neste projeto ainda.</p>
            ) : (
              <div className="space-y-3">
                {([["todo", todo], ["doing", doing], ["done", done]] as const).map(([key, count]) => {
                  const col = COLUMNS.find((c) => c.key === key);
                  const w = total > 0 ? Math.round((count / total) * 100) : 0;
                  return (
                    <div className="flex items-center gap-3" key={key}>
                      <span className="w-32 shrink-0 text-sm text-slate-600">{col?.label}</span>
                      <div className="h-4 flex-1 overflow-hidden rounded bg-slate-100">
                        <div className={`flex h-full items-center justify-end rounded px-2 text-[11px] font-semibold text-white ${col?.dot}`} style={{ width: `${Math.max(count > 0 ? 8 : 0, w)}%` }}>{count > 0 ? count : ""}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : view === "board" ? (
        <div className="grid gap-4 md:grid-cols-3">
          {COLUMNS.map((col) => (
            <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-black/5" key={col.key}>
              <div className="mb-3 flex items-center justify-between px-1">
                <div className="flex items-center gap-2"><span className={`h-2.5 w-2.5 rounded-full ${col.dot}`} /><span className="text-sm font-semibold text-ink">{col.label}</span></div>
                <span className="text-xs font-semibold text-muted">{byStatus[col.key].length}</span>
              </div>
              <div className="space-y-2">
                {byStatus[col.key].map((task) => {
                  const idx = ORDER.indexOf(task.status);
                  const start = fmtDate(task.start_date);
                  const due = fmtDate(task.due_date);
                  const dateLabel = start && due ? `${start} – ${due}` : due || start;
                  const subCount = tasks.filter((t) => t.parent_task_id === task.id);
                  const subDone = subCount.filter((t) => t.status === "done").length;
                  return (
                    <div className="group cursor-pointer rounded-xl bg-white p-3 shadow-sm ring-1 ring-black/5 transition hover:ring-brand/40" key={task.id} onClick={() => setDetailId(task.id)}>
                      <p className={`text-sm ${task.status === "done" ? "text-muted line-through" : "font-medium text-ink"}`}>{task.title}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        {task.priority !== "none" ? <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${PRIORITY[task.priority].chip}`}>{PRIORITY[task.priority].label}</span> : null}
                        {dateLabel ? <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">📅 {dateLabel}</span> : null}
                        {subCount.length > 0 ? <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">☑ {subDone}/{subCount.length}</span> : null}
                        {(task.skills ?? []).slice(0, 2).map((skill) => (<span className="rounded bg-brand/10 px-1.5 py-0.5 text-[10px] font-medium text-brand" key={skill}>{skill}</span>))}
                      </div>
                      <div className="mt-2 flex items-center justify-end gap-1 opacity-0 transition group-hover:opacity-100">
                        <button aria-label="Voltar" className="flex h-6 w-6 items-center justify-center rounded text-slate-400 transition hover:bg-slate-100 hover:text-ink disabled:opacity-30" disabled={idx === 0} onClick={(e) => { e.stopPropagation(); void moveTask(task, -1); }} type="button"><svg fill="none" height="14" stroke="currentColor" strokeLinecap="round" strokeWidth="2" viewBox="0 0 24 24" width="14"><path d="m15 18-6-6 6-6" /></svg></button>
                        <button aria-label="Avançar" className="flex h-6 w-6 items-center justify-center rounded text-slate-400 transition hover:bg-slate-100 hover:text-ink disabled:opacity-30" disabled={idx === ORDER.length - 1} onClick={(e) => { e.stopPropagation(); void moveTask(task, 1); }} type="button"><svg fill="none" height="14" stroke="currentColor" strokeLinecap="round" strokeWidth="2" viewBox="0 0 24 24" width="14"><path d="m9 18 6-6-6-6" /></svg></button>
                        <button aria-label="Excluir" className="flex h-6 w-6 items-center justify-center rounded text-rose-400 transition hover:bg-rose-50 hover:text-rose-600" onClick={(e) => { e.stopPropagation(); void removeTask(task.id); }} type="button"><svg fill="none" height="14" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24" width="14"><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /></svg></button>
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
          {topLevel.length === 0 ? (
            <p className="px-6 py-16 text-center text-sm text-muted">Nenhuma tarefa neste projeto.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  <th className="px-4 py-3">Tarefa</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Prioridade</th>
                  <th className="px-4 py-3">Prazo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {topLevel.map((task) => {
                  const col = COLUMNS.find((c) => c.key === task.status);
                  return (
                    <tr className="cursor-pointer transition hover:bg-slate-50" key={task.id} onClick={() => setDetailId(task.id)}>
                      <td className={`px-4 py-3 ${task.status === "done" ? "text-muted line-through" : "font-medium text-ink"}`}>{task.title}</td>
                      <td className="px-4 py-3"><span className="inline-flex items-center gap-1.5 text-sm text-slate-600"><span className={`h-2 w-2 rounded-full ${col?.dot}`} />{col?.label}</span></td>
                      <td className="px-4 py-3">{task.priority !== "none" ? <span className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${PRIORITY[task.priority].chip}`}>{PRIORITY[task.priority].label}</span> : <span className="text-muted">—</span>}</td>
                      <td className="px-4 py-3 text-muted">{fmtDate(task.due_date) ?? "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {detailTask ? (
        <TaskDetailModal
          companyId={companyId}
          onClose={() => setDetailId(null)}
          onDelete={() => void removeTask(detailTask.id)}
          onDeleteTask={(id) => void removeTask(id)}
          onInsertSubtask={(title) => insertTask({ title, status: "todo", priority: "none", due_date: null, parent_task_id: detailTask.id })}
          onUpdate={updateTask}
          projectId={project.id}
          subtasks={subtasks}
          supabase={supabase}
          task={detailTask}
        />
      ) : null}

      {editingProject ? (
        <EditProjectModal
          onClose={() => setEditingProject(false)}
          onSaved={(patch) => { setProject((p) => ({ ...p, ...patch })); setEditingProject(false); }}
          project={project}
          supabase={supabase}
        />
      ) : null}
    </main>
  );
}

function TaskDetailModal({
  task,
  subtasks,
  onClose,
  onUpdate,
  onDelete,
  onDeleteTask,
  onInsertSubtask
}: {
  companyId: string;
  projectId: string;
  supabase: ReturnType<typeof createClient>;
  task: ProjectTask;
  subtasks: ProjectTask[];
  onClose: () => void;
  onUpdate: (id: string, patch: Partial<ProjectTask>) => Promise<void> | void;
  onDelete: () => void;
  onDeleteTask: (id: string) => void;
  onInsertSubtask: (title: string) => Promise<ProjectTask | null>;
}) {
  const [description, setDescription] = useState(task.description ?? "");
  const [newSub, setNewSub] = useState("");
  const [addingSub, setAddingSub] = useState(false);
  const [newSkill, setNewSkill] = useState("");
  const subDone = subtasks.filter((s) => s.status === "done").length;
  const subPct = subtasks.length > 0 ? Math.round((subDone / subtasks.length) * 100) : 0;
  const skills = task.skills ?? [];
  const statusMeta = COLUMNS.find((c) => c.key === task.status);
  const nextStatus = ORDER[ORDER.indexOf(task.status) + 1];

  async function addSub() {
    const title = newSub.trim();
    if (!title || addingSub) return;
    setAddingSub(true);
    const created = await onInsertSubtask(title);
    setAddingSub(false);
    if (created) setNewSub("");
  }

  function addSkill() {
    const value = newSkill.trim();
    if (!value || skills.includes(value)) { setNewSkill(""); return; }
    void onUpdate(task.id, { skills: [...skills, value] });
    setNewSkill("");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button aria-label="Fechar" className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={onClose} type="button" />
      <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-line px-5 py-4">
          <input
            className="w-full rounded-lg px-1 text-lg font-bold text-ink outline-none transition hover:bg-slate-50 focus:bg-slate-50"
            defaultValue={task.title}
            onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== task.title) void onUpdate(task.id, { title: v }); }}
          />
          <button aria-label="Fechar" className="ml-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 ring-1 ring-black/5 transition hover:bg-slate-50 hover:text-ink" onClick={onClose} type="button"><svg fill="none" height="16" stroke="currentColor" strokeLinecap="round" strokeWidth="2" viewBox="0 0 24 24" width="16"><path d="M18 6 6 18M6 6l12 12" /></svg></button>
        </header>

        {/* Status rápido: pill + avançar + concluir */}
        <div className="flex items-center gap-2 border-b border-line bg-slate-50/60 px-5 py-2.5">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-ink ring-1 ring-black/5">
            <span className={`h-2 w-2 rounded-full ${statusMeta?.dot}`} />
            {statusMeta?.label}
          </span>
          <button
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand text-white transition hover:bg-[#003a94] disabled:opacity-40"
            disabled={!nextStatus}
            onClick={() => { if (nextStatus) void onUpdate(task.id, { status: nextStatus }); }}
            title="Avançar status"
            type="button"
          >
            <svg fill="none" height="15" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="15"><path d="m9 18 6-6-6-6" /></svg>
          </button>
          <button
            className={`flex h-7 w-7 items-center justify-center rounded-lg transition ${task.status === "done" ? "bg-emerald-500 text-white" : "bg-white text-slate-500 ring-1 ring-black/5 hover:bg-emerald-50 hover:text-emerald-600"}`}
            onClick={() => void onUpdate(task.id, { status: task.status === "done" ? "todo" : "done" })}
            title={task.status === "done" ? "Reabrir" : "Concluir"}
            type="button"
          >
            <svg fill="none" height="15" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" viewBox="0 0 24 24" width="15"><path d="M20 6 9 17l-5-5" /></svg>
          </button>
        </div>

        <div className="grid flex-1 gap-5 overflow-y-auto px-5 py-5 sm:grid-cols-[9rem_1fr]">
          {/* meta */}
          <div className="space-y-3 text-sm">
            <Meta label="Status">
              <select className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm outline-none focus:border-brand" onChange={(e) => void onUpdate(task.id, { status: e.target.value as CrmTaskStatus })} value={task.status}>
                {COLUMNS.map((c) => (<option key={c.key} value={c.key}>{c.label}</option>))}
              </select>
            </Meta>
            <Meta label="Prioridade">
              <select className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm outline-none focus:border-brand" onChange={(e) => void onUpdate(task.id, { priority: e.target.value as CrmTaskPriority })} value={task.priority}>
                {PRIORITY_KEYS.map((p) => (<option key={p} value={p}>{PRIORITY[p].label}</option>))}
              </select>
            </Meta>
            <Meta label="Início">
              <input className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm outline-none focus:border-brand" max="2100-12-31" min="2000-01-01" onChange={(e) => void onUpdate(task.id, { start_date: saneDate(e.target.value) })} type="date" value={task.start_date ?? ""} />
            </Meta>
            <Meta label="Prazo">
              <input className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm outline-none focus:border-brand" max="2100-12-31" min="2000-01-01" onChange={(e) => void onUpdate(task.id, { due_date: saneDate(e.target.value) })} type="date" value={task.due_date ?? ""} />
            </Meta>
            <Meta label="Habilidades">
              {skills.length > 0 ? (
                <div className="mb-1.5 flex flex-wrap gap-1">
                  {skills.map((skill) => (
                    <span className="inline-flex items-center gap-1 rounded-full bg-brand/10 px-2 py-0.5 text-[11px] font-medium text-brand" key={skill}>
                      {skill}
                      <button aria-label={`Remover ${skill}`} className="text-brand/60 transition hover:text-brand" onClick={() => void onUpdate(task.id, { skills: skills.filter((s) => s !== skill) })} type="button">
                        <svg fill="none" height="11" stroke="currentColor" strokeLinecap="round" strokeWidth="2.5" viewBox="0 0 24 24" width="11"><path d="M18 6 6 18M6 6l12 12" /></svg>
                      </button>
                    </span>
                  ))}
                </div>
              ) : null}
              <input
                className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm outline-none focus:border-brand"
                onChange={(e) => setNewSkill(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSkill(); } }}
                placeholder="Adicionar…"
                value={newSkill}
              />
            </Meta>
          </div>

          {/* content */}
          <div className="min-w-0 space-y-5">
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Descrição</p>
              <textarea className="min-h-[80px] w-full resize-y rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20" onBlur={() => { if ((task.description ?? "") !== description) void onUpdate(task.id, { description: description || null }); }} onChange={(e) => setDescription(e.target.value)} placeholder="Adicione uma descrição…" value={description} />
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Subtarefas ({subtasks.length})</p>
                {subtasks.length > 0 ? <span className="text-xs text-muted">{subPct}%</span> : null}
              </div>
              {subtasks.length > 0 ? (
                <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${subPct}%` }} /></div>
              ) : null}
              <ul className="space-y-1">
                {subtasks.map((sub) => (
                  <li className="group flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-slate-50" key={sub.id}>
                    <input checked={sub.status === "done"} className="h-4 w-4 accent-emerald-600" onChange={(e) => void onUpdate(sub.id, { status: e.target.checked ? "done" : "todo" })} type="checkbox" />
                    <span className={`flex-1 text-sm ${sub.status === "done" ? "text-muted line-through" : "text-ink"}`}>{sub.title}</span>
                    <button aria-label="Excluir subtarefa" className="flex h-6 w-6 items-center justify-center rounded text-rose-400 opacity-0 transition hover:bg-rose-50 hover:text-rose-600 group-hover:opacity-100" onClick={() => onDeleteTask(sub.id)} type="button"><svg fill="none" height="13" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24" width="13"><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /></svg></button>
                  </li>
                ))}
              </ul>
              {addingSub || subtasks.length === 0 ? (
                <div className="mt-2 flex items-center gap-2">
                  <input autoFocus={addingSub} className="h-9 flex-1 rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-brand" onChange={(e) => setNewSub(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") void addSub(); }} placeholder="Nova subtarefa…" value={newSub} />
                  <button className="rounded-lg bg-brand px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#003a94] disabled:opacity-50" disabled={!newSub.trim()} onClick={() => void addSub()} type="button">Adicionar</button>
                </div>
              ) : (
                <button className="mt-2 text-sm font-semibold text-brand hover:underline" onClick={() => setAddingSub(true)} type="button">+ Nova subtarefa</button>
              )}
            </div>
          </div>
        </div>

        <footer className="flex items-center justify-between border-t border-line px-5 py-3">
          <button className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-rose-600 transition hover:bg-rose-50" onClick={onDelete} type="button"><svg fill="none" height="15" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24" width="15"><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /></svg>Excluir tarefa</button>
          <button className="inline-flex h-9 items-center justify-center rounded-full bg-slate-100 px-5 text-sm font-semibold text-ink transition hover:bg-slate-200" onClick={onClose} type="button">Fechar</button>
        </footer>
      </div>
    </div>
  );
}

function Meta({ label, children }: { label: string; children: ReactNode }) {
  return (<div><p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>{children}</div>);
}

function EditProjectModal({
  project,
  supabase,
  onClose,
  onSaved
}: {
  project: CrmProject;
  supabase: ReturnType<typeof createClient>;
  onClose: () => void;
  onSaved: (patch: Partial<CrmProject>) => void;
}) {
  const { showToast } = useToast();
  const [name, setName] = useState(project.name);
  const [startDate, setStartDate] = useState(project.start_date ?? "");
  const [endDate, setEndDate] = useState(project.end_date ?? "");
  const [status, setStatus] = useState<CrmProjectStatus>(project.status);
  const [saving, setSaving] = useState(false);
  const inputCls = "h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20";

  async function save() {
    if (!name.trim()) { showToast("Dê um nome ao projeto.", "error"); return; }
    if ((startDate && !saneDate(startDate)) || (endDate && !saneDate(endDate))) {
      showToast("Data inválida. Use um ano entre 2000 e 2100.", "error");
      return;
    }
    setSaving(true);
    const patch = { name: name.trim(), start_date: saneDate(startDate), end_date: saneDate(endDate), status };
    const { error } = await supabase.from("crm_projects").update(patch).eq("id", project.id);
    setSaving(false);
    if (error) { showToast("Não foi possível salvar o projeto.", "error"); return; }
    showToast("Projeto atualizado.", "success");
    onSaved(patch);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button aria-label="Fechar" className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={onClose} type="button" />
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="text-lg font-bold text-ink">Editar projeto</h2>
          <button aria-label="Fechar" className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 ring-1 ring-black/5 transition hover:bg-slate-50 hover:text-ink" onClick={onClose} type="button"><svg fill="none" height="16" stroke="currentColor" strokeLinecap="round" strokeWidth="2" viewBox="0 0 24 24" width="16"><path d="M18 6 6 18M6 6l12 12" /></svg></button>
        </header>
        <div className="space-y-4 px-5 py-5">
          <label className="block"><span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Nome</span><input autoFocus className={inputCls} onChange={(e) => setName(e.target.value)} value={name} /></label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block"><span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Início</span><input className={inputCls} max="2100-12-31" min="2000-01-01" onChange={(e) => setStartDate(e.target.value)} type="date" value={startDate} /></label>
            <label className="block"><span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Término</span><input className={inputCls} max="2100-12-31" min="2000-01-01" onChange={(e) => setEndDate(e.target.value)} type="date" value={endDate} /></label>
          </div>
          <label className="block"><span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Status</span>
            <select className={inputCls} onChange={(e) => setStatus(e.target.value as CrmProjectStatus)} value={status}>
              <option value="active">Ativo</option>
              <option value="on_hold">Em espera</option>
              <option value="done">Concluído</option>
              <option value="archived">Arquivado</option>
            </select>
          </label>
        </div>
        <footer className="flex items-center justify-end gap-2 border-t border-line px-5 py-4">
          <button className="inline-flex h-11 items-center justify-center rounded-full border border-slate-200 px-5 text-sm font-semibold text-ink transition hover:bg-slate-50" onClick={onClose} type="button">Cancelar</button>
          <button className="inline-flex h-11 items-center justify-center rounded-full bg-brand px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#003a94] disabled:opacity-60" disabled={saving} onClick={() => void save()} type="button">{saving ? "Salvando…" : "Salvar"}</button>
        </footer>
      </div>
    </div>
  );
}

function Legend({ color, label, count }: { color: string; label: string; count: number }) {
  return (
    <p className="flex items-center gap-2 text-slate-600">
      <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
      {label} <span className="ml-auto pl-3 font-semibold tabular-nums text-ink">{count}</span>
    </p>
  );
}

function ProgressDonut({ todo, doing, done, total }: { todo: number; doing: number; done: number; total: number }) {
  const cx = 70;
  const cy = 70;
  const r = 52;
  const c = 2 * Math.PI * r;
  const segments = [
    { v: todo, color: "#94a3b8" },
    { v: doing, color: "#3b82f6" },
    { v: done, color: "#10b981" }
  ];
  let acc = 0;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <svg height="140" role="img" viewBox="0 0 140 140" width="140">
      <circle cx={cx} cy={cy} fill="none" r={r} stroke="#f1f5f9" strokeWidth="16" />
      {total > 0
        ? segments.map((s, i) => {
            const frac = s.v / total;
            const len = frac * c;
            const rot = acc * 360 - 90;
            acc += frac;
            if (s.v === 0) return null;
            return (
              <circle
                cx={cx}
                cy={cy}
                fill="none"
                key={i}
                r={r}
                stroke={s.color}
                strokeDasharray={`${len} ${c - len}`}
                strokeWidth="16"
                transform={`rotate(${rot} ${cx} ${cy})`}
              />
            );
          })
        : null}
      <text fill="#172033" fontSize="20" fontWeight="700" textAnchor="middle" x={cx} y={cy + 2}>{pct}%</text>
      <text fill="#94a3b8" fontSize="11" textAnchor="middle" x={cx} y={cy + 20}>{done}/{total}</text>
    </svg>
  );
}
