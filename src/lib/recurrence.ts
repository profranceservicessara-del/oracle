// Expansão de eventos recorrentes. A série NUNCA é materializada no banco:
// guardamos só o evento base e a regra, e calculamos as ocorrências que caem no
// intervalo consultado. Overrides e cancelamentos de ocorrência são aplicados
// por quem chama, comparando occurrence_original_start.
//
// Toda a conta de calendário é feita no relógio de parede de Paris (ver
// paris-time.ts). Assim a reunião das 9h continua às 9h depois da troca de
// horário de verão, e o dia da semana não erra perto da meia-noite.

import { parisWallAsUtcMs, parisWallToInstant } from "@/lib/paris-time";

export type RecurFrequency = "daily" | "weekly" | "monthly" | "yearly";
export type RecurEndType = "after_count" | "on_date" | "never";

export type RecurrenceRule = {
  frequency: RecurFrequency;
  repeatEvery: number;
  byWeekday: number[] | null; // 0=domingo .. 6=sábado
  endType: RecurEndType;
  occurrenceCount: number | null;
  until: string | null; // YYYY-MM-DD
};

export type Occurrence = {
  start: Date;
  end: Date;
  /** Início da ocorrência na série original. Chave para casar overrides. */
  originalStart: Date;
};

// Teto de segurança: impede laço infinito se a regra vier inconsistente.
const MAX_ITERATIONS = 2000;
const DAY_MS = 24 * 60 * 60 * 1000;

// Soma meses preservando o dia. Se o dia não existe no mês destino (31 de
// fevereiro), a ocorrência daquele mês é descartada, que é o comportamento do iCal.
// Recebe e devolve "wall-ms" (relógio de parede codificado como UTC).
function addMonthsStrict(wallMs: number, months: number): number | null {
  const base = new Date(wallMs);
  const day = base.getUTCDate();
  const target = new Date(
    Date.UTC(
      base.getUTCFullYear(),
      base.getUTCMonth() + months,
      1,
      base.getUTCHours(),
      base.getUTCMinutes(),
      base.getUTCSeconds()
    )
  );
  const daysInTargetMonth = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  if (day > daysInTargetMonth) return null;
  target.setUTCDate(day);
  return target.getTime();
}

// Domingo da semana do wall-ms, mantendo a hora.
function startOfWeek(wallMs: number): number {
  return wallMs - new Date(wallMs).getUTCDay() * DAY_MS;
}

/**
 * Gera as ocorrências de um evento recorrente que intersectam [rangeStart, rangeEnd].
 * Uma ocorrência entra se o seu período cruza o intervalo, mesmo começando antes.
 */
export function expandOccurrences(
  baseStart: Date,
  baseEnd: Date,
  rule: RecurrenceRule,
  rangeStart: Date,
  rangeEnd: Date
): Occurrence[] {
  const durationMs = Math.max(0, baseEnd.getTime() - baseStart.getTime());
  const every = Math.max(1, Math.floor(rule.repeatEvery) || 1);
  const startWall = parisWallAsUtcMs(baseStart);

  let untilWall: number | null = null;
  if (rule.endType === "on_date" && rule.until) {
    const [year, month, day] = rule.until.split("-").map(Number);
    untilWall = Date.UTC(year, month - 1, day, 23, 59, 59);
  }
  const maxCount = rule.endType === "after_count" ? rule.occurrenceCount ?? 0 : null;

  const out: Occurrence[] = [];
  let emitted = 0;

  // Aceita a ocorrência se estiver dentro dos limites da regra e cruzar o intervalo.
  const consider = (wallMs: number): "stop" | "skip" | "taken" => {
    if (untilWall !== null && wallMs > untilWall) return "stop";
    if (maxCount !== null && emitted >= maxCount) return "stop";

    const start = parisWallToInstant(wallMs);
    if (start.getTime() > rangeEnd.getTime()) return "stop";

    emitted += 1; // conta para o limite de ocorrências mesmo fora do intervalo visível
    const end = new Date(start.getTime() + durationMs);
    if (end.getTime() < rangeStart.getTime()) return "skip";

    out.push({ start, end, originalStart: new Date(start) });
    return "taken";
  };

  const weekdays =
    rule.frequency === "weekly" && rule.byWeekday && rule.byWeekday.length > 0
      ? [...new Set(rule.byWeekday)].filter((d) => d >= 0 && d <= 6).sort((a, b) => a - b)
      : null;

  if (weekdays) {
    // Semanal com dias marcados: percorre semana a semana, emitindo os dias
    // escolhidos em ordem crescente dentro de cada semana elegível.
    let weekCursor = startOfWeek(startWall);
    for (let i = 0; i < MAX_ITERATIONS; i++) {
      for (const weekday of weekdays) {
        const candidate = weekCursor + weekday * DAY_MS;
        if (candidate < startWall) continue; // antes do início da série
        if (consider(candidate) === "stop") return out;
      }
      weekCursor += 7 * every * DAY_MS;
      if (parisWallToInstant(weekCursor).getTime() > rangeEnd.getTime()) break;
    }
    return out;
  }

  // Diário e semanal simples são exatamente periódicos, então dá para pular direto
  // para perto do intervalo visível. Sem isso, uma série diária sem fim sumia do
  // calendário depois de ~5,5 anos (limite de iterações). As ocorrências puladas
  // entram na contagem do limite (emitted começa no primeiro índice visitado).
  const periodMs =
    rule.frequency === "daily" ? every * DAY_MS : rule.frequency === "weekly" ? every * 7 * DAY_MS : null;
  let firstIndex = 0;
  if (periodMs !== null) {
    const rangeStartWall = parisWallAsUtcMs(rangeStart);
    firstIndex = Math.max(0, Math.floor((rangeStartWall - durationMs - startWall) / periodMs) - 1);
    emitted = firstIndex;
  }

  for (let i = firstIndex; i < firstIndex + MAX_ITERATIONS; i++) {
    let candidate: number | null;
    if (rule.frequency === "daily" || rule.frequency === "weekly") {
      candidate = startWall + i * (periodMs as number);
    } else if (rule.frequency === "monthly") {
      candidate = addMonthsStrict(startWall, i * every);
    } else {
      candidate = addMonthsStrict(startWall, i * every * 12);
    }

    // Mês sem o dia correspondente: pula sem consumir uma ocorrência.
    if (candidate === null) continue;

    if (consider(candidate) === "stop") return out;
  }

  return out;
}

/** Rótulo curto da regra, para exibir na ficha do evento. */
export function describeRecurrence(rule: RecurrenceRule): string {
  const every = Math.max(1, rule.repeatEvery);
  const unit =
    rule.frequency === "daily"
      ? every === 1 ? "dia" : "dias"
      : rule.frequency === "weekly"
        ? every === 1 ? "semana" : "semanas"
        : rule.frequency === "monthly"
          ? every === 1 ? "mês" : "meses"
          : every === 1 ? "ano" : "anos";

  const base = every === 1 ? `A cada ${unit}` : `A cada ${every} ${unit}`;

  const end =
    rule.endType === "after_count" && rule.occurrenceCount
      ? `, ${rule.occurrenceCount} vezes`
      : rule.endType === "on_date" && rule.until
        ? `, até ${rule.until.split("-").reverse().join("/")}`
        : "";

  return `${base}${end}`;
}
