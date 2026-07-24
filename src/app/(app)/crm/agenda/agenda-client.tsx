"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useToast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";
import type { AppointmentWithClient } from "@/lib/crm/queries";
import type { CrmAppointmentColor, CrmAppointmentKind } from "@/lib/crm/types";
import type { Locale } from "@/lib/i18n/dictionaries";

// ---------------------------------------------------------------------------
// Agenda — registro de atividades: Eventos, Tarefas, Notas e Chamadas.
// Views: Calendário (Mês/Semana/Dia) + listas por tipo. Categorias coloridas,
// faturável e duração. Tudo em crm_appointments (RLS por company). Reusa
// clientes do CRM nas conexões.
// ---------------------------------------------------------------------------

type CalView = "month" | "week" | "day";
type Tab = "calendar" | "event" | "task" | "note" | "call";
type EntryKind = "event" | "task" | "note" | "call";
type ClientOption = { id: string; name: string };

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MONTHS = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"
];
const HOUR_HEIGHT = 48;
const DAY_START_HOUR = 7;

const COLOR_STYLES: Record<CrmAppointmentColor, { chip: string; dot: string; block: string; badge: string }> = {
  blue: { chip: "bg-blue-100 text-blue-800", dot: "bg-blue-500", block: "bg-blue-500 text-white ring-blue-600/30", badge: "bg-blue-100 text-blue-700" },
  green: { chip: "bg-emerald-100 text-emerald-800", dot: "bg-emerald-500", block: "bg-emerald-500 text-white ring-emerald-600/30", badge: "bg-emerald-100 text-emerald-700" },
  purple: { chip: "bg-violet-100 text-violet-800", dot: "bg-violet-500", block: "bg-violet-500 text-white ring-violet-600/30", badge: "bg-violet-100 text-violet-700" },
  orange: { chip: "bg-amber-100 text-amber-800", dot: "bg-amber-500", block: "bg-amber-500 text-white ring-amber-600/30", badge: "bg-amber-100 text-amber-700" },
  rose: { chip: "bg-rose-100 text-rose-800", dot: "bg-rose-500", block: "bg-rose-500 text-white ring-rose-600/30", badge: "bg-rose-100 text-rose-700" }
};

const CATEGORIES: { label: string; color: CrmAppointmentColor }[] = [
  { label: "Encontro", color: "green" },
  { label: "Reunião", color: "blue" },
  { label: "Mudança", color: "orange" },
  { label: "Troca de cartas", color: "rose" },
  { label: "Entrega", color: "green" },
  { label: "Outro", color: "purple" }
];

const CALL_TYPES = ["Chamada efetuada", "Chamada recebida", "Chamada agendada", "Chamada perdida"];
const DURATIONS = [
  { v: 15, l: "15 min" }, { v: 30, l: "30 min" }, { v: 45, l: "45 min" },
  { v: 60, l: "1 h" }, { v: 90, l: "1 h 30" }, { v: 120, l: "2 h" }
];

const KIND_META: Record<EntryKind, { label: string; plural: string; color: CrmAppointmentColor }> = {
  event: { label: "Evento", plural: "Eventos", color: "blue" },
  task: { label: "Tarefa", plural: "Tarefas", color: "orange" },
  note: { label: "Nota", plural: "Notas", color: "purple" },
  call: { label: "Chamada", plural: "Chamadas", color: "green" }
};

