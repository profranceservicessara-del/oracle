// Schemas Zod do módulo Compras. Validação compartilhada nos formulários.
// Não crava taxa de TVA (default 0); a app define o valor inicial, o banco
// recalcula os totais. Dinheiro coagido a número.
import { z } from "zod";

export const purchaseDocumentSchema = z.object({
  type: z.enum(["invoice", "credit_note", "order", "delivery"], { message: "Tipo inválido." }),
  third_id: z.string().uuid("Selecione um fornecedor.").nullable(),
  external_number: z.string().trim().max(120).optional(),
  document_date: z.string().min(1, "Informe a data do documento."),
  due_date: z.string().optional(),
  currency: z.string().trim().min(1).default("EUR"),
  vat_method: z.enum(["debit", "collection"]).default("debit"),
  amounts_include_tax: z.coerce.boolean().default(false),
  send_to_accounting: z.coerce.boolean().default(false),
  with_delivery: z.coerce.boolean().default(false),
  notes: z.string().trim().max(2000).optional()
});

export const purchaseLineSchema = z.object({
  reference: z.string().trim().max(120).optional(),
  description: z.string().trim().max(500).optional(),
  accounting_code_id: z.string().uuid().nullable().optional(),
  quantity: z.coerce.number().nonnegative("Quantidade inválida.").default(1),
  amount_excl_tax: z.coerce.number("Valor inválido.").default(0),
  vat_rate: z.coerce.number().min(0, "Taxa inválida.").max(100, "Taxa inválida.").default(0),
  amount_incl_tax: z.coerce.number().default(0)
});

export const purchasePaymentSchema = z.object({
  reference: z.string().trim().max(120).optional(),
  payment_date: z.string().optional(),
  amount: z.coerce.number().positive("O valor deve ser maior que zero."),
  method: z
    .enum(["check", "transfer", "card", "cash", "direct_debit", "other"], { message: "Escolha a forma de pagamento." })
    .default("other")
});

export type PurchaseDocumentInput = z.infer<typeof purchaseDocumentSchema>;
export type PurchaseLineInput = z.infer<typeof purchaseLineSchema>;
export type PurchasePaymentInput = z.infer<typeof purchasePaymentSchema>;
