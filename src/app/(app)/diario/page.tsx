import { loadDiarioData } from "./data";
import { DiarioClient } from "./diario-client";
import { isoDate, parseIsoDate, rangeFor, startOfDay, endOfDay } from "./date-utils";
import type { DiarioMode, DiarioView } from "./types";

// Diário: agenda de eventos. O período visível vem da URL (?anchor&view&mode),
// e from/to são só o recorte já calculado pelo cliente. Sem parâmetro, abre o
// mês corrente em modo calendário.

const VIEWS: DiarioView[] = ["day", "week", "month", "year"];
const MODES: DiarioMode[] = ["calendar", "list"];

export default async function DiarioPage({
  searchParams
}: {
  searchParams: { anchor?: string; view?: string; mode?: string; from?: string; to?: string };
}) {
  const anchor = parseIsoDate(searchParams.anchor) ?? startOfDay(new Date());
  const mode: DiarioMode = MODES.includes(searchParams.mode as DiarioMode)
    ? (searchParams.mode as DiarioMode)
    : "calendar";
  const requestedView = VIEWS.includes(searchParams.view as DiarioView)
    ? (searchParams.view as DiarioView)
    : "month";
  // O calendário não tem visão de ano.
  const view: DiarioView = mode === "calendar" && requestedView === "year" ? "month" : requestedView;

  const fallback = rangeFor(anchor, view, mode);
  const from = parseIsoDate(searchParams.from) ? startOfDay(parseIsoDate(searchParams.from)!) : fallback.from;
  const to = parseIsoDate(searchParams.to) ? endOfDay(parseIsoDate(searchParams.to)!) : fallback.to;

  const { events, categories, relatedOptions, userId } = await loadDiarioData(from, to);

  return (
    <DiarioClient
      anchor={isoDate(anchor)}
      categories={categories}
      items={events}
      mode={mode}
      relatedOptions={relatedOptions}
      userId={userId}
      view={view}
    />
  );
}
