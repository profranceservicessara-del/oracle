"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useToast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";
import type { TimeEntryRow } from "@/lib/crm/queries";
import { QUICK_DURATIONS, TIME_ENTRY_TYPES, minutesToHM, parseHM } from "@/lib/time";

export type ProjectOpt = { id: string; name: string; client_id: string | null };
export type ClientOpt = { id: string; name: string };
export type TaskOpt = { id: string; title: string; project_id: string | null };
export type MemberOpt = { userId: string; name: string };

const inputCls = "h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20";
const chip = "rounded-full border border-slate-300 px-2.5 py-1 text-xs font-medium text-brand transition hover:bg-brand/5";

export function NovoHorarioModal({
  companyId,
  userId,
  members,
  projects,
  clients,
  tasks,
  initialDate,
  prefillTaskId,
  onClose,
  onSaved
}: {
  companyId: string;
  userId: string;
  members: MemberOpt[];
  projects: ProjectOpt[];
  clients: ClientOpt[];
  tasks: TaskOpt[];
  initialDate: string;
  prefillTaskId?: string | null;
  onClose: () => void;
  onSaved: (entry: TimeEntryRow) => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const { showToast } = useToast();
  const prefillTask = tasks.find((t) => t.id === prefillTaskId) ?? null;
  const prefillProject = prefillTask ? projects.find((p) => p.id === prefillTask.project_id) ?? null : null;

  const [actual, setActual] = useState("0:00");
  const [planned, setPlanned] = useState("0:00");
  const [date, setDate] = useState(initialDate);
  const [entryUser, setEntryUser] = useState(userId);
  const [entryType, setEntryType] = useState("");
  const [billable, setBillable] = useState(true);
  const [comment, setComment] = useState("");
  const [projectId, setProjectId] = useState(prefillProject?.id ?? "");
  const [clientId, setClientId] = useState(prefillProject?.client_id ?? "");
  const [taskId, setTaskId] = useState(prefillTaskId ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const projectTasks = useMemo(() => tasks.filter((t) => !projectId || t.project_id === projectId), [tasks, projectId]);
  const which = parseHM(planned) > 0 ? "planejado" : "realizado";

  function pickProject(id: string) {
    setProjectId(id);
    const p = projects.find((x) => x.id === id);
    if (p?.client_id) setClientId(p.client_id);
    if (id) setTaskId((cur) => (tasks.find((t) => t.id === cur)?.project_id === id ? cur : ""));
  }

  function applyQuick(minutes: number) {
    if (which === "planejado" || parseHM(actual) === 0) setActual(minutesToHM(minutes));
    else setActual(minutesToHM(minutes));
  }

  async function save() {
    if (saving) return;
    const a = parseHM(actual);
    const p = parseHM(planned);
    const next: Record<string, string> = {};
    if (a <= 0 && p <= 0) next.duration = "Informe tempo realizado ou planejado (> 0).";
    if (!date) next.date = "Data obrigatória.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSaving(true);
    const { data, error } = await supabase
      .from("crm_time_entries")
      .insert({
        company_id: companyId,
        user_id: entryUser,
        project_id: projectId || null,
        client_id: clientId || null,
        task_id: taskId || null,
        entry_type: entryType || "trabalho",
        billable,
        planned_minutes: p,
        actual_minutes: a,
        entry_date: date,
        comment: comment.trim() || null
      })
      .select("*, crm_projects(name), crm_clients(name), crm_tasks(title)")
      .single();
    setSaving(false);
    if (error || !data) {
      showToast("Não foi possível salvar o horário.", "error");
      return;
    }
    const row = data as Record<string, unknown>;
    const norm = (v: unknown) => (Array.isArray(v) ? v[0] ?? null : v ?? null);
    showToast("Horário registrado.", "success");
    onSaved({
      ...(row as TimeEntryRow),
      crm_projects: norm(row.crm_projects) as { name: string } | null,
      crm_clients: norm(row.crm_clients) as { name: string } | null,
      crm_tasks: norm(row.crm_tasks) as { title: string } | null
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button aria-label="Fechar" className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={onClose} type="button" />
      <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="text-lg font-bold text-ink">Novo horário</h2>
          <button aria-label="Fechar" className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 ring-1 ring-black/5 transition hover:bg-slate-50 hover:text-ink" onClick={onClose} type="button"><svg fill="none" height="16" stroke="currentColor" strokeLinecap="round" strokeWidth="2" viewBox="0 0 24 24" width="16"><path d="M18 6 6 18M6 6l12 12" /></svg></button>
        </header>

        <div className="grid flex-1 gap-5 overflow-y-auto px-5 py-5 sm:grid-cols-[1fr_15rem]">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Tempo alcançado"><input className={inputCls} inputMode="numeric" onChange={(e) => setActual(e.target.value)} placeholder="0:00" value={actual} /></Field>
              <Field label="Horário planejado"><input className={inputCls} inputMode="numeric" onChange={(e) => setPlanned(e.target.value)} placeholder="0:00" value={planned} /></Field>
            </div>
            {errors.duration ? <p className="-mt-2 text-xs text-rose-600">{errors.duration}</p> : null}
            <div className="flex flex-wrap gap-2">
              {QUICK_DURATIONS.map((q) => (<button className={chip} key={q.minutes} onClick={() => applyQuick(q.minutes)} type="button">{q.label}</button>))}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Data"><input className={inputCls} max="2100-12-31" min="2000-01-01" onChange={(e) => setDate(e.target.value)} type="date" value={date} />{errors.date ? <p className="mt-1 text-xs text-rose-600">{errors.date}</p> : null}</Field>
              <Field label="Usuário">
                <select className={inputCls} onChange={(e) => setEntryUser(e.target.value)} value={entryUser}>
                  {members.map((m) => (<option key={m.userId} value={m.userId}>{m.name}</option>))}
                </select>
              </Field>
            </div>

            <div className="grid grid-cols-2 items-end gap-3">
              <Field label="Tipo">
                <select className={inputCls} onChange={(e) => setEntryType(e.target.value)} value={entryType}>
                  <option value="">Selecione…</option>
                  {TIME_ENTRY_TYPES.map((t) => (<option key={t.value} value={t.value}>{t.label}</option>))}
                </select>
              </Field>
              <label className="flex h-11 cursor-pointer items-center gap-2.5">
                <input checked={billable} className="h-4 w-4 accent-emerald-600" onChange={(e) => setBillable(e.target.checked)} type="checkbox" />
                <span className="text-sm font-medium text-ink">Faturável</span>
              </label>
            </div>

            <Field label="Comentário"><textarea className={`${inputCls} min-h-[64px] resize-y py-2`} maxLength={500} onChange={(e) => setComment(e.target.value)} placeholder="Adicione um comentário…" value={comment} /></Field>
          </div>

          <div className="space-y-4 border-t border-line pt-4 sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Link para</p>
            <Field label="Projeto">
              <select className={inputCls} onChange={(e) => pickProject(e.target.value)} value={projectId}>
                <option value="">Nenhum</option>
                {projects.map((p) => (<option key={p.id} value={p.id}>{p.name || "Projeto sem nome"}</option>))}
              </select>
            </Field>
            <Field label="Cliente">
              <select className={inputCls} onChange={(e) => setClientId(e.target.value)} value={clientId}>
                <option value="">Nenhum</option>
                {clients.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
              </select>
            </Field>
            {projectId ? (
              <Field label="Tarefa">
                <select className={inputCls} onChange={(e) => setTaskId(e.target.value)} value={taskId}>
                  <option value="">Nenhuma</option>
                  {projectTasks.map((t) => (<option key={t.id} value={t.id}>{t.title}</option>))}
                </select>
              </Field>
            ) : null}
          </div>
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-line px-5 py-4">
          <button className="inline-flex h-11 items-center justify-center rounded border border-slate-200 px-5 text-sm font-semibold text-ink transition hover:bg-slate-50" onClick={onClose} type="button">Cancelar</button>
          <button className="inline-flex h-11 items-center justify-center rounded bg-brand px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#003a94] disabled:opacity-60" disabled={saving} onClick={() => void save()} type="button">{saving ? "Salvando…" : "Salvar"}</button>
        </footer>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (<label className="block"><span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>{children}</label>);
}
