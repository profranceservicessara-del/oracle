import { loadDiarioData } from "./data";
import { DiarioClient } from "./diario-client";
import { todayParisIso } from "@/lib/dates";
import { parisEndOfDay, parisStartOfDay } from "@/lib/paris-time";
import { isoDate, parseIsoDate, rangeFor, startOfDay } from "./date-utils";
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
  // O servidor roda em UTC: o "hoje" padrão é o de Paris.
  const anchor = parseIsoDate(searchParams.anchor) ?? parseIsoDate(todayParisIso()) ?? startOfDay(new Date());
  const mode: DiarioMode = MODES.includes(searchParams.mode as DiarioMode)
    ? (searchParams.mode as DiarioMode)
    : "calendar";
  const requestedView = VIEWS.includes(searchParams.view as DiarioView)
    ? (searchParams.view as DiarioView)
    : "month";
  // O calendário não tem visão de ano.
  const view: DiarioView = mode === "calendar" && requestedView === "year" ? "month" : requestedView;

  const fallback = rangeFor(anchor, view, mode);
  // Os limites são o início e o fim do dia EM PARIS. Com meia-noite do servidor (UTC),
  // um evento das 00h30 de Paris ficava fora do intervalo do próprio dia.
  const fromDay = parseIsoDate(searchParams.from);
  const toDay = parseIsoDate(searchParams.to);
  const from = parisStartOfDay(fromDay ?? fallback.from);
  const to = parisEndOfDay(toDay ?? fallback.to);

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
