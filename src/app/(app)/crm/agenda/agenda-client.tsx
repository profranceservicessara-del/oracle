"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useToast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";
import type { AppointmentWithClient, CompanyTask } from "@/lib/crm/queries";
import type { CrmAppointmentColor } from "@/lib/crm/types";
import type { Locale } from "@/lib/i18n/dictionaries";

// ---------------------------------------------------------------------------
// Agenda — calendário de compromissos (estilo scheduling). Views Mês / Semana /
// Dia / Lista, mini-calendário, serviços e criação de compromisso. Persiste em
// crm_appointments (RLS por company). Reusa clientes do CRM no seletor.
// ---------------------------------------------------------------------------

type View = "month" | "week" | "day" | "list";
type ClientOption = { id: string; name: string };

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MONTHS = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"
];
const HOUR_HEIGHT = 48; // px por hora nas views semana/dia
const DAY_START_HOUR = 7;

const COLOR_STYLES: Record<CrmAppointmentColor, { chip: string; dot: string; block: string }> = {
  blue: { chip: "bg-blue-100 text-blue-800", dot: "bg-blue-500", block: "bg-blue-500 text-white ring-blue-600/30" },
  green: { chip: "bg-emerald-100 text-emerald-800", dot: "bg-emerald-500", block: "bg-emerald-500 text-white ring-emerald-600/30" },
  purple: { chip: "bg-violet-100 text-violet-800", dot: "bg-violet-500", block: "bg-violet-500 text-white ring-violet-600/30" },
  orange: { chip: "bg-amber-100 text-amber-800", dot: "bg-amber-500", block: "bg-amber-500 text-white ring-amber-600/30" },
  rose: { chip: "bg-rose-100 text-rose-800", dot: "bg-rose-500", block: "bg-rose-500 text-white ring-rose-600/30" }
};

const SERVICES: Array<{ label: string; minutes: number; color: CrmAppointmentColor; hint: string }> = [
  { label: "Chamada introdutória", minutes: 30, color: "green", hint: "Cliente liga para você" },
  { label: "Compromisso no escritório", minutes: 60, color: "blue", hint: "No seu local" },
  { label: "Classe / evento demo", minutes: 60, color: "purple", hint: "Sessão em grupo" }
];

