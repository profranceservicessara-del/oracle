// Relatório de vencimentos (balance âgée). Agrupa saldos em aberto por faixa de
// atraso, para clientes (a receber) e fornecedores (a pagar). Só leitura,
// derivado dos dados que já existem. Sem partida dobrada, sem TVA cravada.
import { createClient } from "@/lib/supabase/server";

export type AgingRow = {
  party: string;
  notDue: number; // ainda não vencido
  d1_30: number; // 1 a 30 dias de atraso
  d31_60: number;
  d61_90: number;
  d90plus: number; // mais de 90 dias
  total: number;
};

export type AgingResult = {
  rows: AgingRow[];
  totals: Omit<AgingRow, "party">;
};

const DAY = 24 * 60 * 60 * 1000;

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// Dias de atraso positivos = vencido; <= 0 = ainda não vencido.
function daysOverdue(refDate: string | null, today: Date): number {
  if (!refDate) return 0;
  const ref = new Date(refDate);
  if (Number.isNaN(ref.getTime())) return 0;
  return Math.floor((today.getTime() - ref.getTime()) / DAY);
}

// Acumula um valor em aberto no bucket certo de uma linha por terceiro.
function addToBucket(map: Map<string, AgingRow>, party: string, refDate: string | null, amount: number, today: Date) {
  if (amount <= 0.005) return;
  const row =
    map.get(party) ?? { party, notDue: 0, d1_30: 0, d31_60: 0, d61_90: 0, d90plus: 0, total: 0 };
  const days = daysOverdue(refDate, today);
  if (days <= 0) row.notDue += amount;
  else if (days <= 30) row.d1_30 += amount;
  else if (days <= 60) row.d31_60 += amount;
  else if (days <= 90) row.d61_90 += amount;
  else row.d90plus += amount;
  row.total += amount;
  map.set(party, row);
}

function finalize(map: Map<string, AgingRow>): AgingResult {
  const rows = Array.from(map.values())
    .map((r) => ({
      party: r.party,
      notDue: round2(r.notDue),
      d1_30: round2(r.d1_30),
      d31_60: round2(r.d31_60),
      d61_90: round2(r.d61_90),
      d90plus: round2(r.d90plus),
      total: round2(r.total)
    }))
    .sort((a, b) => b.total - a.total);
  const totals = rows.reduce(
    (acc, r) => ({
      notDue: acc.notDue + r.notDue,
      d1_30: acc.d1_30 + r.d1_30,
      d31_60: acc.d31_60 + r.d31_60,
      d61_90: acc.d61_90 + r.d61_90,
      d90plus: acc.d90plus + r.d90plus,
      total: acc.total + r.total
    }),
    { notDue: 0, d1_30: 0, d31_60: 0, d61_90: 0, d90plus: 0, total: 0 }
  );
  return {
    rows,
    totals: {
      notDue: round2(totals.notDue),
      d1_30: round2(totals.d1_30),
      d31_60: round2(totals.d31_60),
      d61_90: round2(totals.d61_90),
      d90plus: round2(totals.d90plus),
      total: round2(totals.total)
    }
  };
}

// A receber: faturas de venda (documents type=facture) com saldo em aberto
// (total_ttc menos pagamentos recebidos). Referência de atraso: vencimento, ou
// emissão se não houver vencimento.
export async function loadClientAging(): Promise<AgingResult> {
  const supabase = createClient();
  const today = new Date();

  const [facturesRes, paymentsRes, clientsRes] = await Promise.all([
    supabase
      .from("documents")
      .select("id, client_id, total_ttc, date_echeance, date_emission, status")
      .eq("type", "facture")
      .not("status", "in", "(draft,cancelled)"),
    supabase.from("payments").select("document_id, montant"),
    supabase.from("clients").select("id, nom, raison_sociale")
  ]);

  const paidByDoc = new Map<string, number>();
  for (const p of paymentsRes.data ?? []) {
    const id = (p as { document_id: string }).document_id;
    paidByDoc.set(id, (paidByDoc.get(id) ?? 0) + (Number((p as { montant: number }).montant) || 0));
  }

  const nameByClient = new Map<string, string>();
  for (const c of clientsRes.data ?? []) {
    const row = c as { id: string; nom: string | null; raison_sociale: string | null };
    nameByClient.set(row.id, row.raison_sociale || row.nom || "Cliente sem nome");
  }

  const map = new Map<string, AgingRow>();
  for (const f of facturesRes.data ?? []) {
    const doc = f as {
      id: string;
      client_id: string | null;
      total_ttc: number;
      date_echeance: string | null;
      date_emission: string | null;
    };
    const outstanding = (Number(doc.total_ttc) || 0) - (paidByDoc.get(doc.id) ?? 0);
    const party = doc.client_id ? nameByClient.get(doc.client_id) ?? "Cliente sem nome" : "Sem cliente";
    addToBucket(map, party, doc.date_echeance ?? doc.date_emission, outstanding, today);
  }
  return finalize(map);
}

// A pagar: faturas de fornecedor em aberto (supplier_invoices status a_payer) e
// documentos de compra efetivados (purchase_documents validado/parcial) com
// saldo. Referência de atraso: vencimento, ou data do documento se não houver.
export async function loadSupplierAging(): Promise<AgingResult> {
  const supabase = createClient();
  const today = new Date();

  const [invoicesRes, purchaseDocsRes, purchasePaymentsRes, suppliersRes] = await Promise.all([
    supabase
      .from("supplier_invoices")
      .select("fournisseur, montant_ttc, date_echeance, date_reception, status")
      .eq("status", "a_payer"),
    supabase
      .from("purchase_documents")
      .select("id, third_id, total_incl_tax, due_date, document_date, status")
      .in("status", ["validated", "partially_paid"]),
    supabase.from("purchase_payments").select("document_id, amount"),
    supabase.from("contact_thirds").select("id, name").eq("third_type", "supplier")
  ]);

  const map = new Map<string, AgingRow>();

  // Faturas de fornecedor (fonte de dados atual; fornecedor é texto livre).
  for (const inv of invoicesRes.data ?? []) {
    const row = inv as {
      fournisseur: string;
      montant_ttc: number;
      date_echeance: string | null;
      date_reception: string | null;
    };
    addToBucket(
      map,
      row.fournisseur || "Fornecedor sem nome",
      row.date_echeance ?? row.date_reception,
      Number(row.montant_ttc) || 0,
      today
    );
  }

  // Documentos do módulo Compras (fornecedor vem de contact_thirds).
  const paidByDoc = new Map<string, number>();
  for (const p of purchasePaymentsRes.data ?? []) {
    const id = (p as { document_id: string }).document_id;
    paidByDoc.set(id, (paidByDoc.get(id) ?? 0) + (Number((p as { amount: number }).amount) || 0));
  }
  const nameBySupplier = new Map<string, string>();
  for (const s of suppliersRes.data ?? []) {
    const row = s as { id: string; name: string };
    nameBySupplier.set(row.id, row.name);
  }
  for (const d of purchaseDocsRes.data ?? []) {
    const doc = d as {
      id: string;
      third_id: string | null;
      total_incl_tax: number;
      due_date: string | null;
      document_date: string;
    };
    const outstanding = (Number(doc.total_incl_tax) || 0) - (paidByDoc.get(doc.id) ?? 0);
    const party = doc.third_id ? nameBySupplier.get(doc.third_id) ?? "Fornecedor" : "Fornecedor";
    addToBucket(map, party, doc.due_date ?? doc.document_date, outstanding, today);
  }

  return finalize(map);
}
