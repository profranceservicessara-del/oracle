// Saldo a receber de uma fatura de venda. Vários painéis (dashboard, prazos,
// vencimentos, análise) calculavam isso cada um do seu jeito e mostravam números
// diferentes para a mesma fatura. Esta é a conta única.

type AvoirRow = {
  facture_origine_id: string | null;
  total_ttc: number | string | null;
};

function round2(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Total já creditado por fatura, em valor positivo. Nota de crédito emitida
 * (status fora de rascunho e cancelada) grava total negativo e aponta para a
 * fatura em facture_origine_id. Sem esse abatimento, a fatura seguia inteira em
 * "a receber" até alguém cancelá-la à mão.
 */
export function creditsByFacture(avoirs: readonly AvoirRow[]): Map<string, number> {
  const credits = new Map<string, number>();
  for (const avoir of avoirs) {
    if (!avoir.facture_origine_id) continue;
    const credit = Math.abs(Number(avoir.total_ttc) || 0);
    credits.set(avoir.facture_origine_id, round2((credits.get(avoir.facture_origine_id) ?? 0) + credit));
  }
  return credits;
}

/** Saldo em aberto: total menos o pago menos o creditado, nunca negativo. */
export function outstandingBalance(totalTtc: number | string | null, paid: number, credited: number): number {
  return Math.max(0, round2((Number(totalTtc) || 0) - paid - credited));
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Data de referência do atraso: o vencimento, ou a emissão quando não houver.
 * O padrão do sistema é "pagamento à recepção da fatura", então sem vencimento
 * o prazo conta da emissão. Aging e prazos usam a mesma regra.
 */
export function dueReference(dateEcheance: string | null, dateEmission: string | null): string | null {
  return dateEcheance ?? dateEmission;
}

/** Dias de atraso: positivo = vencido, zero ou negativo = a vencer, null = sem data. */
export function daysOverdue(refDate: string | null, now: Date = new Date()): number | null {
  if (!refDate) return null;
  const ref = new Date(refDate);
  if (Number.isNaN(ref.getTime())) return null;
  return Math.floor((now.getTime() - ref.getTime()) / DAY_MS);
}
