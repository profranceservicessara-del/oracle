import { describe, expect, it } from "vitest";
import { currentQuarterRange, monthRanges, nextUrssafDeadline, periodOptions } from "./accounting";

describe("períodos fiscais", () => {
  it("janeiro vai de 01/01 a 31/01, sem deslocar um dia por causa do fuso", () => {
    const january = periodOptions(2026, "mensal")[0];
    expect(january.start).toBe("2026-01-01");
    expect(january.end).toBe("2026-01-31");
  });

  it("fevereiro termina em 28 num ano comum e em 29 no bissexto", () => {
    expect(periodOptions(2026, "mensal")[1].end).toBe("2026-02-28");
    expect(periodOptions(2028, "mensal")[1].end).toBe("2028-02-29");
  });

  it("os trimestres cobrem o ano inteiro sem buraco", () => {
    const quarters = periodOptions(2026, "trimestral");
    expect(quarters.map((q) => [q.start, q.end])).toEqual([
      ["2026-01-01", "2026-03-31"],
      ["2026-04-01", "2026-06-30"],
      ["2026-07-01", "2026-09-30"],
      ["2026-10-01", "2026-12-31"]
    ]);
  });

  it("monthRanges e currentQuarterRange usam o mesmo calendário", () => {
    expect(monthRanges(2026)[11].end).toBe("2026-12-31");
    expect(currentQuarterRange(new Date(2026, 8, 24))).toEqual({ start: "2026-07-01", end: "2026-09-30" });
  });
});

// ATENÇÃO: estes testes fixam a regra ATUAL do código (mensal: fim do mês seguinte;
// trimestral: dia 30 do segundo mês depois do início do trimestre). A base de
// conhecimento é silenciosa sobre o prazo oficial da URSSAF, então essa regra
// ainda NÃO foi confirmada. Quando for, atualize as datas esperadas aqui junto com
// nextUrssafDeadline. O que estes testes garantem hoje é que nunca sai data
// impossível (30 de fevereiro virava 2 de março).
describe("nextUrssafDeadline (aritmética do calendário)", () => {
  it("mensal: nunca estoura o mês curto", () => {
    expect(nextUrssafDeadline("mensal", new Date(2026, 0, 15))).toBe("2026-02-28");
    expect(nextUrssafDeadline("mensal", new Date(2028, 0, 15))).toBe("2028-02-29");
  });

  it("mensal: meses de 30 e de 31 dias terminam no último dia", () => {
    expect(nextUrssafDeadline("mensal", new Date(2026, 1, 10))).toBe("2026-03-31");
    expect(nextUrssafDeadline("mensal", new Date(2026, 2, 10))).toBe("2026-04-30");
  });

  it("mensal: dezembro vira janeiro do ano seguinte", () => {
    expect(nextUrssafDeadline("mensal", new Date(2026, 11, 20))).toBe("2027-01-31");
  });

  it("trimestral: mantém o dia pretendido quando ele existe", () => {
    expect(nextUrssafDeadline("trimestral", new Date(2026, 8, 24))).toBe("2026-11-30");
    expect(nextUrssafDeadline("trimestral", new Date(2026, 0, 15))).toBe("2026-05-30");
  });

  it("trimestral: fevereiro nunca vira 2 de março", () => {
    expect(nextUrssafDeadline("trimestral", new Date(2026, 10, 5))).toBe("2027-02-28");
    expect(nextUrssafDeadline("trimestral", new Date(2026, 11, 5))).toBe("2027-02-28");
    expect(nextUrssafDeadline("trimestral", new Date(2027, 10, 5))).toBe("2028-02-29");
  });
});
