import { describe, expect, it } from "vitest";
import { parisWallToInstant } from "./paris-time";
import { describeRecurrence, expandOccurrences, type RecurrenceRule } from "./recurrence";

// Horário de parede de Paris -> instante. m é 1-12.
const paris = (y: number, m: number, d: number, h = 0, mi = 0) => parisWallToInstant(Date.UTC(y, m - 1, d, h, mi, 0));

const parisHour = (date: Date) =>
  Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Paris", hour: "2-digit", hourCycle: "h23" }).format(date));
const parisWeekday = (date: Date) =>
  new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Paris", weekday: "short" }).format(date);

const rule = (overrides: Partial<RecurrenceRule>): RecurrenceRule => ({
  frequency: "daily",
  repeatEvery: 1,
  byWeekday: null,
  endType: "never",
  occurrenceCount: null,
  until: null,
  ...overrides
});

describe("expandOccurrences", () => {
  it("mantém a hora de parede de Paris depois da troca de horário de verão", () => {
    // Quarta 25/03/2026 às 9h (inverno). O horário de verão começa em 29/03.
    const start = paris(2026, 3, 25, 9);
    const end = paris(2026, 3, 25, 10);
    const result = expandOccurrences(start, end, rule({ frequency: "weekly" }), paris(2026, 3, 20), paris(2026, 4, 10));

    expect(result).toHaveLength(3);
    expect(result.map((o) => parisHour(o.start))).toEqual([9, 9, 9]);
    // Antes do pulo é 08:00 UTC, depois é 07:00 UTC: o instante muda, a hora de parede não.
    expect(result[0].start.toISOString()).toBe("2026-03-25T08:00:00.000Z");
    expect(result[1].start.toISOString()).toBe("2026-04-01T07:00:00.000Z");
  });

  it("semanal com dia marcado perto da meia-noite cai no dia certo de Paris", () => {
    // Segunda 01/06/2026 às 00h30 de Paris (ainda domingo em UTC).
    const start = paris(2026, 6, 1, 0, 30);
    const end = paris(2026, 6, 1, 1, 30);
    const result = expandOccurrences(
      start,
      end,
      rule({ frequency: "weekly", byWeekday: [1] }),
      paris(2026, 6, 1),
      paris(2026, 6, 30, 23, 59)
    );

    expect(result).toHaveLength(5);
    expect(result.every((o) => parisWeekday(o.start) === "Mon")).toBe(true);
    expect(result.every((o) => parisHour(o.start) === 0)).toBe(true);
  });

  it("respeita o limite de ocorrências", () => {
    const start = paris(2026, 1, 1, 10);
    const end = paris(2026, 1, 1, 11);
    const r = rule({ endType: "after_count", occurrenceCount: 3 });

    expect(expandOccurrences(start, end, r, paris(2026, 1, 1), paris(2026, 1, 31))).toHaveLength(3);
  });

  it("as ocorrências que ficaram antes da janela contam para o limite", () => {
    const start = paris(2026, 1, 1, 10);
    const end = paris(2026, 1, 1, 11);
    const r = rule({ endType: "after_count", occurrenceCount: 3 });

    // Ocorrências: 1, 2 e 3 de janeiro. Vendo a partir do dia 2 sobram só duas.
    const fromSecond = expandOccurrences(start, end, r, paris(2026, 1, 2), paris(2026, 1, 31));
    expect(fromSecond).toHaveLength(2);
    // Mais adiante a série já acabou.
    expect(expandOccurrences(start, end, r, paris(2026, 2, 1), paris(2026, 2, 28))).toHaveLength(0);
  });

  it("respeita a data final, inclusive o último dia", () => {
    const start = paris(2026, 1, 1, 10);
    const end = paris(2026, 1, 1, 11);
    const r = rule({ endType: "on_date", until: "2026-01-03" });

    const result = expandOccurrences(start, end, r, paris(2026, 1, 1), paris(2026, 1, 31));
    expect(result).toHaveLength(3);
  });

  it("mensal no dia 31 pula os meses que não têm 31 (regra do iCal)", () => {
    const start = paris(2026, 1, 31, 10);
    const end = paris(2026, 1, 31, 11);
    const result = expandOccurrences(start, end, rule({ frequency: "monthly" }), paris(2026, 1, 1), paris(2026, 6, 30));

    // Janeiro, março e maio. Fevereiro, abril e junho não têm dia 31.
    expect(result.map((o) => o.start.toISOString().slice(5, 7))).toEqual(["01", "03", "05"]);
  });

  it("série diária sem fim continua aparecendo depois de anos (antes sumia após ~5,5 anos)", () => {
    const start = paris(2018, 1, 1, 10);
    const end = paris(2018, 1, 1, 11);
    const result = expandOccurrences(start, end, rule({}), paris(2026, 9, 28), paris(2026, 9, 30, 23, 59));

    expect(result).toHaveLength(3);
    expect(result.every((o) => parisHour(o.start) === 10)).toBe(true);
  });

  it("inclui a ocorrência que começou no dia anterior e termina dentro da janela", () => {
    // 22h às 2h do dia seguinte.
    const start = paris(2026, 5, 10, 22);
    const end = paris(2026, 5, 11, 2);
    const result = expandOccurrences(start, end, rule({}), paris(2026, 5, 11), paris(2026, 5, 11, 23, 59));

    expect(result).toHaveLength(2);
  });

  it("guarda o início original de cada ocorrência para casar overrides", () => {
    const start = paris(2026, 1, 5, 9);
    const end = paris(2026, 1, 5, 10);
    const [first] = expandOccurrences(start, end, rule({ frequency: "weekly" }), paris(2026, 1, 1), paris(2026, 1, 10));

    expect(first.originalStart.getTime()).toBe(first.start.getTime());
  });
});

describe("describeRecurrence", () => {
  it("descreve regras simples em português", () => {
    expect(describeRecurrence(rule({ frequency: "weekly" }))).toBe("A cada semana");
    expect(describeRecurrence(rule({ repeatEvery: 2, frequency: "monthly", endType: "after_count", occurrenceCount: 6 }))).toBe(
      "A cada 2 meses, 6 vezes"
    );
    expect(describeRecurrence(rule({ endType: "on_date", until: "2026-12-31" }))).toBe("A cada dia, até 31/12/2026");
  });
});
