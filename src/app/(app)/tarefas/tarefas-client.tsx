"use client";

import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";
import type { CrmTask, CrmTaskStatus } from "@/lib/crm/types";

// Produtividade > Tarefas — persistido em crm_tasks (RLS por company_member).
// A tabela só tem title/status/due_date, então período e "finalizado" são
// DERIVADOS de due_date + status. Sem colunas de prioridade/projeto/descrição:
// controles não persistíveis foram removidos para não recriar estado volátil.

const tabs = ["Todas as minhas tarefas", "Hoje", "Tarde", "Em breve", "Finalizado"] as const;
type Tab = (typeof tabs)[number];

type Task = Pick<CrmTask, "id" | "title" | "status" | "due_date" | "created_at">;

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}
function addDaysISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
function fmtDate(iso: string | null): string {
  if (!iso) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
}

const emptyForm = { title: "", dueDate: "" };

export function TarefasClient({ companyId, initialTasks }: { companyId: string | null; initialTasks: Task[] }) {
  const { showToast } = useToast();
  const supabase = createClient();
  const [tab, setTab] = useState<Tab>("Todas as minhas tarefas");
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showPlan, setShowPlan] = useState(false);
  const composeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showPlan) return;
    function onDown(event: MouseEvent) {
      if (composeRef.current && !composeRef.current.contains(event.target as Node)) setShowPlan(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [showPlan]);

  function set<K extends keyof typeof emptyForm>(key: K, value: (typeof emptyForm)[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
    setShowPlan(false);
  }

  function focusInput() {
    const el = document.getElementById("task-title");
    el?.focus();
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  async function submit() {
    const title = form.title.trim();
    if (!title || saving) return;
    if (!companyId) {
      showToast("Não foi possível carregar sua empresa. Recarregue a página.", "error");
      return;
    }
    const dueDate = form.dueDate || null;
    setSaving(true);

    if (editingId !== null) {
      const previous = tasks;
      setTasks((current) => current.map((t) => (t.id === editingId ? { ...t, title, due_date: dueDate } : t)));
      const { error } = await supabase.from("crm_tasks").update({ title, due_date: dueDate }).eq("id", editingId);
      setSaving(false);
      if (error) {
        setTasks(previous);
        showToast("Não foi possível salvar a tarefa.", "error");
        return;
      }
      showToast("Tarefa atualizada.", "success");
      resetForm();
      return;
    }

    const {
      data: { user }
    } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("crm_tasks")
      .insert({ company_id: companyId, assignee_id: user?.id ?? null, title, status: "todo", due_date: dueDate })
      .select("id, title, status, due_date, created_at")
      .single();
    setSaving(false);
    if (error || !data) {
      showToast("Não foi possível adicionar a tarefa.", "error");
      return;
    }
    setTasks((current) => [data as Task, ...current]);
    showToast("Tarefa adicionada.", "success");
    resetForm();
  }

  function editTask(task: Task) {
    setEditingId(task.id);
    setForm({ title: task.title, dueDate: task.due_date ?? "" });
    setShowPlan(false);
    focusInput();
  }

  async function toggleDone(task: Task) {
    const next: CrmTaskStatus = task.status === "done" ? "todo" : "done";
    const previous = tasks;
    setTasks((current) => current.map((t) => (t.id === task.id ? { ...t, status: next } : t)));
    const { error } = await supabase.from("crm_tasks").update({ status: next }).eq("id", task.id);
    if (error) {
      setTasks(previous);
      showToast("Não foi possível atualizar a tarefa.", "error");
    }
  }

  async function removeTask(id: string) {
    const previous = tasks;
    setTasks((current) => current.filter((t) => t.id !== id));
    if (editingId === id) resetForm();
    const { error } = await supabase.from("crm_tasks").delete().eq("id", id);
    if (error) {
      setTasks(previous);
      showToast("Não foi possível excluir a tarefa.", "error");
      return;
    }
    showToast("Tarefa excluída.", "success");
  }

  const today = todayISO();
  const visible = tasks.filter((t) => {
    const done = t.status === "done";
    if (tab === "Finalizado") return done;
    if (done) return false;
    if (tab === "Hoje") return t.due_date === today;
    if (tab === "Tarde") return Boolean(t.due_date && t.due_date < today);
    if (tab === "Em breve") return !t.due_date || t.due_date > today;
    return true; // Todas as minhas tarefas (pendentes)
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
        <p className="mt-1 text-sm text-muted">Adicione e planeje suas tarefas. Elas ficam salvas na sua conta.</p>
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
              void submit();
            }
          }}
          placeholder="ex.: Preparar o orçamento do cliente"
          value={form.title}
        />
        <div className="mt-2 flex flex-wrap gap-2 border-t border-line pt-3">
          <div className="relative">
            <button
              className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition ${form.dueDate ? "border-[#D7E2FF] bg-[#EAF1FF] text-[#1D4ED8]" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}
              onClick={() => setShowPlan((v) => !v)}
              type="button"
            >
              <span>📅</span>
              {form.dueDate ? fmtDate(form.dueDate) : "Planejar"}
            </button>
            {showPlan ? (
              <div className="absolute left-0 top-full z-20 mt-1.5 w-60 rounded-xl bg-white p-3 shadow-xl ring-1 ring-black/10">
                <label className="block text-xs font-medium text-slate-500">
                  Data de vencimento
                  <Input className="mt-1" onChange={(event) => set("dueDate", event.target.value)} type="date" value={form.dueDate} />
                </label>
                <div className="mt-2 grid grid-cols-2 gap-1.5">
                  {[
                    { label: "Hoje", value: todayISO() },
                    { label: "Amanhã", value: addDaysISO(1) },
                    { label: "Em 7 dias", value: addDaysISO(7) },
                    { label: "Sem prazo", value: "" }
                  ].map((preset) => (
                    <button
                      className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${form.dueDate === preset.value ? "bg-[#EAF1FF] text-[#1D4ED8] ring-1 ring-[#D7E2FF]" : "bg-slate-50 text-slate-600 hover:bg-slate-100"}`}
                      key={preset.label}
                      onClick={() => {
                        set("dueDate", preset.value);
                        setShowPlan(false);
                      }}
                      type="button"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-end gap-3">
        <button className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100" onClick={resetForm} type="button">
          Cancelar
        </button>
        <button
          className="rounded-xl bg-[#1D4ED8] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1743B8] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
          disabled={!form.title.trim() || saving}
          onClick={() => void submit()}
          type="button"
        >
          {saving ? "Salvando…" : editingId !== null ? "Salvar tarefa" : "Adicionar uma tarefa"}
        </button>
      </div>

      {/* List / empty state */}
      {visible.length === 0 ? (
        <div className="mt-8 flex flex-col items-center gap-2 py-8 text-center">
          <span className="mb-2 flex h-24 w-24 items-center justify-center rounded-full bg-[#EAF1FF] text-5xl">🌳</span>
          <p className="text-xl font-bold text-[#0F2E6B]">O que você precisa fazer?</p>
          <p className="text-sm text-muted">
            {tab === "Finalizado" ? "Nenhuma tarefa finalizada ainda." : "Todas as suas tarefas serão exibidas aqui."}
          </p>
          {tab !== "Finalizado" ? (
            <button className="mt-2 rounded-xl bg-[#1D4ED8] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1743B8]" onClick={focusInput} type="button">
              Criar uma tarefa
            </button>
          ) : null}
        </div>
      ) : (
        <ul className="mt-6 space-y-2">
          {visible.map((task) => {
            const done = task.status === "done";
            const overdue = !done && task.due_date && task.due_date < today;
            return (
              <li className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5" key={task.id}>
                <div className="flex items-start gap-3">
                  <input aria-label="Concluir" checked={done} className="mt-1 h-5 w-5 shrink-0 rounded accent-[#1D4ED8]" onChange={() => void toggleDone(task)} type="checkbox" />
                  <div className="min-w-0 flex-1">
                    <p className={`font-medium text-ink ${done ? "text-slate-400 line-through" : ""}`}>{task.title || "(Sem título)"}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
                      <span className={`rounded-full px-2 py-0.5 font-semibold ${done ? "bg-emerald-100 text-emerald-700" : overdue ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-600"}`}>
                        {done ? "Concluída" : overdue ? "Atrasada" : "Pendente"}
                      </span>
                      {task.due_date ? <span className="rounded-full bg-slate-50 px-2 py-0.5 text-slate-500 ring-1 ring-black/5">📅 {fmtDate(task.due_date)}</span> : null}
                      <span className="text-slate-400">Criada em {fmtDate(task.created_at)}</span>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button aria-label="Editar" className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-ink" onClick={() => editTask(task)} title="Editar" type="button">
                      <svg fill="none" height="16" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" viewBox="0 0 24 24" width="16"><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
                    </button>
                    <button aria-label="Excluir" className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-600" onClick={() => void removeTask(task.id)} title="Excluir" type="button">
                      <svg fill="none" height="16" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" viewBox="0 0 24 24" width="16"><path d="M3 6h18" /><path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /></svg>
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
