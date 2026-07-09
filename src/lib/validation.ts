import { z } from "zod";

const optionalText = z
  .string()
  .trim()
  .transform((value) => (value === "" ? null : value))
  .nullable();

const optionalEmail = z
  .string()
  .trim()
  .transform((value) => (value === "" ? null : value))
  .pipe(z.string().email("Informe um email válido.").nullable());

const requiredText = (message: string) => z.string().trim().min(1, message);

const decimalFromString = (message: string) =>
  z.coerce
    .number({ message })
    .refine((value) => Number.isFinite(value), message);

export const clientSchema = z
  .object({
    type: z.enum(["particulier", "professionnel"], {
      message: "Escolha o tipo de cliente."
    }),
    nom: optionalText,
    raison_sociale: optionalText,
    siren: z
      .string()
      .trim()
      .transform((value) => value.replace(/\D/g, ""))
      .nullable(),
    adresse_rue: optionalText,
    adresse_cp: optionalText,
    adresse_ville: optionalText,
    email: optionalEmail,
    telephone: optionalText,
    notes: optionalText
  })
  .superRefine((value, ctx) => {
    if (value.type === "particulier" && !value.nom) {
      ctx.addIssue({
        code: "custom",
        message: "Informe o nome do cliente.",
        path: ["nom"]
      });
    }

    if (value.type === "professionnel") {
      if (!value.raison_sociale) {
        ctx.addIssue({
          code: "custom",
          message: "Informe a razão social.",
          path: ["raison_sociale"]
        });
      }

      if (!value.siren) {
        ctx.addIssue({
          code: "custom",
          message: "Informe o SIREN para cliente profissional.",
          path: ["siren"]
        });
      } else if (!/^\d{9}$/.test(value.siren)) {
        ctx.addIssue({
          code: "custom",
          message: "O SIREN deve ter 9 dígitos.",
          path: ["siren"]
        });
      }
    }
  });

export const catalogItemSchema = z.object({
  designation: requiredText("Informe a designação."),
  description: optionalText,
  prix_unitaire_ht: decimalFromString("Informe um preço válido.").min(
    0,
    "O preço não pode ser negativo."
  ),
  unite: requiredText("Informe a unidade."),
  categorie: z.enum(["vente", "service_bic", "service_bnc"], {
    message: "Escolha a categoria de atividade."
  })
});

export const profileSchema = z.object({
  nome: requiredText("Informe seu nome."),
  prenom: optionalText,
  adresse_rue: requiredText("Informe a rua."),
  adresse_cp: requiredText("Informe o código postal."),
  adresse_ville: requiredText("Informe a cidade."),
  siret: z
    .string()
    .trim()
    .transform((value) => value.replace(/\D/g, ""))
    .refine((value) => /^\d{14}$/.test(value), "O SIRET deve ter 14 dígitos."),
  code_ape: optionalText,
  date_debut_activite: optionalText,
  regime_tva: z.enum(["franchise", "assujetti"], {
    message: "Escolha o regime de TVA."
  }),
  activite_principale: z.enum(["vente", "service_bic", "service_bnc"], {
    message: "Escolha a atividade principal."
  }),
  declaration_periodicite: z.enum(["mensal", "trimestral"], {
    message: "Escolha a periodicidade de declaração."
  }),
  acre: z.coerce.boolean(),
  versement_liberatoire: z.coerce.boolean(),
  monthly_summary_email: z.coerce.boolean(),
  taux_penalites_retard: decimalFromString("Informe uma taxa válida.").min(
    0,
    "A taxa não pode ser negativa."
  ),
  couleur_principale: optionalText
});

export const paymentSchema = z.object({
  date_encaissement: requiredText("Informe a data de recebimento."),
  montant: decimalFromString("Informe um valor válido.").positive("O valor deve ser maior que zero."),
  moyen: z.enum(["virement", "cheque", "especes", "cb", "stripe", "autre"], {
    message: "Escolha o meio de pagamento."
  }),
  reference: optionalText,
  notes: optionalText
});

export const purchaseSchema = z.object({
  date_achat: requiredText("Informe a data da compra."),
  fournisseur: requiredText("Informe o fornecedor."),
  designation: requiredText("Informe a designação."),
  montant: decimalFromString("Informe um valor válido.").min(0, "O valor não pode ser negativo."),
  moyen: optionalText,
  reference_piece: optionalText
});

// Decimal opcional (>= 0). "" ou null viram null; vírgula normalizada p/ ponto.
const optionalNonNegDecimal = (message: string) =>
  z.preprocess(
    (value) => {
      if (value === "" || value == null) return null;
      return typeof value === "string" ? value.replace(",", ".") : value;
    },
    z.coerce.number({ message }).nonnegative(message).nullable()
  );

const requiredPositiveDecimal = (message: string) =>
  z.preprocess(
    (value) => (typeof value === "string" ? value.replace(",", ".") : value),
    z.coerce.number({ message }).positive("O valor deve ser maior que zero.")
  );

// Factures reçues (V2). Só campos editáveis — id/user_id/created_at/updated_at
// e purchase_id/fichier_path NÃO passam por aqui. "en_retard" é derivado, não
// é status.
export const supplierInvoiceSchema = z.object({
  fournisseur: requiredText("Informe o fornecedor."),
  reference: optionalText,
  designation: optionalText,
  date_reception: requiredText("Informe a data de recepção."),
  date_echeance: optionalText,
  montant_ttc: requiredPositiveDecimal("Informe um valor válido."),
  montant_tva: optionalNonNegDecimal("Informe uma TVA válida."),
  status: z.enum(["a_payer", "payee", "a_verifier"], { message: "Escolha o status." })
});

export function formatSiret(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 14);
  return digits.replace(/(\d{3})(?=\d)/g, "$1 ").trim();
}
