"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { t, type Locale, type TranslationKey } from "@/lib/i18n/dictionaries";
import { createClient } from "@/lib/supabase/client";
import type { CompanyTask } from "@/lib/crm/queries";
import type { CrmTaskStatus } from "@/lib/crm/types";

const taskNext: Record<CrmTaskStatus, CrmTaskStatus> = { todo: "doing", doing: "done", done: "todo" };
const taskStatusKey: Record<CrmTaskStatus, TranslationKey> = {
  todo: "task.todo",
  doing: "task.doing",
  done: "task.done"
};
const taskStatusClass: Record<CrmTaskStatus, string> = {
  todo: "bg-slate-100 text-slate-600 hover:bg-slate-200",
  doing: "bg-sky-100 text-sky-700 hover:bg-sky-200",
  done: "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
};

export function AgendaClient({ initialTasks, locale }: { initialTasks: CompanyTask[]; locale: Locale }) {
  const supabase = useMemo(() => createClient(), []);
  const [tasks, setTasks] = useState(initialTasks);
  const [hideDone, setHideDone] = useState(true);

  const today = new Date().toISOString().slice(0, 10);
  const visible = useMemo(() => (hideDone ? tasks.filter((task) => task.status !== "done") : tasks), [tasks, hideDone]);

  async function cycle(task: CompanyTask) {
    const next = taskNext[task.status];
    const { data, error } = await supabase
      .from("crm_tasks")
      .update({ status: next })
      .eq("id", task.id)
      .select("*")
      .single();
    if (!error && data) {
      setTasks((current) => current.map((item) => (item.id === task.id ? { ...item, status: (data as { status: CrmTaskStatus }).status } : item)));
    }
  }

  function formatDue(due: string) {
    return new Date(`${due}T00:00:00`).toLocaleDateString(locale === "pt" ? "pt-BR" : "fr-FR", {
      day: "2-digit",
      month: "short"
    });
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <Link className="text-sm font-semibold text-muted transition hover:text-ink" href="/crm">
        ← {t(locale, "agenda.back")}
      </Link>

      <div className="mb-6 mt-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">{t(locale, "agenda.title")}</h1>
          <p className="mt-1 text-sm text-muted">{t(locale, "agenda.subtitle")}</p>
        </div>
        <label className="flex cursor-pointer items-center gap-2 rounded-2xl bg-white px-3 py-2 text-sm font-medium text-slate-600 ring-1 ring-black/5">
          <input checked={hideDone} className="h-4 w-4 accent-[#002D72]" onChange={(event) => setHideDone(event.target.checked)} type="checkbox" />
          {t(locale, "agenda.hideDone")}
        </label>
      </div>

      {visible.length === 0 ? (
        <div className="rounded-2xl bg-white px-6 py-16 text-center text-sm text-muted shadow-sm ring-1 ring-black/5">
          {t(locale, "agenda.empty")}
        </div>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
          {visible.map((task) => {
            const overdue = task.due_date && task.status !== "done" && task.due_date < today;
            return (
              <li className="flex flex-wrap items-center justify-between gap-3 px-5 py-3" key={task.id}>
                <div className="min-w-0 flex-1">
                  <p className={task.status === "done" ? "text-muted line-through" : "font-medium text-ink"}>{task.title}</p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted">
                    {task.client_id && task.crm_clients ? (
                      <Link className="font-medium text-[#002D72] hover:underline" href={`/crm/${task.client_id}`}>
                        {task.crm_clients.name}
                      </Link>
                    ) : (
                      <span>{t(locale, "agenda.noClient")}</span>
                    )}
                    {task.due_date ? (
                      <span className={overdue ? "font-semibold text-rose-600" : ""}>
                        · {formatDue(task.due_date)}
                        {overdue ? ` · ${t(locale, "agenda.overdue")}` : ""}
                      </span>
                    ) : null}
                  </p>
                </div>
                <button
                  className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition ${taskStatusClass[task.status]}`}
                  onClick={() => void cycle(task)}
                  type="button"
                >
                  {t(locale, taskStatusKey[task.status])}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
