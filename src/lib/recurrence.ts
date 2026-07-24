// Expansão de eventos recorrentes. A série NUNCA é materializada no banco:
// guardamos só o evento base e a regra, e calculamos as ocorrências que caem no
// intervalo consultado. Overrides e cancelamentos de ocorrência são aplicados
// por quem chama, comparando occurrence_original_start.

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

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

// Soma meses preservando o dia quando possível. Se o dia não existe no mês
// destino (31 de fevereiro), a ocorrência daquele mês é descartada, que é o
// comportamento do iCal.
function addMonthsStrict(date: Date, months: number): Date | null {
  const day = date.getDate();
  const next = new Date(date);
  next.setDate(1);
  next.setMonth(next.getMonth() + months);
  const daysInTargetMonth = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
  if (day > daysInTargetMonth) return null;
  next.setDate(day);
  return next;
}

function addYearsStrict(date: Date, years: number): Date | null {
  return addMonthsStrict(date, years * 12);
}

function startOfWeek(date: Date): Date {
  const next = new Date(date);
  next.setDate(next.getDate() - next.getDay());
  next.setHours(date.getHours(), date.getMinutes(), date.getSeconds(), 0);
  return next;
}

function withTimeFrom(reference: Date, target: Date): Date {
  const next = new Date(target);
  next.setHours(reference.getHours(), reference.getMinutes(), reference.getSeconds(), reference.getMilliseconds());
  return next;
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
  const untilDate = rule.endType === "on_date" && rule.until ? new Date(`${rule.until}T23:59:59`) : null;
  const maxCount = rule.endType === "after_count" ? rule.occurrenceCount ?? 0 : null;

  const out: Occurrence[] = [];
  let emitted = 0;

  // Aceita a ocorrência se estiver dentro dos limites da regra e cruzar o intervalo.
  const consider = (start: Date): "stop" | "skip" | "taken" => {
    if (untilDate && start.getTime() > untilDate.getTime()) return "stop";
    if (maxCount !== null && emitted >= maxCount) return "stop";
    if (start.getTime() > rangeEnd.getTime()) return "stop";

    emitted += 1; // conta para o limite de ocorrências mesmo fora do intervalo visível
    const end = new Date(start.getTime() + durationMs);
    if (end.getTime() < rangeStart.getTime()) return "skip";

    out.push({ start, end, originalStart: new Date(start) });
    return "taken";
  };

  if (rule.frequency === "weekly" && rule.byWeekday && rule.byWeekday.length > 0) {
    // Semanal com dias marcados: percorre semana a semana, emitindo os dias
    // escolhidos em ordem crescente dentro de cada semana elegível.
    const weekdays = [...new Set(rule.byWeekday)].filter((d) => d >= 0 && d <= 6).sort((a, b) => a - b);
    let weekCursor = startOfWeek(baseStart);
    for (let i = 0; i < MAX_ITERATIONS; i++) {
      for (const weekday of weekdays) {
        const candidate = withTimeFrom(baseStart, addDays(weekCursor, weekday));
        if (candidate.getTime() < baseStart.getTime()) continue; // antes do início da série
        const result = consider(candidate);
        if (result === "stop") return out;
      }
      weekCursor = addDays(weekCursor, 7 * every);
      if (weekCursor.getTime() > rangeEnd.getTime()) break;
    }
    return out;
  }

  // Demais frequências: avança a partir do início da série.
  for (let i = 0; i < MAX_ITERATIONS; i++) {
    let candidate: Date | null;
    if (rule.frequency === "daily") {
      candidate = addDays(baseStart, i * every);
    } else if (rule.frequency === "weekly") {
      candidate = addDays(baseStart, i * every * 7);
    } else if (rule.frequency === "monthly") {
      candidate = addMonthsStrict(baseStart, i * every);
    } else {
      candidate = addYearsStrict(baseStart, i * every);
    }

    // Mês sem o dia correspondente: pula sem consumir uma ocorrência.
    if (candidate === null) continue;

    const result = consider(candidate);
    if (result === "stop") return out;
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
