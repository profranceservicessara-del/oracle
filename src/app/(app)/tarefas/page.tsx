"use client";

import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";

// Produtividade > Tarefas — CRM inline de tarefas. Frontend-only: sem tabela/API
// de tarefas no projeto, então tudo fica em estado local (some ao recarregar).

const tabs = ["Todas as minhas tarefas", "Hoje", "Tarde", "Em breve", "Finalizado"] as const;
type Tab = (typeof tabs)[number];

type Period = "hoje" | "tarde" | "em_breve" | "sem_prazo";
type Priority = "baixa" | "media" | "alta" | "urgente";

const periodLabels: Record<Period, string> = { hoje: "Hoje", tarde: "Tarde", em_breve: "Em breve", sem_prazo: "Sem prazo" };
const priorityLabels: Record<Priority, string> = { baixa: "Baixa", media: "Média", alta: "Alta", urgente: "Urgente" };
const priorityStyles: Record<Priority, string> = {
  baixa: "bg-slate-100 text-slate-600",
  media: "bg-blue-100 text-blue-700",
  alta: "bg-amber-100 text-amber-700",
  urgente: "bg-rose-100 text-rose-700"
};
const projects = ["Administrativo", "Cliente", "Financeiro", "Documentos"];

type Task = {
  id: number;
  title: string;
  description: string;
  dueDate: string;
  period: Period | null;
  project: string | null;
  priority: Priority | null;
  done: boolean;
  createdAt: string;
};

const emptyForm = { title: "", description: "", dueDate: "", period: null as Period | null, project: null as string | null, priority: null as Priority | null };

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}
function fmtDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
}

