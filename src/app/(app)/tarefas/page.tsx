"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";

// Produtividade > Tarefas. Frontend-only: sem tabela/API de tarefas no projeto,
// então as tarefas ficam em estado local (somem ao recarregar).

const tabs = ["Todas as minhas tarefas", "Hoje", "Tarde", "Em breve", "Finalizado"] as const;

type Task = { id: number; title: string; description: string };

export default function TarefasPage() {
  const { showToast } = useToast();
  const [tab, setTab] = useState<(typeof tabs)[number]>("Todas as minhas tarefas");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [seq, setSeq] = useState(1);

  function soon() {
    showToast("Disponível em breve.", "info");
  }

  function reset() {
    setTitle("");
    setDescription("");
  }

  function addTask() {
    if (!title.trim()) return;
    setTasks((current) => [...current, { id: seq, title: title.trim(), description: description.trim() }]);
    setSeq((n) => n + 1);
    reset();
    showToast("Tarefa adicionada.", "success");
  }

  function focusInput() {
    const el = document.getElementById("task-title");
    el?.focus();
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

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

      {/* Task creation */}
      <div className="mb-6 flex items-center justify-between gap-3">
        <h2 className="font-semibold text-ink">{tab}</h2>
        <button className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline" onClick={focusInput} type="button">
          <span className="text-base leading-none">+</span> Adicionar uma tarefa
        </button>
      </div>

      <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
        <Input
          className="border-0 px-1 text-base font-medium shadow-none focus:ring-0"
          id="task-title"
          onChange={(event) => setTitle(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addTask();
            }
          }}
          placeholder="ex. : Commander les cartons pour emballer le produit"
          value={title}
        />
        <Textarea
          className="mt-1 min-h-16 border-0 px-1 text-sm shadow-none focus:ring-0"
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Description"
          value={description}
        />
        <div className="mt-2 flex flex-wrap gap-2 border-t border-line pt-3">
          <Pill icon="📅" label="Planejar" onClick={soon} />
          <Pill icon="🗂️" label="Associar-se a um projeto" onClick={soon} />
          <Pill icon="🚩" label="Prioridade" onClick={soon} />
        </div>
      </div>

      <div className="mt-4 flex items-center justify-end gap-3">
        <button className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100" onClick={reset} type="button">
          Cancelar
        </button>
        <button
          className="rounded-xl bg-[#1D4ED8] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1743B8] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
          disabled={!title.trim()}
          onClick={addTask}
          type="button"
        >
          Adicionar uma tarefa
        </button>
      </div>

      {/* List / empty state */}
      {tasks.length === 0 ? (
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
          {tasks.map((task) => (
            <li className="flex items-start gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5" key={task.id}>
              <input aria-label="Concluir" className="mt-0.5 h-5 w-5 rounded accent-[#1D4ED8]" type="checkbox" />
              <div className="min-w-0">
                <p className="font-medium text-ink">{task.title}</p>
                {task.description ? <p className="mt-0.5 text-sm text-muted">{task.description}</p> : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

function Pill({ icon, label, onClick }: { icon: string; label: string; onClick: () => void }) {
  return (
    <button className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50" onClick={onClick} type="button">
      <span>{icon}</span>
      {label}
    </button>
  );
}