// --- date helpers (local time) --------------------------------------------
function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}
function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}
function addMonths(date: Date, months: number) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}
function startOfWeek(date: Date) {
  const d = startOfDay(date);
  return addDays(d, -d.getDay());
}
function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function isoDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}
function minutesInto(iso: string) {
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes();
}
function combine(dateStr: string, timeStr: string) {
  return new Date(`${dateStr}T${timeStr}:00`);
}
function addMinutesTime(timeStr: string, minutes: number) {
  const [h, m] = timeStr.split(":").map(Number);
  const total = h * 60 + m + minutes;
  const hh = Math.floor((total % 1440) / 60);
  const mm = total % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

// Matriz de 6 semanas (42 dias) começando no domingo da 1ª semana do mês.
function monthMatrix(anchor: Date) {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const gridStart = startOfWeek(first);
  return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
}

export function AgendaClient({
  companyId,
  initialAppointments,
  clients,
  tasks
}: {
  companyId: string;
  initialAppointments: AppointmentWithClient[];
  clients: ClientOption[];
  tasks: CompanyTask[];
  locale: Locale;
}) {
  const supabase = useMemo(() => createClient(), []);
  const { showToast } = useToast();
  const [appointments, setAppointments] = useState(initialAppointments);
  const [anchor, setAnchor] = useState(() => startOfDay(new Date()));
  const [view, setView] = useState<View>("month");
  const [creating, setCreating] = useState<{ date: string } | null>(null);
  const [detail, setDetail] = useState<AppointmentWithClient | null>(null);
  const today = startOfDay(new Date());

  const byDay = useMemo(() => {
    const map = new Map<string, AppointmentWithClient[]>();
    for (const appt of appointments) {
      const key = isoDate(new Date(appt.start_at));
      const list = map.get(key) ?? [];
      list.push(appt);
      map.set(key, list);
    }
    return map;
  }, [appointments]);

  const tasksByDay = useMemo(() => {
    const map = new Map<string, CompanyTask[]>();
    for (const task of tasks) {
      if (!task.due_date) continue;
      const list = map.get(task.due_date) ?? [];
      list.push(task);
      map.set(task.due_date, list);
    }
    return map;
  }, [tasks]);

  function go(delta: number) {
    if (view === "month") setAnchor((d) => addMonths(d, delta));
    else if (view === "week") setAnchor((d) => addDays(d, delta * 7));
    else setAnchor((d) => addDays(d, delta));
  }

  const periodLabel = useMemo(() => {
    if (view === "month") return `${MONTHS[anchor.getMonth()]} de ${anchor.getFullYear()}`;
    if (view === "day") return anchor.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
    const ws = startOfWeek(anchor);
    const we = addDays(ws, 6);
    return `${ws.getDate()} – ${we.getDate()} de ${MONTHS[we.getMonth()]}, ${we.getFullYear()}`;
  }, [anchor, view]);

  async function handleDelete(id: string) {
    const previous = appointments;
    setAppointments((current) => current.filter((appt) => appt.id !== id));
    setDetail(null);
    const { error } = await supabase.from("crm_appointments").delete().eq("id", id);
    if (error) {
      setAppointments(previous);
      showToast("Não foi possível excluir o compromisso.", "error");
    } else {
      showToast("Compromisso excluído.", "success");
    }
  }

  function handleCreated(appt: AppointmentWithClient) {
    setAppointments((current) => [...current, appt].sort((a, b) => a.start_at.localeCompare(b.start_at)));
    setCreating(null);
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <Link className="text-sm font-semibold text-muted transition hover:text-ink" href="/crm">
          ← Clientes
        </Link>
      </div>

      {/* Cabeçalho */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold text-ink">Agenda</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            className="inline-flex h-9 items-center rounded-full bg-white px-4 text-sm font-semibold text-ink shadow-sm ring-1 ring-black/5 transition hover:bg-slate-50"
            onClick={() => setAnchor(startOfDay(new Date()))}
            type="button"
          >
            Hoje
          </button>
          <div className="flex items-center rounded-full bg-white shadow-sm ring-1 ring-black/5">
            <button aria-label="Anterior" className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition hover:text-ink" onClick={() => go(-1)} type="button">
              <svg fill="none" height="18" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="18"><path d="m15 18-6-6 6-6" /></svg>
            </button>
            <button aria-label="Próximo" className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition hover:text-ink" onClick={() => go(1)} type="button">
              <svg fill="none" height="18" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="18"><path d="m9 18 6-6-6-6" /></svg>
            </button>
          </div>
          <span className="min-w-[11rem] text-sm font-semibold capitalize text-ink">{periodLabel}</span>
          <div className="ml-auto flex items-center rounded-full bg-slate-100 p-1 text-sm font-medium">
            {([["month", "Mês"], ["week", "Semana"], ["day", "Dia"], ["list", "Lista"]] as const).map(([key, label]) => (
              <button
                className={`rounded-full px-3 py-1.5 transition ${view === key ? "bg-brand text-white shadow-sm" : "text-slate-500 hover:text-ink"}`}
                key={key}
                onClick={() => setView(key)}
                type="button"
              >
                {label}
              </button>
            ))}
          </div>
          <button
            className="inline-flex h-9 items-center gap-1.5 rounded-full bg-brand px-4 text-sm font-semibold text-white shadow-sm ring-1 ring-[#002D72]/20 transition hover:bg-[#003a94] active:bg-[#001F4D]"
            onClick={() => setCreating({ date: isoDate(anchor) })}
            type="button"
          >
            <svg fill="none" height="16" stroke="currentColor" strokeLinecap="round" strokeWidth="2" viewBox="0 0 24 24" width="16"><path d="M12 5v14M5 12h14" /></svg>
            Novo compromisso
          </button>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[16rem_1fr]">
        {/* Sidebar */}
        <aside className="hidden space-y-5 lg:block">
          <MiniCalendar anchor={anchor} onPick={(d) => { setAnchor(d); if (view === "month") setView("day"); }} today={today} />
          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
            <p className="mb-3 text-sm font-semibold text-ink">Serviços</p>
            <ul className="space-y-2.5">
              {SERVICES.map((service) => (
                <li className="flex items-start gap-2.5" key={service.label}>
                  <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${COLOR_STYLES[service.color].dot}`} />
                  <div className="min-w-0">
                    <p className="truncate text-sm text-ink">{service.label}</p>
                    <p className="text-xs text-muted">{service.hint} · {service.minutes} min</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        {/* Calendário */}
        <section className="min-w-0 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
          {view === "month" ? (
            <MonthView
              anchor={anchor}
              byDay={byDay}
              onNew={(date) => setCreating({ date })}
              onOpen={setDetail}
              tasksByDay={tasksByDay}
              today={today}
            />
          ) : view === "list" ? (
            <ListView appointments={appointments} onOpen={setDetail} tasks={tasks} />
          ) : (
            <TimeGridView
              anchor={anchor}
              byDay={byDay}
              days={view === "day" ? 1 : 7}
              onNew={(date) => setCreating({ date })}
              onOpen={setDetail}
              today={today}
            />
          )}
        </section>
      </div>

      {creating ? (
        <AppointmentModal
          clients={clients}
          companyId={companyId}
          initialDate={creating.date}
          onClose={() => setCreating(null)}
          onCreated={handleCreated}
          supabase={supabase}
        />
      ) : null}

      {detail ? <DetailModal appointment={detail} onClose={() => setDetail(null)} onDelete={handleDelete} /> : null}
    </main>
  );
}

// --- Mini calendário -------------------------------------------------------
function MiniCalendar({ anchor, today, onPick }: { anchor: Date; today: Date; onPick: (d: Date) => void }) {
  const [cursor, setCursor] = useState(anchor);
  useEffect(() => setCursor(anchor), [anchor]);
  const cells = monthMatrix(cursor);

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
      <div className="mb-2 flex items-center justify-between">
        <button className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-ink" onClick={() => setCursor((d) => addMonths(d, -1))} type="button">
          <svg fill="none" height="16" stroke="currentColor" strokeLinecap="round" strokeWidth="2" viewBox="0 0 24 24" width="16"><path d="m15 18-6-6 6-6" /></svg>
        </button>
        <p className="text-sm font-semibold capitalize text-ink">{MONTHS[cursor.getMonth()]} {cursor.getFullYear()}</p>
        <button className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-ink" onClick={() => setCursor((d) => addMonths(d, 1))} type="button">
          <svg fill="none" height="16" stroke="currentColor" strokeLinecap="round" strokeWidth="2" viewBox="0 0 24 24" width="16"><path d="m9 18 6-6-6-6" /></svg>
        </button>
      </div>
      <div className="grid grid-cols-7 text-center text-[10px] font-semibold uppercase text-slate-400">
        {WEEKDAYS.map((day) => <span key={day}>{day[0]}</span>)}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-0.5 text-center text-xs">
        {cells.map((date) => {
          const inMonth = date.getMonth() === cursor.getMonth();
          const isToday = sameDay(date, today);
          const isActive = sameDay(date, anchor);
          return (
            <button
              className={`flex h-7 items-center justify-center rounded-full transition ${
                isActive ? "bg-brand font-semibold text-white" : isToday ? "font-semibold text-brand" : inMonth ? "text-ink hover:bg-slate-100" : "text-slate-300 hover:bg-slate-50"
              }`}
              key={date.toISOString()}
              onClick={() => onPick(startOfDay(date))}
              type="button"
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// --- Mês -------------------------------------------------------------------
function MonthView({
  anchor,
  byDay,
  tasksByDay,
  today,
  onNew,
  onOpen
}: {
  anchor: Date;
  byDay: Map<string, AppointmentWithClient[]>;
  tasksByDay: Map<string, CompanyTask[]>;
  today: Date;
  onNew: (date: string) => void;
  onOpen: (appt: AppointmentWithClient) => void;
}) {
  const cells = monthMatrix(anchor);

  return (
    <div>
      <div className="grid grid-cols-7 border-b border-line">
        {WEEKDAYS.map((day) => (
          <div className="px-2 py-2 text-center text-xs font-semibold uppercase tracking-wide text-slate-400" key={day}>{day}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((date) => {
          const key = isoDate(date);
          const appts = byDay.get(key) ?? [];
          const dayTasks = tasksByDay.get(key) ?? [];
          const inMonth = date.getMonth() === anchor.getMonth();
          const isToday = sameDay(date, today);
          return (
            <button
              className={`group min-h-[7rem] border-b border-r border-line p-1.5 text-left align-top transition hover:bg-slate-50/70 ${inMonth ? "bg-white" : "bg-slate-50/40"}`}
              key={key}
              onClick={() => onNew(key)}
              type="button"
            >
              <div className="flex items-center justify-between">
                <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${isToday ? "bg-brand text-white" : inMonth ? "text-ink" : "text-slate-300"}`}>
                  {date.getDate()}
                </span>
                <span className="hidden text-slate-300 group-hover:inline" aria-hidden>
                  <svg fill="none" height="14" stroke="currentColor" strokeLinecap="round" strokeWidth="2" viewBox="0 0 24 24" width="14"><path d="M12 5v14M5 12h14" /></svg>
                </span>
              </div>
              <div className="mt-1 space-y-1">
                {appts.slice(0, 3).map((appt) => (
                  <span
                    className={`block truncate rounded px-1.5 py-0.5 text-[11px] font-medium ${COLOR_STYLES[appt.color].chip}`}
                    key={appt.id}
                    onClick={(event) => { event.stopPropagation(); onOpen(appt); }}
                    role="button"
                    tabIndex={-1}
                  >
                    {fmtTime(appt.start_at)} {appt.title || appt.service || appt.crm_clients?.name || "Compromisso"}
                  </span>
                ))}
                {dayTasks.slice(0, appts.length >= 3 ? 0 : 2).map((task) => (
                  <span className="block truncate rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-500" key={task.id}>
                    ✓ {task.title}
                  </span>
                ))}
                {appts.length + dayTasks.length > 3 ? (
                  <span className="block px-1 text-[11px] font-medium text-muted">+{appts.length + dayTasks.length - 3} mais</span>
                ) : null}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// --- Semana / Dia (time grid) ---------------------------------------------
function TimeGridView({
  anchor,
  days,
  byDay,
  today,
  onNew,
  onOpen
}: {
  anchor: Date;
  days: number;
  byDay: Map<string, AppointmentWithClient[]>;
  today: Date;
  onNew: (date: string) => void;
  onOpen: (appt: AppointmentWithClient) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const columns = useMemo(() => {
    const start = days === 1 ? startOfDay(anchor) : startOfWeek(anchor);
    return Array.from({ length: days }, (_, i) => addDays(start, i));
  }, [anchor, days]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = DAY_START_HOUR * HOUR_HEIGHT;
  }, []);

  const hours = Array.from({ length: 24 }, (_, i) => i);

  return (
    <div>
      {/* Cabeçalho dos dias */}
      <div className="grid border-b border-line" style={{ gridTemplateColumns: `3.5rem repeat(${days}, 1fr)` }}>
        <div />
        {columns.map((date) => {
          const isToday = sameDay(date, today);
          return (
            <div className="border-l border-line px-2 py-2 text-center" key={date.toISOString()}>
              <p className="text-[11px] font-semibold uppercase text-slate-400">{WEEKDAYS[date.getDay()]}</p>
              <p className={`mx-auto mt-0.5 flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold ${isToday ? "bg-brand text-white" : "text-ink"}`}>{date.getDate()}</p>
            </div>
          );
        })}
      </div>
      {/* Grade */}
      <div className="max-h-[calc(100vh-16rem)] overflow-y-auto" ref={scrollRef}>
        <div className="grid" style={{ gridTemplateColumns: `3.5rem repeat(${days}, 1fr)` }}>
          {/* coluna de horas */}
          <div>
            {hours.map((hour) => (
              <div className="relative border-b border-line/60 text-right" key={hour} style={{ height: HOUR_HEIGHT }}>
                <span className="absolute -top-2 right-1.5 text-[10px] text-slate-400">{hour === 0 ? "" : `${String(hour).padStart(2, "0")}:00`}</span>
              </div>
            ))}
          </div>
          {/* colunas dos dias */}
          {columns.map((date) => {
            const key = isoDate(date);
            const appts = byDay.get(key) ?? [];
            return (
              <div className="relative border-l border-line" key={key} style={{ height: 24 * HOUR_HEIGHT }}>
                {hours.map((hour) => (
                  <div
                    className="border-b border-line/60 transition hover:bg-slate-50"
                    key={hour}
                    onClick={() => onNew(key)}
                    role="button"
                    style={{ height: HOUR_HEIGHT }}
                    tabIndex={-1}
                  />
                ))}
                {appts.map((appt) => {
                  const top = (minutesInto(appt.start_at) / 60) * HOUR_HEIGHT;
                  const duration = Math.max(30, (new Date(appt.end_at).getTime() - new Date(appt.start_at).getTime()) / 60000);
                  const height = (duration / 60) * HOUR_HEIGHT;
                  return (
                    <button
                      className={`absolute left-1 right-1 overflow-hidden rounded-lg px-2 py-1 text-left text-[11px] shadow-sm ring-1 ${COLOR_STYLES[appt.color].block}`}
                      key={appt.id}
                      onClick={(event) => { event.stopPropagation(); onOpen(appt); }}
                      style={{ top, height: Math.max(24, height - 2) }}
                      type="button"
                    >
                      <span className="block truncate font-semibold">{appt.title || appt.service || "Compromisso"}</span>
                      <span className="block truncate opacity-90">{fmtTime(appt.start_at)}{appt.crm_clients ? ` · ${appt.crm_clients.name}` : ""}</span>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// --- Lista -----------------------------------------------------------------
function ListView({
  appointments,
  tasks,
  onOpen
}: {
  appointments: AppointmentWithClient[];
  tasks: CompanyTask[];
  onOpen: (appt: AppointmentWithClient) => void;
}) {
  const today = startOfDay(new Date());
  const upcoming = appointments.filter((appt) => new Date(appt.end_at) >= today);
  const groups = useMemo(() => {
    const map = new Map<string, AppointmentWithClient[]>();
    for (const appt of upcoming) {
      const key = isoDate(new Date(appt.start_at));
      const list = map.get(key) ?? [];
      list.push(appt);
      map.set(key, list);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [upcoming]);

  if (groups.length === 0) {
    return (
      <div className="px-6 py-20 text-center">
        <p className="text-sm font-medium text-ink">Nenhum compromisso agendado.</p>
        <p className="mt-1 text-sm text-muted">Clique em “Novo compromisso” para começar.</p>
        {tasks.length > 0 ? <p className="mt-3 text-xs text-muted">Você tem {tasks.length} tarefa(s) de clientes em aberto.</p> : null}
      </div>
    );
  }

  return (
    <div className="divide-y divide-line">
      {groups.map(([day, list]) => {
        const date = new Date(`${day}T00:00:00`);
        return (
          <div className="px-5 py-4" key={day}>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              {date.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}
            </p>
            <ul className="space-y-1.5">
              {list.map((appt) => (
                <li key={appt.id}>
                  <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-slate-50" onClick={() => onOpen(appt)} type="button">
                    <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${COLOR_STYLES[appt.color].dot}`} />
                    <span className="w-24 shrink-0 text-sm font-medium tabular-nums text-ink">{fmtTime(appt.start_at)}–{fmtTime(appt.end_at)}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-ink">{appt.title || appt.service || "Compromisso"}</span>
                      {appt.crm_clients ? <span className="block truncate text-xs text-muted">{appt.crm_clients.name}</span> : null}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

// --- Modal novo compromisso ------------------------------------------------
function AppointmentModal({
  companyId,
  clients,
  initialDate,
  supabase,
  onClose,
  onCreated
}: {
  companyId: string;
  clients: ClientOption[];
  initialDate: string;
  supabase: ReturnType<typeof createClient>;
  onClose: () => void;
  onCreated: (appt: AppointmentWithClient) => void;
}) {
  const { showToast } = useToast();
  const [clientId, setClientId] = useState<string>("");
  const [serviceLabel, setServiceLabel] = useState<string>(SERVICES[0]?.label ?? "");
  const [color, setColor] = useState<CrmAppointmentColor>(SERVICES[0]?.color ?? "blue");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(initialDate);
  const [startTime, setStartTime] = useState("10:00");
  const [endTime, setEndTime] = useState("11:00");
  const [location, setLocation] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  function pickService(label: string) {
    setServiceLabel(label);
    const service = SERVICES.find((item) => item.label === label);
    if (service) {
      setColor(service.color);
      setEndTime(addMinutesTime(startTime, service.minutes));
    }
  }

  function onStartChange(value: string) {
    setStartTime(value);
    const service = SERVICES.find((item) => item.label === serviceLabel);
    setEndTime(addMinutesTime(value, service?.minutes ?? 60));
  }

  async function save() {
    if (!companyId) {
      showToast("Empresa não encontrada. Recarregue a página.", "error");
      return;
    }
    const start = combine(date, startTime);
    const end = combine(date, endTime);
    if (end <= start) {
      showToast("O término deve ser depois do início.", "error");
      return;
    }
    setSaving(true);
    const { data, error } = await supabase
      .from("crm_appointments")
      .insert({
        company_id: companyId,
        client_id: clientId || null,
        title: title.trim(),
        service: serviceLabel || null,
        color,
        location: location.trim() || null,
        note: note.trim() || null,
        start_at: start.toISOString(),
        end_at: end.toISOString()
      })
      .select("*, crm_clients(name)")
      .single();
    setSaving(false);
    if (error || !data) {
      showToast("Não foi possível agendar o compromisso.", "error");
      return;
    }
    showToast("Compromisso agendado.", "success");
    onCreated(data as AppointmentWithClient);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button aria-label="Fechar" className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={onClose} type="button" />
      <div className="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="text-lg font-bold text-ink">Novo compromisso</h2>
          <button aria-label="Fechar" className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 ring-1 ring-black/5 transition hover:bg-slate-50 hover:text-ink" onClick={onClose} type="button">
            <svg fill="none" height="16" stroke="currentColor" strokeLinecap="round" strokeWidth="2" viewBox="0 0 24 24" width="16"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
          <Field label="Cliente">
            <select className={inputCls} onChange={(event) => setClientId(event.target.value)} value={clientId}>
              <option value="">Sem cliente</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>{client.name}</option>
              ))}
            </select>
          </Field>

          <Field label="Serviço">
            <select className={inputCls} onChange={(event) => pickService(event.target.value)} value={serviceLabel}>
              {SERVICES.map((service) => (
                <option key={service.label} value={service.label}>{service.label} · {service.minutes} min</option>
              ))}
            </select>
          </Field>

          <Field label="Título do compromisso">
            <input className={inputCls} onChange={(event) => setTitle(event.target.value)} placeholder="Ex.: Reunião de descoberta" value={title} />
          </Field>

          <div className="grid grid-cols-3 gap-3">
            <Field label="Data">
              <input className={inputCls} onChange={(event) => setDate(event.target.value)} type="date" value={date} />
            </Field>
            <Field label="Início">
              <input className={inputCls} onChange={(event) => onStartChange(event.target.value)} type="time" value={startTime} />
            </Field>
            <Field label="Término">
              <input className={inputCls} onChange={(event) => setEndTime(event.target.value)} type="time" value={endTime} />
            </Field>
          </div>

          <Field label="Cor">
            <div className="flex gap-2">
              {(Object.keys(COLOR_STYLES) as CrmAppointmentColor[]).map((key) => (
                <button
                  aria-label={key}
                  className={`h-7 w-7 rounded-full ${COLOR_STYLES[key].dot} ${color === key ? "ring-2 ring-offset-2 ring-slate-400" : ""}`}
                  key={key}
                  onClick={() => setColor(key)}
                  type="button"
                />
              ))}
            </div>
          </Field>

          <Field label="Local">
            <input className={inputCls} onChange={(event) => setLocation(event.target.value)} placeholder="Onde? (endereço, link, telefone…)" value={location} />
          </Field>

          <Field label="Nota ao cliente">
            <textarea className={`${inputCls} min-h-[72px] resize-y`} maxLength={280} onChange={(event) => setNote(event.target.value)} placeholder="Adicionar nota (opcional)" value={note} />
          </Field>
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-line px-5 py-4">
          <button className="inline-flex h-11 items-center justify-center rounded-full border border-slate-200 px-5 text-sm font-semibold text-ink transition hover:bg-slate-50" onClick={onClose} type="button">
            Cancelar
          </button>
          <button
            className="inline-flex h-11 items-center justify-center rounded-full bg-brand px-5 text-sm font-semibold text-white shadow-sm ring-1 ring-[#002D72]/20 transition hover:bg-[#003a94] active:bg-[#001F4D] disabled:opacity-60"
            disabled={saving}
            onClick={() => void save()}
            type="button"
          >
            {saving ? "Agendando…" : "Agendar compromisso"}
          </button>
        </footer>
      </div>
    </div>
  );
}

// --- Modal detalhes --------------------------------------------------------
function DetailModal({
  appointment,
  onClose,
  onDelete
}: {
  appointment: AppointmentWithClient;
  onClose: () => void;
  onDelete: (id: string) => void;
}) {
  const start = new Date(appointment.start_at);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button aria-label="Fechar" className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={onClose} type="button" />
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className={`h-1.5 w-full ${COLOR_STYLES[appointment.color].dot}`} />
        <div className="p-5">
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-lg font-bold text-ink">{appointment.title || appointment.service || "Compromisso"}</h2>
            <button aria-label="Fechar" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 ring-1 ring-black/5 transition hover:bg-slate-50 hover:text-ink" onClick={onClose} type="button">
              <svg fill="none" height="16" stroke="currentColor" strokeLinecap="round" strokeWidth="2" viewBox="0 0 24 24" width="16"><path d="M18 6 6 18M6 6l12 12" /></svg>
            </button>
          </div>
          <dl className="mt-4 space-y-2.5 text-sm">
            <Row label="Quando">{start.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })} · {fmtTime(appointment.start_at)}–{fmtTime(appointment.end_at)}</Row>
            {appointment.service ? <Row label="Serviço">{appointment.service}</Row> : null}
            {appointment.crm_clients ? (
              <Row label="Cliente">
                {appointment.client_id ? (
                  <Link className="font-medium text-brand hover:underline" href={`/crm/${appointment.client_id}`}>{appointment.crm_clients.name}</Link>
                ) : appointment.crm_clients.name}
              </Row>
            ) : null}
            {appointment.location ? <Row label="Local">{appointment.location}</Row> : null}
            {appointment.note ? <Row label="Nota">{appointment.note}</Row> : null}
          </dl>
          <div className="mt-5 flex items-center justify-between">
            <button className="inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-rose-600 transition hover:bg-rose-50" onClick={() => onDelete(appointment.id)} type="button">
              <svg fill="none" height="16" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24" width="16"><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /></svg>
              Excluir
            </button>
            <button className="inline-flex h-10 items-center justify-center rounded-full bg-slate-100 px-5 text-sm font-semibold text-ink transition hover:bg-slate-200" onClick={onClose} type="button">
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const inputCls =
  "h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-ink outline-none transition placeholder:text-slate-400 focus:border-brand focus:ring-2 focus:ring-brand/20";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      {children}
    </label>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex gap-3">
      <dt className="w-16 shrink-0 text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="min-w-0 flex-1 text-ink">{children}</dd>
    </div>
  );
}
