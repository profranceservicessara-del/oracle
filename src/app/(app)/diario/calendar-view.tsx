"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  addDays,
  isoDate,
  isoWeekNumber,
  monthGrid,
  sameDay,
  startOfDay,
  startOfWeek
} from "./date-utils";
import {
  WEEKDAY_DISPLAY_ORDER,
  WEEKDAY_SHORT,
  relatedLabel,
  type DiarioItem,
  type DiarioView,
  type EventCategory,
  type RelatedOptions
} from "./types";

// Grades de calendário (Mês / Semana / Dia) montadas na mão, no mesmo espírito
// da agenda do CRM. Semana começa na segunda e o mês mostra o número da semana.

const HOUR_HEIGHT = 48;
const SCROLL_TO_HOUR = 7;
const FALLBACK_COLOR = "#94A3B8";

type CalendarViewProps = {
  anchor: Date;
  categories: EventCategory[];
  items: DiarioItem[];
  onCreate: (date: Date) => void;
  onSelect: (item: DiarioItem) => void;
  relatedOptions: RelatedOptions;
  view: Exclude<DiarioView, "year">;
};

function itemTime(item: DiarioItem): string {
  if (item.all_day) {
    return "Dia todo";
  }
  return new Date(item.occurrenceStart).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function groupByDay(items: DiarioItem[]): Map<string, DiarioItem[]> {
  const map = new Map<string, DiarioItem[]>();
  for (const item of items) {
    // Um evento de vários dias aparece em cada dia que ocupa.
    const start = startOfDay(new Date(item.occurrenceStart));
    const end = startOfDay(new Date(item.occurrenceEnd));
    let cursor = start;
    let guard = 0;
    while (cursor.getTime() <= end.getTime() && guard < 400) {
      const key = isoDate(cursor);
      const list = map.get(key) ?? [];
      list.push(item);
      map.set(key, list);
      cursor = addDays(cursor, 1);
      guard += 1;
    }
  }
  for (const list of map.values()) {
    list.sort((a, b) => a.occurrenceStart.localeCompare(b.occurrenceStart));
  }
  return map;
}

export function CalendarView({
  anchor,
  categories,
  items,
  onCreate,
  onSelect,
  relatedOptions,
  view
}: CalendarViewProps) {
  const colorById = useMemo(() => {
    const map = new Map<string, string>();
    categories.forEach((category) => map.set(category.id, category.color || FALLBACK_COLOR));
    return map;
  }, [categories]);

  const byDay = useMemo(() => groupByDay(items), [items]);
  const today = startOfDay(new Date());

  function colorOf(item: DiarioItem): string {
    return (item.category_id ? colorById.get(item.category_id) : null) ?? FALLBACK_COLOR;
  }

  function linkOf(item: DiarioItem): string | null {
    return relatedLabel(item.related_kind, item.related_id, relatedOptions);
  }

  if (view === "month") {
    return (
      <MonthGrid
        anchor={anchor}
        byDay={byDay}
        colorOf={colorOf}
        linkOf={linkOf}
        onCreate={onCreate}
        onSelect={onSelect}
        today={today}
      />
    );
  }

  return (
    <TimeGrid
      anchor={anchor}
      byDay={byDay}
      colorOf={colorOf}
      days={view === "day" ? 1 : 7}
      linkOf={linkOf}
      onCreate={onCreate}
      onSelect={onSelect}
      today={today}
    />
  );
}

type GridShared = {
  byDay: Map<string, DiarioItem[]>;
  colorOf: (item: DiarioItem) => string;
  linkOf: (item: DiarioItem) => string | null;
  onCreate: (date: Date) => void;
  onSelect: (item: DiarioItem) => void;
  today: Date;
};

function MonthGrid({ anchor, byDay, colorOf, linkOf, onCreate, onSelect, today }: GridShared & { anchor: Date }) {
  const cells = monthGrid(anchor);
  const weeks = Array.from({ length: 6 }, (_, index) => cells.slice(index * 7, index * 7 + 7));

  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
      <div className="grid border-b border-line" style={{ gridTemplateColumns: "3rem repeat(7, minmax(0, 1fr))" }}>
        <div className="px-2 py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          Sem.
        </div>
        {WEEKDAY_DISPLAY_ORDER.map((day) => (
          <div
            className="px-2 py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-500"
            key={day}
          >
            {WEEKDAY_SHORT[day]}
          </div>
        ))}
      </div>

      {weeks.map((week) => (
        <div
          className="grid border-b border-line last:border-b-0"
          key={isoDate(week[0])}
          style={{ gridTemplateColumns: "3rem repeat(7, minmax(0, 1fr))" }}
        >
          <div className="flex items-start justify-center bg-slate-50/70 px-1 pt-2 text-[11px] font-semibold tabular-nums text-slate-400">
            {isoWeekNumber(week[0])}
          </div>
          {week.map((date) => {
            const key = isoDate(date);
            const dayItems = byDay.get(key) ?? [];
            const inMonth = date.getMonth() === anchor.getMonth();
            const isToday = sameDay(date, today);

            return (
              <div
                className={`min-h-[7rem] border-l border-line p-1.5 ${
                  isToday ? "bg-[#EEF3FC]" : inMonth ? "bg-white" : "bg-slate-50/50"
                }`}
                key={key}
              >
                <button
                  aria-label={`Criar evento em ${key}`}
                  className="flex w-full items-center justify-start"
                  onClick={() => onCreate(date)}
                  type="button"
                >
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold tabular-nums transition ${
                      isToday
                        ? "bg-brand text-white"
                        : inMonth
                          ? "text-ink hover:bg-slate-100"
                          : "text-slate-300 hover:bg-slate-100"
                    }`}
                  >
                    {date.getDate()}
                  </span>
                </button>
                <div className="mt-1 space-y-1">
                  {dayItems.slice(0, 3).map((item) => (
                    <EventChip
                      color={colorOf(item)}
                      item={item}
                      key={`${item.id}-${item.occurrenceStart}`}
                      link={linkOf(item)}
                      onSelect={onSelect}
                    />
                  ))}
                  {dayItems.length > 3 ? (
                    <span className="block px-1 text-[11px] font-medium text-muted">
                      +{dayItems.length - 3} outros
                    </span>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function EventChip({
  color,
  item,
  link,
  onSelect
}: {
  color: string;
  item: DiarioItem;
  link: string | null;
  onSelect: (item: DiarioItem) => void;
}) {
  return (
    <button
      className="flex w-full items-center gap-1.5 rounded-lg px-1.5 py-1 text-left text-[11px] transition hover:bg-slate-100"
      onClick={() => onSelect(item)}
      title={[itemTime(item), item.title, link].filter(Boolean).join(" · ")}
      type="button"
    >
      <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
      <span className="shrink-0 tabular-nums text-slate-500">{itemTime(item)}</span>
      <span className="truncate font-medium text-ink">{item.title}</span>
      {link ? <span className="truncate text-slate-400">{link}</span> : null}
    </button>
  );
}

function TimeGrid({
  anchor,
  byDay,
  colorOf,
  days,
  linkOf,
  onCreate,
  onSelect,
  today
}: GridShared & { anchor: Date; days: number }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const columns = useMemo(() => {
    const start = days === 1 ? startOfDay(anchor) : startOfWeek(anchor);
    return Array.from({ length: days }, (_, index) => addDays(start, index));
  }, [anchor, days]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = SCROLL_TO_HOUR * HOUR_HEIGHT;
    }
  }, []);

  const hours = Array.from({ length: 24 }, (_, index) => index);
  const gridTemplate = `3.5rem repeat(${days}, minmax(0, 1fr))`;
  const hasAllDay = columns.some((date) =>
    (byDay.get(isoDate(date)) ?? []).some((item) => item.all_day)
  );

  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
      <div className="grid border-b border-line" style={{ gridTemplateColumns: gridTemplate }}>
        <div className="flex items-end justify-center pb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          {days === 1 ? "" : `S${isoWeekNumber(columns[0])}`}
        </div>
        {columns.map((date) => {
          const isToday = sameDay(date, today);
          return (
            <div className="border-l border-line px-2 py-2 text-center" key={isoDate(date)}>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                {WEEKDAY_SHORT[date.getDay()]}
              </p>
              <p
                className={`mx-auto mt-0.5 flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold tabular-nums ${
                  isToday ? "bg-brand text-white" : "text-ink"
                }`}
              >
                {date.getDate()}
              </p>
            </div>
          );
        })}
      </div>

      {hasAllDay ? (
        <div className="grid border-b border-line bg-slate-50/70" style={{ gridTemplateColumns: gridTemplate }}>
          <div className="px-2 py-2 text-right text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            Dia todo
          </div>
          {columns.map((date) => {
            const dayItems = (byDay.get(isoDate(date)) ?? []).filter((item) => item.all_day);
            return (
              <div className="min-h-[2.5rem] space-y-1 border-l border-line p-1" key={isoDate(date)}>
                {dayItems.map((item) => (
                  <EventChip
                    color={colorOf(item)}
                    item={item}
                    key={`${item.id}-${item.occurrenceStart}`}
                    link={linkOf(item)}
                    onSelect={onSelect}
                  />
                ))}
              </div>
            );
          })}
        </div>
      ) : null}

      <div className="max-h-[calc(100vh-22rem)] min-h-[24rem] overflow-y-auto" ref={scrollRef}>
        <div className="grid" style={{ gridTemplateColumns: gridTemplate }}>
          <div>
            {hours.map((hour) => (
              <div className="relative border-b border-line/60 text-right" key={hour} style={{ height: HOUR_HEIGHT }}>
                <span className="absolute -top-2 right-1.5 text-[10px] tabular-nums text-slate-400">
                  {hour === 0 ? "" : `${String(hour).padStart(2, "0")}:00`}
                </span>
              </div>
            ))}
          </div>

          {columns.map((date) => {
            const key = isoDate(date);
            const dayItems = (byDay.get(key) ?? []).filter((item) => !item.all_day);
            const dayStart = startOfDay(date).getTime();

            return (
              <div className="relative border-l border-line" key={key} style={{ height: 24 * HOUR_HEIGHT }}>
                {hours.map((hour) => (
                  <button
                    aria-label={`Criar evento em ${key} às ${String(hour).padStart(2, "0")}:00`}
                    className="block w-full border-b border-line/60 transition hover:bg-slate-50"
                    key={hour}
                    onClick={() => {
                      const target = startOfDay(date);
                      target.setHours(hour, 0, 0, 0);
                      onCreate(target);
                    }}
                    style={{ height: HOUR_HEIGHT }}
                    type="button"
                  />
                ))}

                {dayItems.map((item) => {
                  const start = new Date(item.occurrenceStart).getTime();
                  const end = new Date(item.occurrenceEnd).getTime();
                  const minutesFromDayStart = Math.max(0, (start - dayStart) / 60000);
                  const durationMinutes = Math.max(30, (end - Math.max(start, dayStart)) / 60000);
                  const top = (minutesFromDayStart / 60) * HOUR_HEIGHT;
                  const height = Math.min(
                    24 * HOUR_HEIGHT - top,
                    Math.max(24, (durationMinutes / 60) * HOUR_HEIGHT - 2)
                  );
                  const color = colorOf(item);
                  const link = linkOf(item);

                  return (
                    <button
                      className="absolute left-1 right-1 overflow-hidden rounded-xl border-l-4 bg-white/95 px-2 py-1 text-left text-[11px] shadow-sm ring-1 ring-black/5 transition hover:shadow-md"
                      key={`${item.id}-${item.occurrenceStart}`}
                      onClick={() => onSelect(item)}
                      style={{ top, height, borderLeftColor: color }}
                      type="button"
                    >
                      <span className="block truncate font-semibold text-ink">{item.title}</span>
                      <span className="block truncate tabular-nums text-slate-500">
                        {itemTime(item)}
                        {link ? ` · ${link}` : ""}
                      </span>
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
