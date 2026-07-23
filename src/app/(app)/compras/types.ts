// Tipos e constantes do módulo Compras (contas a pagar).
// Espelham as tabelas purchase_* da migration 20260724120000_purchases_module.

export type PurchaseDocType = "invoice" | "credit_note" | "order" | "delivery";
export type PurchaseVatMethod = "debit" | "collection";
export type PurchaseDocStatus =
  | "draft"
  | "to_verify"
  | "validated"
  | "partially_paid"
  | "paid"
  | "cancelled";
export type PurchasePaymentMethod = "check" | "transfer" | "card" | "cash" | "direct_debit" | "other";

export type PurchaseDocument = {
  id: string;
  user_id: string;
  type: PurchaseDocType;
  internal_number: string | null;
  external_number: string | null;
  third_id: string | null;
  document_date: string;
  due_date: string | null;
  currency: string;
  vat_method: PurchaseVatMethod;
  amounts_include_tax: boolean;
  status: PurchaseDocStatus;
  send_to_accounting: boolean;
  with_delivery: boolean;
  notes: string | null;
  total_excl_tax: number;
  total_vat: number;
  total_incl_tax: number;
  created_at: string;
  updated_at: string;
};

export type PurchaseDocumentLine = {
  id: string;
  document_id: string;
  position: number;
  reference: string | null;
  description: string | null;
  accounting_code_id: string | null;
  quantity: number;
  amount_excl_tax: number;
  vat_rate: number;
  amount_incl_tax: number;
  created_at: string;
  updated_at: string;
};

export type PurchasePayment = {
  id: string;
  user_id: string;
  document_id: string;
  reference: string | null;
  payment_date: string | null;
  amount: number;
  method: PurchasePaymentMethod;
  created_at: string;
};

export type PurchaseIncoming = {
  id: string;
  user_id: string;
  storage_path: string;
  original_filename: string | null;
  source: string | null;
  ocr_status: string | null;
  extracted: unknown | null;
  matched_document_id: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

export type AccountingCode = {
  id: string;
  code: string;
  label: string;
  is_active: boolean;
};

// Fornecedor mínimo, vindo de contact_thirds (third_type = 'supplier').
export type SupplierOption = {
  id: string;
  name: string;
};

// Estados nos quais o documento está efetivado: pagamentos permitidos e
// cabeçalho/linhas imutáveis (o banco também barra via trigger).
export const EFFECTIVE_STATUSES: PurchaseDocStatus[] = ["validated", "partially_paid", "paid"];

export function isEffective(status: PurchaseDocStatus): boolean {
  return EFFECTIVE_STATUSES.includes(status);
}

// Meta por tipo: rótulos PT, slug da rota e prefixo de numeração (só leitura,
// a numeração real vem do trigger no banco).
export const DOC_TYPE_META: Record<
  PurchaseDocType,
  { singular: string; plural: string; slug: string; prefix: string }
> = {
  invoice: { singular: "Fatura", plural: "Faturas", slug: "faturas", prefix: "F_INV" },
  credit_note: { singular: "Nota de crédito", plural: "Notas de crédito", slug: "notas-credito", prefix: "F_AV" },
  order: { singular: "Ordem de compra", plural: "Ordens de compra", slug: "ordens", prefix: "PO" },
  delivery: { singular: "Nota de entrega", plural: "Notas de entrega", slug: "entregas", prefix: "BL" }
};

export const SLUG_TO_TYPE: Record<string, PurchaseDocType> = {
  faturas: "invoice",
  "notas-credito": "credit_note",
  ordens: "order",
  entregas: "delivery"
};

export const STATUS_META: Record<PurchaseDocStatus, { label: string; badge: string }> = {
  draft: { label: "Rascunho", badge: "bg-slate-100 text-slate-600 ring-slate-200" },
  to_verify: { label: "A verificar", badge: "bg-slate-100 text-slate-600 ring-slate-200" },
  validated: { label: "Validado", badge: "bg-sky-50 text-sky-700 ring-sky-200" },
  partially_paid: { label: "Parcialmente pago", badge: "bg-amber-50 text-amber-700 ring-amber-200" },
  paid: { label: "Pago", badge: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  cancelled: { label: "Cancelado", badge: "bg-rose-50 text-rose-700 ring-rose-200" }
};

export const PAYMENT_METHOD_LABELS: Record<PurchasePaymentMethod, string> = {
  check: "Cheque",
  transfer: "Transferência",
  card: "Cartão",
  cash: "Dinheiro",
  direct_debit: "Débito automático",
  other: "Outro"
};

export const VAT_METHOD_LABELS: Record<PurchaseVatMethod, string> = {
  debit: "IVA sobre débitos",
  collection: "IVA sobre recebimentos"
};

// Calcula o par HT/TTC de uma linha (espelha fn_purchase_calc_line do banco,
// para exibição ao vivo antes de salvar). O banco é a fonte da verdade.
export function computeLine(
  amountExclTax: number,
  amountInclTax: number,
  vatRate: number,
  includeTax: boolean
): { excl: number; incl: number } {
  const factor = 1 + vatRate / 100;
  if (includeTax) {
    return { excl: Math.round((amountInclTax / factor) * 100) / 100, incl: amountInclTax };
  }
  return { excl: amountExclTax, incl: Math.round(amountExclTax * factor * 100) / 100 };
}