export default function TarefasPage() {
  const { showToast } = useToast();
  const [tab, setTab] = useState<Tab>("Todas as minhas tarefas");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [seq, setSeq] = useState(1);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [pop, setPop] = useState<"planejar" | "projeto" | "prioridade" | null>(null);
  const composeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!pop) return;
    function onDown(event: MouseEvent) {
      if (composeRef.current && !composeRef.current.contains(event.target as Node)) setPop(null);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [pop]);

  function soon() {
    showToast("Disponível em breve.", "info");
  }

  function set<K extends keyof typeof emptyForm>(key: K, value: (typeof emptyForm)[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
    setPop(null);
  }

  function submit() {
    if (!form.title.trim()) return;
    if (editingId !== null) {
      setTasks((current) => current.map((t) => (t.id === editingId ? { ...t, ...form, title: form.title.trim(), description: form.description.trim() } : t)));
      showToast("Tarefa atualizada.", "success");
    } else {
      setTasks((current) => [
        ...current,
        { id: seq, ...form, title: form.title.trim(), description: form.description.trim(), done: false, createdAt: todayISO() }
      ]);
      setSeq((n) => n + 1);
      showToast("Tarefa adicionada.", "success");
    }
    resetForm();
  }

  function editTask(task: Task) {
    setEditingId(task.id);
    setForm({ title: task.title, description: task.description, dueDate: task.dueDate, period: task.period, project: task.project, priority: task.priority });
    setPop(null);
    focusInput();
  }

  function toggleDone(id: number) {
    setTasks((current) => current.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  }

  function removeTask(id: number) {
    setTasks((current) => current.filter((t) => t.id !== id));
    if (editingId === id) resetForm();
  }

  function focusInput() {
    const el = document.getElementById("task-title");
    el?.focus();
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  const visible = tasks.filter((t) => {
    if (tab === "Finalizado") return t.done;
    if (t.done) return false;
    if (tab === "Hoje") return t.period === "hoje";
    if (tab === "Tarde") return t.period === "tarde";
    if (tab === "Em breve") return t.period === "em_breve";
    return true; // Todas as minhas tarefas
  });

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="flex items-center gap-2.5 text-2xl font-semibold text-ink">
          <span className="text-[#1D4ED8]">
            <svg fill="none" height="22" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24" width="22"><rect height="7" rx="1" width="7" x="3" y="3" /><rect height="7" rx="1" width="7" x="14" y="3" /><rect height="7" rx="1" width="7" x="14" y="14" /><rect height="7" rx="1" width="7" x="3" y="14" /></svg>
          </span>
          Tarefas
        </h1>
        <button className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-ink shadow-sm transition hover:bg-slate-50" onClick={soon} type="button">
          Saber mais
        </button>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex flex-wrap gap-x-6 gap-y-1 border-b border-line">
        {tabs.map((label) => (
          <button
            className={`relative -mb-px border-b-2 px-1 py-2.5 text-sm font-medium transition ${tab === label ? "border-[#1D4ED8] text-[#1D4ED8]" : "border-transparent text-slate-500 hover:text-ink"}`}
            key={label}
            onClick={() => setTab(label)}
            type="button"
          >
            {label}
          </button>
        ))}
      </div>

      {/* Info card */}
      <div className="mb-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
        <p className="font-semibold text-ink">Gerencie suas tarefas</p>
        <p className="mt-1 text-sm text-muted">Adicione, planeje e associe suas tarefas a um projeto para manter a organização.</p>
        <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
          <button className="inline-flex items-center gap-1.5 font-medium text-brand hover:underline" onClick={soon} type="button">📘 Como funciona?</button>
          <button className="inline-flex items-center gap-1.5 font-medium text-brand hover:underline" onClick={soon} type="button">❓ Perguntas frequentes sobre produtividade</button>
        </div>
      </div>

      {/* Compose */}
      <div className="mb-6 flex items-center justify-between gap-3">
        <h2 className="font-semibold text-ink">{editingId !== null ? "Editar tarefa" : tab}</h2>
        <button className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline" onClick={focusInput} type="button">
          <span className="text-base leading-none">+</span> Adicionar uma tarefa
        </button>
      </div>

      <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5" ref={composeRef}>
        <Input
          className="border-0 px-1 text-base font-medium shadow-none focus:ring-0"
          id="task-title"
          onChange={(event) => set("title", event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              submit();
            }
          }}
          placeholder="ex. : Commander les cartons pour emballer le produit"
          value={form.title}
        />
        <Textarea
          className="mt-1 min-h-16 border-0 px-1 text-sm shadow-none focus:ring-0"
          onChange={(event) => set("description", event.target.value)}
          placeholder="Description"
          value={form.description}
        />
        <div className="mt-2 flex flex-wrap gap-2 border-t border-line pt-3">
          {/* Planejar */}
          <PopPill
            active={pop === "planejar"}
            icon="📅"
            label={form.period ? periodLabels[form.period] : form.dueDate ? fmtDate(form.dueDate) : "Planejar"}
            onToggle={() => setPop((p) => (p === "planejar" ? null : "planejar"))}
            selected={Boolean(form.period || form.dueDate)}
          >
            <label className="block text-xs font-medium text-slate-500">
              Data de vencimento
              <Input className="mt-1" onChange={(event) => set("dueDate", event.target.value)} type="date" value={form.dueDate} />
            </label>
            <div className="mt-2 grid grid-cols-2 gap-1.5">
              {(Object.keys(periodLabels) as Period[]).map((p) => (
                <button
                  className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${form.period === p ? "bg-[#EAF1FF] text-[#1D4ED8] ring-1 ring-[#D7E2FF]" : "bg-slate-50 text-slate-600 hover:bg-slate-100"}`}
                  key={p}
                  onClick={() => {
                    set("period", p);
                    setPop(null);
                  }}
                  type="button"
                >
                  {periodLabels[p]}
                </button>
              ))}
            </div>
          </PopPill>

          {/* Projeto */}
          <PopPill
            active={pop === "projeto"}
            icon="🗂️"
            label={form.project ?? "Associar-se a um projeto"}
            onToggle={() => setPop((p) => (p === "projeto" ? null : "projeto"))}
            selected={Boolean(form.project)}
          >
            <p className="mb-1 text-xs font-medium text-slate-500">Projeto / Cliente</p>
            <div className="grid gap-1">
              {projects.map((proj) => (
                <button
                  className={`rounded-lg px-2.5 py-1.5 text-left text-xs font-medium transition ${form.project === proj ? "bg-[#EAF1FF] text-[#1D4ED8]" : "text-slate-600 hover:bg-slate-50"}`}
                  key={proj}
                  onClick={() => {
                    set("project", proj);
                    setPop(null);
                  }}
                  type="button"
                >
                  {proj}
                </button>
              ))}
            </div>
          </PopPill>

          {/* Prioridade */}
          <PopPill
            active={pop === "prioridade"}
            icon="🚩"
            label={form.priority ? priorityLabels[form.priority] : "Prioridade"}
            onToggle={() => setPop((p) => (p === "prioridade" ? null : "prioridade"))}
            selected={Boolean(form.priority)}
          >
            <div className="grid gap-1">
              {(Object.keys(priorityLabels) as Priority[]).map((p) => (
                <button
                  className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-slate-600 transition hover:bg-slate-50"
                  key={p}
                  onClick={() => {
                    set("priority", p);
                    setPop(null);
                  }}
                  type="button"
                >
                  <span className={`h-2 w-2 rounded-full ${priorityStyles[p].split(" ")[0]}`} />
                  {priorityLabels[p]}
                </button>
              ))}
            </div>
          </PopPill>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-end gap-3">
        <button className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100" onClick={resetForm} type="button">
          Cancelar
        </button>
        <button
          className="rounded-xl bg-[#1D4ED8] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1743B8] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
          disabled={!form.title.trim()}
          onClick={submit}
          type="button"
        >
          {editingId !== null ? "Salvar tarefa" : "Adicionar uma tarefa"}
        </button>
      </div>

      {/* List / empty state */}
      {visible.length === 0 ? (
        <div className="mt-8 flex flex-col items-center gap-2 py-8 text-center">
          <span className="mb-2 flex h-24 w-24 items-center justify-center rounded-full bg-[#EAF1FF] text-5xl">🌳</span>
          <p className="text-xl font-bold text-[#0F2E6B]">O que você precisa fazer?</p>
          <p className="text-sm text-muted">Todas as suas tarefas serão exibidas aqui.</p>
          <button className="mt-2 rounded-xl bg-[#1D4ED8] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1743B8]" onClick={focusInput} type="button">
            Criar uma tarefa
          </button>
        </div>
      ) : (
        <ul className="mt-6 space-y-2">
          {visible.map((task) => (
            <li className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5" key={task.id}>
              <div className="flex items-start gap-3">
                <input aria-label="Concluir" checked={task.done} className="mt-1 h-5 w-5 shrink-0 rounded accent-[#1D4ED8]" onChange={() => toggleDone(task.id)} type="checkbox" />
                <div className="min-w-0 flex-1">
                  <p className={`font-medium text-ink ${task.done ? "text-slate-400 line-through" : ""}`}>{task.title}</p>
                  {task.description ? <p className="mt-0.5 text-sm text-muted">{task.description}</p> : null}
                  <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
                    <span className={`rounded-full px-2 py-0.5 font-semibold ${task.done ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{task.done ? "Concluída" : "Pendente"}</span>
                    {task.priority ? <span className={`rounded-full px-2 py-0.5 font-semibold ${priorityStyles[task.priority]}`}>{priorityLabels[task.priority]}</span> : null}
                    {task.period ? <span className="rounded-full bg-indigo-50 px-2 py-0.5 font-medium text-indigo-600">{periodLabels[task.period]}</span> : null}
                    {task.dueDate ? <span className="rounded-full bg-slate-50 px-2 py-0.5 text-slate-500 ring-1 ring-black/5">📅 {fmtDate(task.dueDate)}</span> : null}
                    {task.project ? <span className="rounded-full bg-slate-50 px-2 py-0.5 text-slate-500 ring-1 ring-black/5">🗂️ {task.project}</span> : null}
                    <span className="text-slate-400">Criada em {fmtDate(task.createdAt)}</span>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button aria-label="Editar" className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-ink" onClick={() => editTask(task)} title="Editar" type="button">
                    <svg fill="none" height="16" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" viewBox="0 0 24 24" width="16"><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
                  </button>
                  <button aria-label="Excluir" className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-600" onClick={() => removeTask(task.id)} title="Excluir" type="button">
                    <svg fill="none" height="16" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" viewBox="0 0 24 24" width="16"><path d="M3 6h18" /><path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /></svg>
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

function PopPill({
  icon,
  label,
  selected,
  active,
  onToggle,
  children
}: {
  icon: string;
  label: string;
  selected: boolean;
  active: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      <button
        className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition ${selected ? "border-[#D7E2FF] bg-[#EAF1FF] text-[#1D4ED8]" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}
        onClick={onToggle}
        type="button"
      >
        <span>{icon}</span>
        {label}
      </button>
      {active ? (
        <div className="absolute left-0 top-full z-20 mt-1.5 w-60 rounded-xl bg-white p-3 shadow-xl ring-1 ring-black/10">{children}</div>
      ) : null}
    </div>
  );
}
