"use client";

import { useMemo } from "react";
import { addDays, fmtDayLong, isoDate, sameDay, startOfDay } from "./date-utils";
import {
  VISIBILITY_LABELS,
  relatedLabel,
  type DiarioItem,
  type EventCategory,
  type RelatedOptions
} from "./types";

// Lista do Diário agrupada por dia. O intervalo (Dia/Semana/Mês/Ano) já vem
// recortado do servidor; aqui só agrupamos e ordenamos.

const FALLBACK_COLOR = "#94A3B8";

export function ListView({
  categories,
  items,
  onSelect,
  relatedOptions
}: {
  categories: EventCategory[];
  items: DiarioItem[];
  onSelect: (item: DiarioItem) => void;
  relatedOptions: RelatedOptions;
}) {
  const categoryById = useMemo(() => {
    const map = new Map<string, EventCategory>();
    categories.forEach((category) => map.set(category.id, category));
    return map;
  }, [categories]);

  const groups = useMemo(() => {
    const map = new Map<string, DiarioItem[]>();
    for (const item of items) {
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
    return [...map.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([key, list]) => ({
        key,
        date: new Date(`${key}T00:00:00`),
        items: [...list].sort((a, b) => a.occurrenceStart.localeCompare(b.occurrenceStart))
      }));
  }, [items]);

  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-2xl bg-white px-6 py-14 text-center shadow-sm ring-1 ring-black/5">
        <p className="text-lg font-semibold text-ink">Nenhum evento neste período.</p>
        <p className="mt-2 max-w-md text-sm text-muted">
          Mude o período, ajuste os filtros ou crie um novo evento.
        </p>
      </div>
    );
  }

  const today = startOfDay(new Date());

  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5" key={group.key}>
          <div className="flex items-center justify-between gap-3 border-b border-line bg-slate-50 px-5 py-3">
            <h3
              className={`text-sm font-semibold capitalize ${
                sameDay(group.date, today) ? "text-brand" : "text-ink"
              }`}
            >
              {fmtDayLong(group.date)}
            </h3>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold tabular-nums text-slate-600">
              {group.items.length}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-line text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-2.5">Horário</th>
                  <th className="px-5 py-2.5">Rótulo</th>
                  <th className="px-5 py-2.5">Título</th>
                  <th className="px-5 py-2.5">Local</th>
                  <th className="px-5 py-2.5">Relacionado a</th>
                  <th className="px-5 py-2.5">Confidencialidade</th>
                </tr>
              </thead>
              <tbody>
                {group.items.map((item) => {
                  const category = item.category_id ? categoryById.get(item.category_id) : null;
                  const link = relatedLabel(item.related_kind, item.related_id, relatedOptions);
                  const start = new Date(item.occurrenceStart);
                  const end = new Date(item.occurrenceEnd);

                  return (
                    <tr
                      className="cursor-pointer border-b border-line transition last:border-b-0 hover:bg-slate-50"
                      key={`${item.id}-${item.occurrenceStart}`}
                      onClick={() => onSelect(item)}
                    >
                      <td className="whitespace-nowrap px-5 py-2.5 tabular-nums text-slate-600">
                        {item.all_day
                          ? "Dia todo"
                          : `${start.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} às ${end.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`}
                      </td>
                      <td className="px-5 py-2.5">
                        {category ? (
                          <span className="inline-flex items-center gap-1.5 text-slate-600">
                            <span
                              className="h-2 w-2 shrink-0 rounded-full"
                              style={{ backgroundColor: category.color || FALLBACK_COLOR }}
                            />
                            {category.emoji ? <span aria-hidden>{category.emoji}</span> : null}
                            {category.name}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-5 py-2.5 font-medium text-ink">
                        {item.title}
                        {item.isOccurrence ? (
                          <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                            Recorrente
                          </span>
                        ) : null}
                      </td>
                      <td className="px-5 py-2.5 text-slate-600">{item.location || "—"}</td>
                      <td className="px-5 py-2.5 text-slate-600">{link || "—"}</td>
                      <td className="px-5 py-2.5 text-slate-600">{VISIBILITY_LABELS[item.visibility]}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}
