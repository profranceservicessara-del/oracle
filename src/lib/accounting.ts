import { categoryLabels, type ActivityCategory, type Document, type DocumentLine } from "@/lib/types";

export type CategoryTotals = Record<ActivityCategory, number>;

export type RevenueBookRow = {
  id: string;
  date: string;
  documentId: string;
  numero: string;
  clientName: string;
  category: ActivityCategory;
  montant: number;
  moyen: string;
};

export type PeriodOption = {
  label: string;
  value: string;
  start: string;
  end: string;
};

const categories: ActivityCategory[] = ["vente", "service_bic", "service_bnc"];

export const activityCategories = categories;

export function roundCurrency(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function emptyCategoryTotals(): CategoryTotals {
  return {
    vente: 0,
    service_bic: 0,
    service_bnc: 0
  };
}

export function totalLinesByCategory(lines: DocumentLine[]) {
  return lines.reduce((totals, line) => {
    totals[line.categorie] = roundCurrency(totals[line.categorie] + line.total_ligne_ht);
    return totals;
  }, emptyCategoryTotals());
}

export function allocatePaymentByCategory(
  paymentAmount: number,
  document: Pick<Document, "total_ht">,
  lines: DocumentLine[]
) {
  const lineTotals = totalLinesByCategory(lines);
  const baseTotal = document.total_ht || categories.reduce((sum, category) => sum + lineTotals[category], 0);
  const allocated = emptyCategoryTotals();

  if (baseTotal <= 0) {
    return allocated;
  }

  let assigned = 0;
  const presentCategories = categories.filter((category) => lineTotals[category] !== 0);

  presentCategories.forEach((category, index) => {
    if (index === presentCategories.length - 1) {
      allocated[category] = roundCurrency(paymentAmount - assigned);
      return;
    }

    const value = roundCurrency(paymentAmount * (lineTotals[category] / baseTotal));
    allocated[category] = value;
    assigned = roundCurrency(assigned + value);
  });

  return allocated;
}

export function sumCategoryTotals(rows: Array<{ category: ActivityCategory; montant: number }>) {
  return rows.reduce((totals, row) => {
    totals[row.category] = roundCurrency(totals[row.category] + row.montant);
    return totals;
  }, emptyCategoryTotals());
}

export function totalCategoryAmount(totals: CategoryTotals) {
  return categories.reduce((sum, category) => roundCurrency(sum + totals[category]), 0);
}

export function yearRange(year: number) {
  return {
    start: `${year}-01-01`,
    end: `${year}-12-31`
  };
}

export function monthRanges(year: number) {
  return Array.from({ length: 12 }, (_, index) => {
    const start = new Date(year, index, 1);
    const end = new Date(year, index + 1, 0);

    return {
      label: new Intl.DateTimeFormat("pt-BR", { month: "short" }).format(start),
      start: start.toISOString().slice(0, 10),
      end: end.toISOString().slice(0, 10)
    };
  });
}

export function currentQuarterRange(reference = new Date()) {
  const year = reference.getFullYear();
  const quarter = Math.floor(reference.getMonth() / 3);
  const start = new Date(year, quarter * 3, 1);
  const end = new Date(year, quarter * 3 + 3, 0);

  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10)
  };
}

export function periodOptions(year: number, periodicite: "mensal" | "trimestral"): PeriodOption[] {
  if (periodicite === "mensal") {
    return Array.from({ length: 12 }, (_, index) => {
      const start = new Date(year, index, 1);
      const end = new Date(year, index + 1, 0);
      return {
        label: new Intl.DateTimeFormat("pt-BR", { month: "long" }).format(start),
        value: String(index + 1),
        start: start.toISOString().slice(0, 10),
        end: end.toISOString().slice(0, 10)
      };
    });
  }

  return [0, 1, 2, 3].map((quarter) => {
    const start = new Date(year, quarter * 3, 1);
    const end = new Date(year, quarter * 3 + 3, 0);
    return {
      label: `${quarter + 1}º trimestre`,
      value: String(quarter + 1),
      start: start.toISOString().slice(0, 10),
      end: end.toISOString().slice(0, 10)
    };
  });
}

export function nextUrssafDeadline(periodicite: "mensal" | "trimestral", reference = new Date()) {
  const year = reference.getFullYear();

  if (periodicite === "mensal") {
    return new Date(year, reference.getMonth() + 1, 31).toISOString().slice(0, 10);
  }

  const quarter = Math.floor(reference.getMonth() / 3);
  return new Date(year, quarter * 3 + 4, 30).toISOString().slice(0, 10);
}

export function categoryLabel(category: ActivityCategory) {
  return categoryLabels[category];
}
