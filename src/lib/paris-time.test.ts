import { describe, expect, it } from "vitest";
import { parisEndOfDay, parisStartOfDay, parisWallAsUtcMs, parisWallToInstant } from "./paris-time";

const wall = (y: number, m: number, d: number, h = 0, mi = 0) => Date.UTC(y, m - 1, d, h, mi, 0);

describe("parisWallToInstant", () => {
  it("usa +2h no verão", () => {
    expect(parisWallToInstant(wall(2026, 7, 15, 9)).toISOString()).toBe("2026-07-15T07:00:00.000Z");
  });

  it("usa +1h no inverno", () => {
    expect(parisWallToInstant(wall(2026, 1, 15, 9)).toISOString()).toBe("2026-01-15T08:00:00.000Z");
  });

  it("horário que não existe (pulo de primavera, 29/03/2026) avança para depois do pulo", () => {
    expect(parisWallToInstant(wall(2026, 3, 29, 2, 30)).toISOString()).toBe("2026-03-29T01:30:00.000Z");
  });

  it("ida e volta preserva o relógio de parede em datas comuns", () => {
    const samples = [wall(2026, 1, 1, 0, 30), wall(2026, 6, 30, 23, 59), wall(2026, 10, 24, 12), wall(2026, 12, 31, 23, 0)];
    for (const w of samples) {
      expect(parisWallAsUtcMs(parisWallToInstant(w))).toBe(w);
    }
  });
});

describe("início e fim do dia em Paris", () => {
  it("meia-noite de Paris no verão é 22h UTC do dia anterior", () => {
    expect(parisStartOfDay(new Date(2026, 6, 15)).toISOString()).toBe("2026-07-14T22:00:00.000Z");
  });

  it("meia-noite de Paris no inverno é 23h UTC do dia anterior", () => {
    expect(parisStartOfDay(new Date(2026, 0, 15)).toISOString()).toBe("2026-01-14T23:00:00.000Z");
  });

  it("o fim do dia é 23:59:59.999 em Paris", () => {
    expect(parisEndOfDay(new Date(2026, 6, 15)).toISOString()).toBe("2026-07-15T21:59:59.999Z");
  });

  it("evento das 00h30 de Paris cai dentro do intervalo do próprio dia", () => {
    const event = parisWallToInstant(wall(2026, 7, 15, 0, 30)).getTime();
    const day = new Date(2026, 6, 15);
    expect(event).toBeGreaterThanOrEqual(parisStartOfDay(day).getTime());
    expect(event).toBeLessThanOrEqual(parisEndOfDay(day).getTime());
  });
});
