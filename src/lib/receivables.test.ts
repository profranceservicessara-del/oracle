import { describe, expect, it } from "vitest";
import { creditsByFacture, daysOverdue, dueReference, outstandingBalance } from "./receivables";

describe("creditsByFacture", () => {
  it("soma o valor absoluto das notas de crédito por fatura de origem", () => {
    const credits = creditsByFacture([
      { facture_origine_id: "f1", total_ttc: -100 },
      { facture_origine_id: "f1", total_ttc: "-50.5" },
      { facture_origine_id: "f2", total_ttc: -20 }
    ]);
    expect(credits.get("f1")).toBe(150.5);
    expect(credits.get("f2")).toBe(20);
  });

  it("ignora nota sem fatura de origem", () => {
    expect(creditsByFacture([{ facture_origine_id: null, total_ttc: -100 }]).size).toBe(0);
  });
});

describe("outstandingBalance", () => {
  it("desconta o pago e o creditado", () => {
    expect(outstandingBalance(1000, 400, 200)).toBe(400);
  });

  it("nunca fica negativo", () => {
    expect(outstandingBalance(100, 100, 50)).toBe(0);
  });

  it("aceita o total como texto vindo do banco", () => {
    expect(outstandingBalance("100.50", 0, 0)).toBe(100.5);
  });

  it("fatura totalmente creditada não tem saldo", () => {
    expect(outstandingBalance(240, 0, 240)).toBe(0);
  });
});

describe("prazo de atraso", () => {
  it("sem vencimento conta da emissão", () => {
    expect(dueReference(null, "2026-01-10")).toBe("2026-01-10");
    expect(dueReference("2026-02-01", "2026-01-10")).toBe("2026-02-01");
  });

  it("dias de atraso: positivo vencido, negativo a vencer, nulo sem data", () => {
    const now = new Date("2026-09-11T10:00:00Z");
    expect(daysOverdue("2026-09-01", now)).toBe(10);
    expect(daysOverdue("2026-09-20", now)).toBeLessThan(0);
    expect(daysOverdue(null, now)).toBeNull();
    expect(daysOverdue("data-invalida", now)).toBeNull();
  });
});
