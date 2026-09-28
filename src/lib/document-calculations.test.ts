import { describe, expect, it } from "vitest";
import {
  applyDocumentSign,
  calculateDocumentTotals,
  calculateLineHt,
  signedLineTotal,
  type EditorLine
} from "./document-calculations";

const line = (overrides: Partial<EditorLine>): EditorLine => ({
  id: "1",
  designation: "Serviço",
  description: "",
  quantite: 1,
  prix_unitaire_ht: 100,
  taux_tva: 20,
  categorie: "service_bnc",
  ...overrides
});

describe("calculateDocumentTotals", () => {
  const lines = [
    line({ quantite: 2, prix_unitaire_ht: 100, categorie: "vente" }),
    line({ id: "2", quantite: 1, prix_unitaire_ht: 50, categorie: "service_bnc" })
  ];

  it("em franchise a TVA é zero e o TTC é igual ao HT", () => {
    const totals = calculateDocumentTotals(lines, "franchise");
    expect(totals.totalHt).toBe(250);
    expect(totals.totalTva).toBe(0);
    expect(totals.totalTtc).toBe(250);
  });

  it("como assujetti aplica a taxa de cada linha", () => {
    const totals = calculateDocumentTotals(lines, "assujetti");
    expect(totals.totalTva).toBe(50);
    expect(totals.totalTtc).toBe(300);
  });

  it("separa o total por categoria de atividade", () => {
    const totals = calculateDocumentTotals(lines, "franchise");
    expect(totals.byCategory.vente).toBe(200);
    expect(totals.byCategory.service_bnc).toBe(50);
    expect(totals.byCategory.service_bic).toBe(0);
  });

  it("arredonda cada linha a 2 casas", () => {
    expect(calculateLineHt(line({ quantite: 3, prix_unitaire_ht: 0.335 }))).toBe(1.01);
  });
});

describe("applyDocumentSign (nota de crédito)", () => {
  const totals = calculateDocumentTotals([line({ quantite: 2, prix_unitaire_ht: 100 })], "assujetti");

  it("nota de crédito grava valores negativos, como o check do banco exige", () => {
    const signed = applyDocumentSign(totals, "avoir");
    expect(signed.totalHt).toBe(-200);
    expect(signed.totalTva).toBe(-40);
    expect(signed.totalTtc).toBe(-240);
    expect(signed.byCategory.service_bnc).toBe(-200);
  });

  it("fatura e orçamento seguem positivos e o objeto não é copiado", () => {
    expect(applyDocumentSign(totals, "facture")).toBe(totals);
    expect(applyDocumentSign(totals, "devis")).toBe(totals);
  });

  it("zero continua zero, nunca -0 (senão a tela mostraria -0,00 €)", () => {
    const empty = calculateDocumentTotals([], "franchise");
    const signed = applyDocumentSign(empty, "avoir");
    expect(Object.is(signed.totalHt, 0)).toBe(true);
    expect(Object.is(signed.totalTtc, 0)).toBe(true);
  });

  it("não inverte de novo um valor que já é negativo", () => {
    const once = applyDocumentSign(totals, "avoir");
    expect(applyDocumentSign(once, "avoir").totalTtc).toBe(-240);
  });

  it("o total da linha segue o mesmo sinal", () => {
    expect(signedLineTotal(line({ quantite: 2, prix_unitaire_ht: 100 }), "avoir")).toBe(-200);
    expect(signedLineTotal(line({ quantite: 2, prix_unitaire_ht: 100 }), "facture")).toBe(200);
    expect(Object.is(signedLineTotal(line({ quantite: 1, prix_unitaire_ht: 0 }), "avoir"), 0)).toBe(true);
  });
});
