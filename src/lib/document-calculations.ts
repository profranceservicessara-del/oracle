import { fiscalConfig } from "@/config/fiscal";
import type { ActivityCategory, DocumentType, Profile, VatRegime } from "./types";

export type EditorLine = {
  id: string;
  designation: string;
  description: string;
  quantite: number;
  prix_unitaire_ht: number;
  taux_tva: number;
  categorie: ActivityCategory;
};

export type TotalsByCategory = Record<ActivityCategory, number>;

export type DocumentTotals = {
  byCategory: TotalsByCategory;
  totalHt: number;
  totalTva: number;
  totalTtc: number;
};

export const tvaFranchiseMention = "TVA non applicable, art. 293 B du CGI";

export function roundCurrency(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function calculateLineHt(line: EditorLine) {
  return roundCurrency(line.quantite * line.prix_unitaire_ht);
}

export function calculateDocumentTotals(lines: EditorLine[], regimeTva: VatRegime): DocumentTotals {
  const byCategory: TotalsByCategory = {
    vente: 0,
    service_bic: 0,
    service_bnc: 0
  };

  let totalTva = 0;

  lines.forEach((line) => {
    const lineHt = calculateLineHt(line);
    byCategory[line.categorie] = roundCurrency(byCategory[line.categorie] + lineHt);

    if (regimeTva === "assujetti") {
      totalTva = roundCurrency(totalTva + lineHt * (line.taux_tva / 100));
    }
  });

  const totalHt = roundCurrency(byCategory.vente + byCategory.service_bic + byCategory.service_bnc);

  return {
    byCategory,
    totalHt,
    totalTva,
    totalTtc: roundCurrency(totalHt + totalTva)
  };
}

// Nota de crédito (avoir): o banco exige totais <= 0 (documents_total_*_by_type_check)
// e create_avoir já grava assim. O editor trabalha com valores positivos (o que a
// pessoa digita); o sinal é aplicado só ao persistir e ao imprimir. Zero fica 0,
// nunca -0, senão o Intl.NumberFormat exibiria "-0,00 €".
export function applyDocumentSign(totals: DocumentTotals, type: DocumentType): DocumentTotals {
  if (type !== "avoir") return totals;
  const negate = (value: number) => (value === 0 ? 0 : -Math.abs(value));
  return {
    byCategory: {
      vente: negate(totals.byCategory.vente),
      service_bic: negate(totals.byCategory.service_bic),
      service_bnc: negate(totals.byCategory.service_bnc)
    },
    totalHt: negate(totals.totalHt),
    totalTva: negate(totals.totalTva),
    totalTtc: negate(totals.totalTtc)
  };
}

// Total de uma linha já com o sinal do documento (avoir grava negativo).
export function signedLineTotal(line: EditorLine, type: DocumentType) {
  const total = calculateLineHt(line);
  return type === "avoir" && total !== 0 ? -Math.abs(total) : total;
}

function categoryRate(category: ActivityCategory) {
  if (category === "vente") {
    return fiscalConfig.urssafContributionRates.vente;
  }

  if (category === "service_bic") {
    return fiscalConfig.urssafContributionRates.serviceBic;
  }

  return fiscalConfig.urssafContributionRates.serviceBnc;
}

function versementRate(category: ActivityCategory) {
  if (category === "vente") {
    return fiscalConfig.versementLiberatoireRates.vente;
  }

  if (category === "service_bic") {
    return fiscalConfig.versementLiberatoireRates.serviceBic;
  }

  return fiscalConfig.versementLiberatoireRates.serviceBnc;
}

export function calculateResteAVivre(byCategory: TotalsByCategory, profile: Profile | null) {
  const acreMultiplier = profile?.acre ? fiscalConfig.acre.contributionMultiplier : 1;
  const versementEnabled = Boolean(profile?.versement_liberatoire);

  return (Object.keys(byCategory) as ActivityCategory[])
    .filter((category) => byCategory[category] > 0)
    .map((category) => {
      const total = byCategory[category];
      const cotisations = roundCurrency(total * categoryRate(category) * acreMultiplier);
      const versementLiberatoire = versementEnabled
        ? roundCurrency(total * versementRate(category))
        : 0;
      const deductions = roundCurrency(cotisations + versementLiberatoire);

      return {
        category,
        total,
        cotisations,
        versementLiberatoire,
        deductions,
        net: roundCurrency(total - deductions)
      };
    });
}