// --- date helpers (local time) --------------------------------------------
function startOfDay(date: Date) { const d = new Date(date); d.setHours(0, 0, 0, 0); return d; }
function addDays(date: Date, days: number) { const d = new Date(date); d.setDate(d.getDate() + days); return d; }
function addMonths(date: Date, months: number) { const d = new Date(date); d.setMonth(d.getMonth() + months); return d; }
function startOfWeek(date: Date) { const d = startOfDay(date); return addDays(d, -d.getDay()); }
function sameDay(a: Date, b: Date) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }
function isoDate(date: Date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; }
function fmtTime(iso: string) { return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }); }
function fmtDate(iso: string) { return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }); }
function minutesInto(iso: string) { const d = new Date(iso); return d.getHours() * 60 + d.getMinutes(); }
function combine(dateStr: string, timeStr: string) { return new Date(`${dateStr}T${timeStr}:00`); }
function addMinutesTime(timeStr: string, minutes: number) {
  const [h, m] = timeStr.split(":").map(Number);
  const total = h * 60 + m + minutes;
  return `${String(Math.floor((total % 1440) / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}
function monthMatrix(anchor: Date) {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const gridStart = startOfWeek(first);
  return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
}

// Tipo canônico p/ agrupar (compromisso legado conta como evento).
function entryKind(a: AppointmentWithClient): EntryKind {
  if (a.kind === "task" || a.kind === "note" || a.kind === "call") return a.kind;
  return "event";
}
function entryColor(a: AppointmentWithClient): CrmAppointmentColor {
  const cat = CATEGORIES.find((c) => c.label === a.category);
  if (cat) return cat.color;
  return a.color ?? KIND_META[entryKind(a)].color;
}
function entryTitle(a: AppointmentWithClient): string {
  return a.title || a.category || a.service || KIND_META[entryKind(a)].label;
}

export function AgendaClient({
  companyId,
  initialAppointments,
  clients
}: {
  companyId: string;
  initialAppointments: AppointmentWithClient[];
  clients: ClientOption[];
  tasks: unknown;
  locale: Locale;
}) {
  const supabase = useMemo(() => createClient(), []);
  const { showToast } = useToast();
  const [entries, setEntries] = useState(initialAppointments);
  const [anchor, setAnchor] = useState(() => startOfDay(new Date()));
  const [view, setView] = useState<CalView>("month");
  const [tab, setTab] = useState<Tab>("calendar");
  const [calFilter, setCalFilter] = useState<"all" | EntryKind>("all");
  const [creating, setCreating] = useState<{ date: string; kind: EntryKind } | null>(null);
  const [newMenuOpen, setNewMenuOpen] = useState(false);
  const [detail, setDetail] = useState<AppointmentWithClient | null>(null);
  const today = startOfDay(new Date());

  const filteredForCalendar = useMemo(
    () => (calFilter === "all" ? entries : entries.filter((e) => entryKind(e) === calFilter)),
    [entries, calFilter]
  );
  const byDay = useMemo(() => {
    const map = new Map<string, AppointmentWithClient[]>();
    for (const e of filteredForCalendar) {
      const key = isoDate(new Date(e.start_at));
      const list = map.get(key) ?? [];
      list.push(e);
      map.set(key, list);
    }
    return map;
  }, [filteredForCalendar]);

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
    const previous = entries;
    setEntries((cur) => cur.filter((e) => e.id !== id));
    setDetail(null);
    const { error } = await supabase.from("crm_appointments").delete().eq("id", id);
    if (error) {
      setEntries(previous);
      showToast("Não foi possível excluir.", "error");
    } else {
      showToast("Item excluído.", "success");
    }
  }

  function handleCreated(entry: AppointmentWithClient) {
    setEntries((cur) => [...cur, entry].sort((a, b) => a.start_at.localeCompare(b.start_at)));
    setCreating(null);
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "calendar", label: "Calendário" },
    { key: "event", label: "Lista de eventos" },
    { key: "task", label: "Lista de tarefas" },
    { key: "note", label: "Lista de notas" },
    { key: "call", label: "Lista de chamadas" }
  ];

  return (
    <main className="mx-auto max-w-7xl px-4 py-6">
      {/* Cabeçalho */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link className="text-xs font-semibold text-muted transition hover:text-ink" href="/crm">← Clientes</Link>
          <h1 className="text-2xl font-semibold text-ink">Agenda</h1>
        </div>
        <div className="relative">
          <button
            className="inline-flex h-10 items-center gap-1.5 rounded bg-brand px-4 text-sm font-semibold text-white shadow-sm ring-1 ring-[#002D72]/20 transition hover:bg-[#003a94] active:bg-[#001F4D]"
            onClick={() => setNewMenuOpen((v) => !v)}
            type="button"
          >
            <svg fill="none" height="16" stroke="currentColor" strokeLinecap="round" strokeWidth="2" viewBox="0 0 24 24" width="16"><path d="M12 5v14M5 12h14" /></svg>
            Novo
            <svg className={newMenuOpen ? "rotate-180" : ""} fill="none" height="14" stroke="currentColor" strokeLinecap="round" strokeWidth="2" viewBox="0 0 24 24" width="14"><path d="m6 9 6 6 6-6" /></svg>
          </button>
          {newMenuOpen ? (
            <>
              <button aria-hidden className="fixed inset-0 z-30 cursor-default" onClick={() => setNewMenuOpen(false)} tabIndex={-1} type="button" />
              <div className="absolute right-0 z-40 mt-1 w-52 overflow-hidden rounded-xl bg-white p-1 shadow-xl ring-1 ring-black/10">
                {(["event", "task", "note", "call"] as EntryKind[]).map((k) => (
                  <button
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm text-ink transition hover:bg-slate-50"
                    key={k}
                    onClick={() => { setCreating({ date: isoDate(anchor), kind: k }); setNewMenuOpen(false); }}
                    type="button"
                  >
                    <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${COLOR_STYLES[KIND_META[k].color].badge}`}><KindIcon kind={k} /></span>
                    Novo{k === "note" || k === "call" ? "a" : ""} {KIND_META[k].label.toLowerCase()}
                  </button>
                ))}
              </div>
            </>
          ) : null}
        </div>
      </div>

      {/* Abas */}
      <div className="mb-4 flex w-full gap-5 overflow-x-auto border-b border-line">
        {tabs.map((t) => (
          <button
            className={`shrink-0 border-b-2 pb-3 pt-1 text-sm font-semibold transition ${tab === t.key ? "border-brand text-brand" : "border-transparent text-slate-500 hover:text-ink"}`}
            key={t.key}
            onClick={() => setTab(t.key)}
            type="button"
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "calendar" ? (
        <>
          {/* Filtros de tipo + navegação */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center rounded-full bg-slate-100 p-1 text-sm font-medium">
              {([["all", "Todos"], ["event", "Eventos"], ["task", "Tarefas"], ["note", "Notas"], ["call", "Chamadas"]] as const).map(([key, label]) => (
                <button className={`rounded-full px-3 py-1.5 transition ${calFilter === key ? "bg-white text-ink shadow-sm ring-1 ring-black/5" : "text-slate-500 hover:text-ink"}`} key={key} onClick={() => setCalFilter(key)} type="button">{label}</button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button className="inline-flex h-9 items-center rounded bg-white px-4 text-sm font-semibold text-ink shadow-sm ring-1 ring-black/5 transition hover:bg-slate-50" onClick={() => setAnchor(startOfDay(new Date()))} type="button">Hoje</button>
              <div className="flex items-center rounded-full bg-white shadow-sm ring-1 ring-black/5">
                <button aria-label="Anterior" className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition hover:text-ink" onClick={() => go(-1)} type="button"><svg fill="none" height="18" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="18"><path d="m15 18-6-6 6-6" /></svg></button>
                <button aria-label="Próximo" className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition hover:text-ink" onClick={() => go(1)} type="button"><svg fill="none" height="18" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="18"><path d="m9 18 6-6-6-6" /></svg></button>
              </div>
              <span className="min-w-[10rem] text-sm font-semibold capitalize text-ink">{periodLabel}</span>
              <div className="flex items-center rounded-full bg-slate-100 p-1 text-sm font-medium">
                {([["month", "Mês"], ["week", "Semana"], ["day", "Dia"]] as const).map(([key, label]) => (
                  <button className={`rounded-full px-3 py-1.5 transition ${view === key ? "bg-brand text-white shadow-sm" : "text-slate-500 hover:text-ink"}`} key={key} onClick={() => setView(key)} type="button">{label}</button>
                ))}
              </div>
            </div>
          </div>

          <section className="min-w-0 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
            {view === "month" ? (
              <MonthView anchor={anchor} byDay={byDay} onNew={(date) => setCreating({ date, kind: "event" })} onOpen={setDetail} today={today} />
            ) : (
              <TimeGridView anchor={anchor} byDay={byDay} days={view === "day" ? 1 : 7} onNew={(date) => setCreating({ date, kind: "event" })} onOpen={setDetail} today={today} />
            )}
          </section>
        </>
      ) : (
        <ListView entries={entries.filter((e) => entryKind(e) === tab)} kind={tab} onNew={() => setCreating({ date: isoDate(today), kind: tab })} onOpen={setDetail} />
      )}

      {creating ? (
        <CreateModal clients={clients} companyId={companyId} initialDate={creating.date} kind={creating.kind} onClose={() => setCreating(null)} onCreated={handleCreated} supabase={supabase} />
      ) : null}
      {detail ? <DetailModal entry={detail} onClose={() => setDetail(null)} onDelete={handleDelete} /> : null}
    </main>
  );
}

function KindIcon({ kind }: { kind: EntryKind }) {
  const p = { fill: "none", height: 16, width: 16, stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 1.8, viewBox: "0 0 24 24" } as const;
  if (kind === "task") return (<svg {...p}><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>);
  if (kind === "note") return (<svg {...p}><path d="M14 3v4a1 1 0 0 0 1 1h4" /><path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2z" /><line x1="9" x2="14" y1="13" y2="13" /></svg>);
  if (kind === "call") return (<svg {...p}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" /></svg>);
  return (<svg {...p}><rect height="18" rx="2" width="18" x="3" y="4" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>);
}

function CategoryBadge({ entry }: { entry: AppointmentWithClient }) {
  const label = entry.kind === "call" ? entry.service ?? "Chamada" : entry.category;
  if (!label) return null;
  return <span className={`inline-flex rounded px-2 py-0.5 text-[11px] font-semibold ${COLOR_STYLES[entryColor(entry)].badge}`}>{label}</span>;
}

// --- Mês -------------------------------------------------------------------
function MonthView({ anchor, byDay, today, onNew, onOpen }: { anchor: Date; byDay: Map<string, AppointmentWithClient[]>; today: Date; onNew: (date: string) => void; onOpen: (e: AppointmentWithClient) => void }) {
  const cells = monthMatrix(anchor);
  return (
    <div>
      <div className="grid grid-cols-7 border-b border-line">
        {WEEKDAYS.map((d) => (<div className="px-2 py-2 text-center text-xs font-semibold uppercase tracking-wide text-slate-400" key={d}>{d}</div>))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((date) => {
          const key = isoDate(date);
          const items = byDay.get(key) ?? [];
          const inMonth = date.getMonth() === anchor.getMonth();
          const isToday = sameDay(date, today);
          return (
            <button className={`group min-h-[7rem] border-b border-r border-line p-1.5 text-left align-top transition hover:bg-slate-50/70 ${inMonth ? "bg-white" : "bg-slate-50/40"}`} key={key} onClick={() => onNew(key)} type="button">
              <div className="flex items-center justify-between">
                <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${isToday ? "bg-brand text-white" : inMonth ? "text-ink" : "text-slate-300"}`}>{date.getDate()}</span>
              </div>
              <div className="mt-1 space-y-1">
                {items.slice(0, 3).map((e) => (
                  <span className={`flex items-center gap-1 truncate rounded px-1.5 py-0.5 text-[11px] font-medium ${COLOR_STYLES[entryColor(e)].chip}`} key={e.id} onClick={(ev) => { ev.stopPropagation(); onOpen(e); }} role="button" tabIndex={-1}>
                    <span className="opacity-80">{fmtTime(e.start_at)}</span>
                    <span className="truncate">{entryTitle(e)}</span>
                  </span>
                ))}
                {items.length > 3 ? <span className="block px-1 text-[11px] font-medium text-muted">+{items.length - 3} mais</span> : null}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// --- Semana / Dia ----------------------------------------------------------
function TimeGridView({ anchor, days, byDay, today, onNew, onOpen }: { anchor: Date; days: number; byDay: Map<string, AppointmentWithClient[]>; today: Date; onNew: (date: string) => void; onOpen: (e: AppointmentWithClient) => void }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const columns = useMemo(() => {
    const start = days === 1 ? startOfDay(anchor) : startOfWeek(anchor);
    return Array.from({ length: days }, (_, i) => addDays(start, i));
  }, [anchor, days]);
  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = DAY_START_HOUR * HOUR_HEIGHT; }, []);
  const hours = Array.from({ length: 24 }, (_, i) => i);
  return (
    <div>
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
      <div className="max-h-[calc(100vh-18rem)] overflow-y-auto" ref={scrollRef}>
        <div className="grid" style={{ gridTemplateColumns: `3.5rem repeat(${days}, 1fr)` }}>
          <div>
            {hours.map((h) => (<div className="relative border-b border-line/60 text-right" key={h} style={{ height: HOUR_HEIGHT }}><span className="absolute -top-2 right-1.5 text-[10px] text-slate-400">{h === 0 ? "" : `${String(h).padStart(2, "0")}:00`}</span></div>))}
          </div>
          {columns.map((date) => {
            const key = isoDate(date);
            const items = byDay.get(key) ?? [];
            return (
              <div className="relative border-l border-line" key={key} style={{ height: 24 * HOUR_HEIGHT }}>
                {hours.map((h) => (<div className="border-b border-line/60 transition hover:bg-slate-50" key={h} onClick={() => onNew(key)} role="button" style={{ height: HOUR_HEIGHT }} tabIndex={-1} />))}
                {items.map((e) => {
                  const top = (minutesInto(e.start_at) / 60) * HOUR_HEIGHT;
                  const duration = Math.max(30, (new Date(e.end_at).getTime() - new Date(e.start_at).getTime()) / 60000);
                  return (
                    <button className={`absolute left-1 right-1 overflow-hidden rounded-lg px-2 py-1 text-left text-[11px] shadow-sm ring-1 ${COLOR_STYLES[entryColor(e)].block}`} key={e.id} onClick={(ev) => { ev.stopPropagation(); onOpen(e); }} style={{ top, height: Math.max(24, (duration / 60) * HOUR_HEIGHT - 2) }} type="button">
                      <span className="block truncate font-semibold">{entryTitle(e)}</span>
                      <span className="block truncate opacity-90">{fmtTime(e.start_at)}{e.crm_clients ? ` · ${e.crm_clients.name}` : ""}</span>
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

// --- Lista por tipo --------------------------------------------------------
function ListView({ entries, kind, onNew, onOpen }: { entries: AppointmentWithClient[]; kind: EntryKind; onNew: () => void; onOpen: (e: AppointmentWithClient) => void }) {
  const sorted = useMemo(() => [...entries].sort((a, b) => b.start_at.localeCompare(a.start_at)), [entries]);
  const meta = KIND_META[kind];

  if (sorted.length === 0) {
    return (
      <div className="rounded-2xl bg-white px-6 py-20 text-center shadow-sm ring-1 ring-black/5">
        <p className="text-sm font-medium text-ink">Nenhum(a) {meta.label.toLowerCase()} ainda.</p>
        <button className="mt-3 inline-flex h-10 items-center gap-1.5 rounded bg-brand px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#003a94]" onClick={onNew} type="button">
          <svg fill="none" height="16" stroke="currentColor" strokeLinecap="round" strokeWidth="2" viewBox="0 0 24 24" width="16"><path d="M12 5v14M5 12h14" /></svg>
          Criar {meta.label.toLowerCase()}
        </button>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            <th className="px-4 py-3">{kind === "event" ? "Início" : "Data"}</th>
            {kind === "event" ? <th className="px-4 py-3">Término</th> : null}
            <th className="px-4 py-3">Título</th>
            {kind === "call" ? <th className="px-4 py-3">Tipo</th> : kind !== "note" ? <th className="px-4 py-3">Categoria</th> : null}
            {kind === "task" || kind === "call" ? <th className="px-4 py-3">Duração</th> : null}
            <th className="px-4 py-3">Cliente</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {sorted.map((e) => (
            <tr className="cursor-pointer transition hover:bg-slate-50" key={e.id} onClick={() => onOpen(e)}>
              <td className="whitespace-nowrap px-4 py-3 text-ink">{fmtDate(e.start_at)}<span className="ml-1 text-xs text-muted">{fmtTime(e.start_at)}</span></td>
              {kind === "event" ? <td className="whitespace-nowrap px-4 py-3 text-muted">{fmtDate(e.end_at)} {fmtTime(e.end_at)}</td> : null}
              <td className="px-4 py-3 font-medium text-ink">{entryTitle(e)}</td>
              {kind === "call" ? <td className="px-4 py-3"><CategoryBadge entry={e} /></td> : kind !== "note" ? <td className="px-4 py-3"><CategoryBadge entry={e} /></td> : null}
              {kind === "task" || kind === "call" ? <td className="whitespace-nowrap px-4 py-3 text-muted">{e.duration_minutes ? `${e.duration_minutes} min` : "—"}</td> : null}
              <td className="px-4 py-3 text-muted">
                {e.crm_clients ? (e.client_id ? <Link className="font-medium text-brand hover:underline" href={`/crm/${e.client_id}`} onClick={(ev) => ev.stopPropagation()}>{e.crm_clients.name}</Link> : e.crm_clients.name) : "—"}
              </td>
              <td className="px-4 py-3 text-right">
                {e.billable ? <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">Faturável</span> : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// --- Modal de criação (4 tipos) -------------------------------------------
function CreateModal({ companyId, kind, clients, initialDate, supabase, onClose, onCreated }: {
  companyId: string; kind: EntryKind; clients: ClientOption[]; initialDate: string;
  supabase: ReturnType<typeof createClient>; onClose: () => void; onCreated: (e: AppointmentWithClient) => void;
}) {
  const { showToast } = useToast();
  const meta = KIND_META[kind];
  const [clientId, setClientId] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]?.label ?? "");
  const [callType, setCallType] = useState(CALL_TYPES[0]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(initialDate);
  const [startTime, setStartTime] = useState("10:00");
  const [endTime, setEndTime] = useState("11:00");
  const [duration, setDuration] = useState(30);
  const [location, setLocation] = useState("");
  const [maxParticipants, setMaxParticipants] = useState("");
  const [billable, setBillable] = useState(false);
  const [saving, setSaving] = useState(false);

  const showCategory = kind === "event" || kind === "task" || kind === "note";
  const showDuration = kind === "task" || kind === "call";
  const showTime = kind !== "note";

  async function save() {
    if (!companyId) { showToast("Empresa não encontrada. Recarregue a página.", "error"); return; }
    const time = kind === "note" ? "09:00" : startTime;
    const start = combine(date, time);
    let end: Date;
    if (kind === "event") {
      end = combine(date, endTime);
      if (end <= start) { showToast("O término deve ser depois do início.", "error"); return; }
    } else if (showDuration) {
      end = new Date(start.getTime() + duration * 60000);
    } else {
      end = start;
    }
    setSaving(true);
    const color = kind === "call" ? KIND_META.call.color : CATEGORIES.find((c) => c.label === category)?.color ?? meta.color;
    const { data, error } = await supabase
      .from("crm_appointments")
      .insert({
        company_id: companyId,
        kind,
        client_id: clientId || null,
        title: title.trim(),
        category: showCategory ? category : null,
        service: kind === "call" ? callType : null,
        color,
        billable,
        duration_minutes: showDuration ? duration : null,
        max_participants: kind === "event" && maxParticipants ? Number(maxParticipants) : null,
        location: kind === "event" ? location.trim() || null : null,
        note: description.trim() || null,
        start_at: start.toISOString(),
        end_at: end.toISOString()
      })
      .select("*, crm_clients(name)")
      .single();
    setSaving(false);
    if (error || !data) { showToast(`Não foi possível criar ${meta.label.toLowerCase()}.`, "error"); return; }
    showToast(`${meta.label} criado(a).`, "success");
    onCreated(data as AppointmentWithClient);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button aria-label="Fechar" className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={onClose} type="button" />
      <div className="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="flex items-center gap-2 text-lg font-bold text-ink">
            <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${COLOR_STYLES[meta.color].badge}`}><KindIcon kind={kind} /></span>
            Novo{kind === "note" || kind === "call" ? "a" : ""} {meta.label.toLowerCase()}
          </h2>
          <button aria-label="Fechar" className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 ring-1 ring-black/5 transition hover:bg-slate-50 hover:text-ink" onClick={onClose} type="button"><svg fill="none" height="16" stroke="currentColor" strokeLinecap="round" strokeWidth="2" viewBox="0 0 24 24" width="16"><path d="M18 6 6 18M6 6l12 12" /></svg></button>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
          <Field label="Título"><input className={inputCls} onChange={(e) => setTitle(e.target.value)} placeholder="Título" value={title} /></Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Cliente / Fornecedor">
              <select className={inputCls} onChange={(e) => setClientId(e.target.value)} value={clientId}>
                <option value="">Selecione um cliente</option>
                {clients.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
              </select>
            </Field>
            {kind === "call" ? (
              <Field label="Tipo de chamada"><select className={inputCls} onChange={(e) => setCallType(e.target.value)} value={callType}>{CALL_TYPES.map((t) => (<option key={t} value={t}>{t}</option>))}</select></Field>
            ) : showCategory ? (
              <Field label="Categoria"><select className={inputCls} onChange={(e) => setCategory(e.target.value)} value={category}>{CATEGORIES.map((c) => (<option key={c.label} value={c.label}>{c.label}</option>))}</select></Field>
            ) : <div />}
          </div>

          <div className={`grid gap-3 ${kind === "event" ? "grid-cols-3" : "grid-cols-2"}`}>
            <Field label="Data"><input className={inputCls} onChange={(e) => setDate(e.target.value)} type="date" value={date} /></Field>
            {showTime ? <Field label={kind === "event" ? "Início" : "Hora"}><input className={inputCls} onChange={(e) => setStartTime(e.target.value)} type="time" value={startTime} /></Field> : null}
            {kind === "event" ? <Field label="Término"><input className={inputCls} onChange={(e) => setEndTime(e.target.value)} type="time" value={endTime} /></Field> : null}
            {showDuration ? <Field label="Duração"><select className={inputCls} onChange={(e) => setDuration(Number(e.target.value))} value={duration}>{DURATIONS.map((d) => (<option key={d.v} value={d.v}>{d.l}</option>))}</select></Field> : null}
          </div>

          {kind === "event" ? (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Máx. de participantes"><input className={inputCls} min="1" onChange={(e) => setMaxParticipants(e.target.value)} placeholder="Ilimitado" type="number" value={maxParticipants} /></Field>
              <Field label="Local"><input className={inputCls} onChange={(e) => setLocation(e.target.value)} placeholder="Onde?" value={location} /></Field>
            </div>
          ) : null}

          <Field label={kind === "note" ? "Conteúdo" : "Comentário"}><textarea className={`${inputCls} min-h-[80px] resize-y py-2`} maxLength={500} onChange={(e) => setDescription(e.target.value)} placeholder="Adicione um comentário…" value={description} /></Field>

          {kind !== "note" ? (
            <label className="flex cursor-pointer items-center gap-2.5">
              <input checked={billable} className="h-4 w-4 accent-emerald-600" onChange={(e) => setBillable(e.target.checked)} type="checkbox" />
              <span className="text-sm font-medium text-ink">Faturável</span>
            </label>
          ) : null}
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-line px-5 py-4">
          <button className="inline-flex h-11 items-center justify-center rounded border border-slate-200 px-5 text-sm font-semibold text-ink transition hover:bg-slate-50" onClick={onClose} type="button">Cancelar</button>
          <button className="inline-flex h-11 items-center justify-center rounded bg-brand px-5 text-sm font-semibold text-white shadow-sm ring-1 ring-[#002D72]/20 transition hover:bg-[#003a94] active:bg-[#001F4D] disabled:opacity-60" disabled={saving} onClick={() => void save()} type="button">{saving ? "Salvando…" : "Salvar"}</button>
        </footer>
      </div>
    </div>
  );
}

// --- Detalhe ---------------------------------------------------------------
function DetailModal({ entry, onClose, onDelete }: { entry: AppointmentWithClient; onClose: () => void; onDelete: (id: string) => void }) {
  const kind = entryKind(entry);
  const start = new Date(entry.start_at);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button aria-label="Fechar" className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={onClose} type="button" />
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className={`h-1.5 w-full ${COLOR_STYLES[entryColor(entry)].dot}`} />
        <div className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${COLOR_STYLES[entryColor(entry)].badge}`}><KindIcon kind={kind} /></span>
              <h2 className="text-lg font-bold text-ink">{entryTitle(entry)}</h2>
            </div>
            <button aria-label="Fechar" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 ring-1 ring-black/5 transition hover:bg-slate-50 hover:text-ink" onClick={onClose} type="button"><svg fill="none" height="16" stroke="currentColor" strokeLinecap="round" strokeWidth="2" viewBox="0 0 24 24" width="16"><path d="M18 6 6 18M6 6l12 12" /></svg></button>
          </div>
          <dl className="mt-4 space-y-2.5 text-sm">
            <Row label="Tipo">{KIND_META[kind].label}</Row>
            <Row label="Quando">{start.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })} · {fmtTime(entry.start_at)}{kind === "event" ? `–${fmtTime(entry.end_at)}` : ""}</Row>
            {kind === "call" && entry.service ? <Row label="Tipo de chamada">{entry.service}</Row> : entry.category ? <Row label="Categoria"><CategoryBadge entry={entry} /></Row> : null}
            {entry.duration_minutes ? <Row label="Duração">{entry.duration_minutes} min</Row> : null}
            {kind === "event" && entry.max_participants ? <Row label="Vagas">Até {entry.max_participants} participantes</Row> : null}
            {entry.crm_clients ? <Row label="Cliente">{entry.client_id ? <Link className="font-medium text-brand hover:underline" href={`/crm/${entry.client_id}`}>{entry.crm_clients.name}</Link> : entry.crm_clients.name}</Row> : null}
            {entry.location ? <Row label="Local">{entry.location}</Row> : null}
            {entry.billable ? <Row label="Faturável"><span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[11px] font-semibold text-emerald-700">Sim</span></Row> : null}
            {entry.note ? <Row label={kind === "note" ? "Conteúdo" : "Comentário"}>{entry.note}</Row> : null}
          </dl>
          <div className="mt-5 flex items-center justify-between">
            <button className="inline-flex h-10 items-center gap-1.5 rounded px-3 text-sm font-semibold text-rose-600 transition hover:bg-rose-50" onClick={() => onDelete(entry.id)} type="button"><svg fill="none" height="16" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24" width="16"><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /></svg>Excluir</button>
            <button className="inline-flex h-10 items-center justify-center rounded bg-slate-100 px-5 text-sm font-semibold text-ink transition hover:bg-slate-200" onClick={onClose} type="button">Fechar</button>
          </div>
        </div>
      </div>
    </div>
  );
}

const inputCls = "h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-ink outline-none transition placeholder:text-slate-400 focus:border-brand focus:ring-2 focus:ring-brand/20";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (<label className="block"><span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>{children}</label>);
}
function Row({ label, children }: { label: string; children: ReactNode }) {
  return (<div className="flex gap-3"><dt className="w-20 shrink-0 text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</dt><dd className="min-w-0 flex-1 text-ink">{children}</dd></div>);
}
