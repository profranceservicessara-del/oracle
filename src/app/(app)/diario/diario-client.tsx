"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CalendarView } from "./calendar-view";
import {
  addDays,
  addMonths,
  addYears,
  isoDate,
  parseIsoDate,
  periodLabel,
  rangeFor,
  startOfDay
} from "./date-utils";
import { EventDetailPanel } from "./event-detail-panel";
import { EventForm } from "./event-form";
import { EMPTY_FILTERS, FilterPanel, countActiveFilters, type DiarioFilters } from "./filter-panel";
import { ListView } from "./list-view";
import type {
  DiarioItem,
  DiarioMode,
  DiarioView,
  EventCategory,
  RelatedOptions
} from "./types";

// Orquestrador do Diário. O período visível mora na URL (a página do servidor
// recarrega os eventos), e os filtros ficam no cliente, sobre o que já veio.

const CALENDAR_VIEWS: { key: DiarioView; label: string }[] = [
  { key: "day", label: "Dia" },
  { key: "week", label: "Semana" },
  { key: "month", label: "Mês" }
];

const LIST_VIEWS: { key: DiarioView; label: string }[] = [
  ...CALENDAR_VIEWS,
  { key: "year", label: "Ano" }
];

export function DiarioClient({
  anchor,
  categories,
  items,
  mode,
  relatedOptions,
  userId,
  view
}: {
  anchor: string;
  categories: EventCategory[];
  items: DiarioItem[];
  mode: DiarioMode;
  relatedOptions: RelatedOptions;
  userId: string;
  view: DiarioView;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<DiarioFilters>(EMPTY_FILTERS);
  const [detail, setDetail] = useState<DiarioItem | null>(null);
  const [form, setForm] = useState<{ item: DiarioItem | null; date: Date } | null>(null);

  const anchorDate = useMemo(() => parseIsoDate(anchor) ?? startOfDay(new Date()), [anchor]);

  function navigate(next: { anchor?: Date; view?: DiarioView; mode?: DiarioMode }) {
    const nextMode = next.mode ?? mode;
    const requestedView = next.view ?? view;
    const nextView: DiarioView =
      nextMode === "calendar" && requestedView === "year" ? "month" : requestedView;
    const nextAnchor = next.anchor ?? anchorDate;
    const range = rangeFor(nextAnchor, nextView, nextMode);
    const params = new URLSearchParams({
      anchor: isoDate(nextAnchor),
      view: nextView,
      mode: nextMode,
      from: isoDate(range.from),
      to: isoDate(range.to)
    });
    startTransition(() => {
      router.push(`/diario?${params.toString()}`, { scroll: false });
    });
  }

  function step(delta: number) {
    if (view === "day") {
      navigate({ anchor: addDays(anchorDate, delta) });
    } else if (view === "week") {
      navigate({ anchor: addDays(anchorDate, delta * 7) });
    } else if (view === "year") {
      navigate({ anchor: addYears(anchorDate, delta) });
    } else {
      navigate({ anchor: addMonths(anchorDate, delta) });
    }
  }

  const visibleItems = useMemo(() => {
    return items.filter((item) => {
      if (filters.categoryIds.length > 0) {
        if (!item.category_id || !filters.categoryIds.includes(item.category_id)) {
          return false;
        }
      }
      if (filters.relatedKind !== "all" && item.related_kind !== filters.relatedKind) {
        return false;
      }
      if (filters.relatedId && item.related_id !== filters.relatedId) {
        return false;
      }
      if (filters.collaboratorIds.length > 0) {
        const hasCollaborator = item.collaborators.some((collaborator) =>
          filters.collaboratorIds.includes(collaborator.user_id)
        );
        if (!hasCollaborator) {
          return false;
        }
      }
      return true;
    });
  }, [filters, items]);

  const allCollaborators = useMemo(() => items.flatMap((item) => item.collaborators), [items]);
  const activeFilters = countActiveFilters(filters);
  const viewOptions = mode === "calendar" ? CALENDAR_VIEWS : LIST_VIEWS;

  function refresh() {
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-ink">Diário</h1>
            <p className="mt-1 text-sm text-muted">
              Agenda de eventos, com recorrência, lembretes e vínculos com os outros módulos.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={() => setFiltersOpen((open) => !open)} type="button" variant="secondary">
              Filtro
              {activeFilters > 0 ? (
                <span className="rounded-full bg-brand px-2 py-0.5 text-[11px] font-semibold text-white">
                  {activeFilters}
                </span>
              ) : null}
            </Button>
            <Button onClick={() => setForm({ item: null, date: anchorDate })} type="button">
              + Novo evento
            </Button>
          </div>
        </div>

        {filtersOpen ? (
          <FilterPanel
            categories={categories}
            collaborators={allCollaborators}
            filters={filters}
            onChange={setFilters}
            onClose={() => setFiltersOpen(false)}
            relatedOptions={relatedOptions}
            userId={userId}
          />
        ) : null}

        {/* Modo + período + visão */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center rounded-full bg-slate-100 p-1 text-sm font-medium">
            {(
              [
                ["calendar", "Calendário"],
                ["list", "Lista"]
              ] as const
            ).map(([key, label]) => (
              <button
                className={`rounded-full px-3 py-1.5 transition ${
                  mode === key ? "bg-white text-ink shadow-sm ring-1 ring-black/5" : "text-slate-500 hover:text-ink"
                }`}
                key={key}
                onClick={() => navigate({ mode: key })}
                type="button"
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center rounded-full bg-white shadow-sm ring-1 ring-black/5">
              <button
                aria-label="Período anterior"
                className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition hover:text-ink"
                onClick={() => step(-1)}
                type="button"
              >
                <svg fill="none" height="18" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="18">
                  <path d="m15 18-6-6 6-6" />
                </svg>
              </button>
              <button
                className="h-9 px-3 text-sm font-semibold text-ink transition hover:text-brand"
                onClick={() => navigate({ anchor: startOfDay(new Date()) })}
                type="button"
              >
                Hoje
              </button>
              <button
                aria-label="Próximo período"
                className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition hover:text-ink"
                onClick={() => step(1)}
                type="button"
              >
                <svg fill="none" height="18" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="18">
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </button>
            </div>

            <span className="min-w-[12rem] text-sm font-semibold capitalize text-ink">
              {periodLabel(anchorDate, view)}
            </span>

            <div className="flex items-center rounded-full bg-slate-100 p-1 text-sm font-medium">
              {viewOptions.map((option) => (
                <button
                  className={`rounded-full px-3 py-1.5 transition ${
                    view === option.key ? "bg-brand text-white shadow-sm" : "text-slate-500 hover:text-ink"
                  }`}
                  key={option.key}
                  onClick={() => navigate({ view: option.key })}
                  type="button"
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className={pending ? "opacity-60 transition-opacity" : "transition-opacity"}>
          {mode === "calendar" ? (
            <CalendarView
              anchor={anchorDate}
              categories={categories}
              items={visibleItems}
              onCreate={(date) => setForm({ item: null, date })}
              onSelect={setDetail}
              relatedOptions={relatedOptions}
              view={view === "year" ? "month" : view}
            />
          ) : (
            <ListView
              categories={categories}
              items={visibleItems}
              onSelect={setDetail}
              relatedOptions={relatedOptions}
            />
          )}
        </div>
      </div>

      {detail ? (
        <EventDetailPanel
          categories={categories}
          item={detail}
          onChanged={refresh}
          onClose={() => setDetail(null)}
          onEdit={(item) => {
            setDetail(null);
            setForm({ item, date: new Date(item.occurrenceStart) });
          }}
          relatedOptions={relatedOptions}
          userId={userId}
        />
      ) : null}

      {form ? (
        <EventForm
          categories={categories}
          initialDate={form.date}
          item={form.item}
          key={form.item ? form.item.id : `new-${form.date.toISOString()}`}
          onClose={() => setForm(null)}
          onSaved={refresh}
          relatedOptions={relatedOptions}
          userId={userId}
        />
      ) : null}
    </main>
  );
}
