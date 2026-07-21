export type ClientType = "particulier" | "professionnel";
export type ActivityCategory = "vente" | "service_bic" | "service_bnc";
export type VatRegime = "franchise" | "assujetti";
export type DeclarationPeriodicite = "mensal" | "trimestral";
export type DocumentType = "devis" | "facture" | "avoir";
export type PaymentMethod = "virement" | "cheque" | "especes" | "cb" | "stripe" | "autre";
export type DocumentStatus =
  | "draft"
  | "sent"
  | "paid"
  | "partial"
  | "cancelled"
  | "expired"
  | "accepted"
  | "refused";

export type Client = {
  id: string;
  user_id: string;
  type: ClientType;
  nom: string | null;
  raison_sociale: string | null;
  siren: string | null;
  adresse_rue: string | null;
  adresse_cp: string | null;
  adresse_ville: string | null;
  email: string | null;
  telephone: string | null;
  notes: string | null;
  archived: boolean;
  created_at: string;
  updated_at: string;
};

export type CatalogItem = {
  id: string;
  user_id: string;
  designation: string;
  description: string | null;
  prix_unitaire_ht: number;
  unite: string;
  categorie: ActivityCategory;
  archived: boolean;
  created_at: string;
};

export type Profile = {
  id: string;
  nome: string | null;
  prenom: string | null;
  adresse_rue: string | null;
  adresse_cp: string | null;
  adresse_ville: string | null;
  siret: string | null;
  code_ape: string | null;
  date_debut_activite: string | null;
  regime_tva: VatRegime;
  activite_principale: ActivityCategory | null;
  acre: boolean;
  versement_liberatoire: boolean;
  taux_penalites_retard: number;
  declaration_periodicite: DeclarationPeriodicite;
  monthly_summary_email: boolean;
  logo_url: string | null;
  avatar_url: string | null;
  couleur_principale: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  plan: string | null;
  subscription_status: string | null;
  current_period_end: string | null;
  billing_email: string | null;
  created_at: string;
  updated_at: string;
};

export type Document = {
  id: string;
  user_id: string;
  client_id: string | null;
  type: DocumentType;
  status: DocumentStatus;
  numero: string | null;
  date_emission: string | null;
  date_echeance: string | null;
  date_prestation: string | null;
  validite_jours: number | null;
  total_ht: number;
  total_tva: number;
  total_ttc: number;
  mention_tva: string | null;
  conditions_paiement: string | null;
  notes_bas_page: string | null;
  moyens_paiement: PaymentMethod[] | null;
  acompte_pct: number | null;
  source_devis_id: string | null;
  facture_origine_id: string | null;
  pdf_path: string | null;
  created_at: string;
  updated_at: string;
  emitted_at: string | null;
};

export type DocumentLine = {
  id: string;
  document_id: string;
  user_id: string;
  ordre: number;
  designation: string;
  description: string | null;
  quantite: number;
  prix_unitaire_ht: number;
  taux_tva: number;
  categorie: ActivityCategory;
  total_ligne_ht: number;
};

export type Payment = {
  id: string;
  user_id: string;
  document_id: string;
  date_encaissement: string;
  montant: number;
  moyen: PaymentMethod;
  reference: string | null;
  notes: string | null;
  created_at: string;
};

export type Purchase = {
  id: string;
  user_id: string;
  date_achat: string;
  fournisseur: string;
  designation: string;
  montant: number;
  moyen: string | null;
  reference_piece: string | null;
  created_at: string;
};

// URSSAF — base de declaração (preparação; nunca envio oficial).
export type DeclarationDraftStatus = "ready" | "confirmed";
export type DeclarationLineStatus = "confirmed" | "needs_review" | "excluded";

export type DeclarationDraft = {
  id: string;
  user_id: string;
  period_start: string;
  period_end: string;
  periodicite: DeclarationPeriodicite;
  status: DeclarationDraftStatus;
  total_confirmed: number;
  confirmed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type DeclarationLine = {
  id: string;
  draft_id: string;
  user_id: string;
  payment_id: string | null;
  document_id: string | null;
  date_encaissement: string;
  montant: number;
  client_name: string | null;
  numero: string | null;
  categorie: ActivityCategory | null;
  moyen: string | null;
  status: DeclarationLineStatus;
  reason: string | null;
  created_at: string;
};

// Livro de receitas — entrada manual (recibo sem fatura, registro contábil).
export type ManualReceipt = {
  id: string;
  user_id: string;
  client_name: string | null;
  reference: string | null;
  date_encaissement: string;
  categorie: ActivityCategory;
  moyen: PaymentMethod;
  montant: number;
  fichier_path: string | null;
  created_at: string;
};

// Banco (Fase 5) — transações cruas NUNCA entram no caixa/URSSAF.
export type BankReconcileStatus = "pending" | "suggested" | "confirmed" | "ignored" | "non_business";

export type BankConnection = {
  id: string;
  user_id: string;
  provider: "manual" | "bridge";
  provider_item_id: string | null;
  label: string | null;
  status: "active" | "needs_reconnect" | "revoked";
  last_sync_at: string | null;
  created_at: string;
  updated_at: string;
};

export type BankAccount = {
  id: string;
  connection_id: string;
  user_id: string;
  provider_account_id: string | null;
  name: string;
  iban_last4: string | null;
  currency: string;
  created_at: string;
};

export type BankTransaction = {
  id: string;
  account_id: string;
  user_id: string;
  provider_tx_id: string;
  date: string;
  amount: number;
  label: string;
  direction: "credit" | "debit";
  reconcile_status: BankReconcileStatus;
  created_at: string;
};

// Meu Conselheiro — solicitações de suporte/orientação.
export type AdvisorRequestStatus = "received" | "in_review" | "answered" | "closed";

export type AdvisorRequestKind = "support" | "declaration_review";

// Snapshot server-computed anexado na escalação de revisão de declaração.
export type AdvisorRequestContext = {
  periodo?: string;
  total_confirmado?: string;
  confianca?: number;
  pendencias?: number;
  categoria?: string | null;
  periodicidade?: string | null;
  regime_tva?: string | null;
  draft_status?: string;
};

export type AdvisorRequest = {
  id: string;
  user_id: string;
  subject: string | null;
  message: string;
  status: AdvisorRequestStatus;
  admin_response: string | null;
  responded_at: string | null;
  kind: AdvisorRequestKind;
  draft_id: string | null;
  context: AdvisorRequestContext | null;
  created_at: string;
  updated_at: string;
};

// Factures reçues (V2). "en_retard" NÃO é persistido: derivado em query/UI
// via status = 'a_payer' && date_echeance < hoje.
export type SupplierInvoiceStatus = "a_payer" | "payee" | "a_verifier";

export type SupplierInvoice = {
  id: string;
  user_id: string;
  fournisseur: string;
  reference: string | null;
  designation: string | null;
  date_reception: string;
  date_echeance: string | null;
  montant_ttc: number;
  montant_tva: number | null;
  status: SupplierInvoiceStatus;
  purchase_id: string | null;
  fichier_path: string | null;
  created_at: string;
  updated_at: string;
};

export type ContractTemplate = {
  id: string;
  user_id: string;
  title: string;
  body: string;
  created_at: string;
  updated_at: string;
};

export const categoryLabels: Record<ActivityCategory, string> = {
  vente: "Vente",
  service_bic: "Service BIC",
  service_bnc: "Service BNC"
};

export const clientTypeLabels: Record<ClientType, string> = {
  particulier: "Particular",
  professionnel: "Profissional"
};

export const vatRegimeLabels: Record<VatRegime, string> = {
  franchise: "Franchise de TVA",
  assujetti: "Assujetti TVA"
};

// Rótulos do documento em si — usados na prévia e no PDF. DEVEM permanecer
// em francês: é o texto legal que sai no documento entregue ao cliente.
export const documentTypeLabels: Record<DocumentType, string> = {
  devis: "Devis",
  facture: "Facture",
  avoir: "Avoir"
};

// Rótulos apenas de interface (seletor do editor, lista de documentos).
// Português para o usuário; nunca aparecem na prévia nem no PDF.
export const documentTypeUiLabels: Record<DocumentType, string> = {
  devis: "Orçamento",
  facture: "Fatura",
  avoir: "Nota de crédito"
};

export const documentStatusLabels: Record<DocumentStatus, string> = {
  draft: "Rascunho",
  sent: "Emitido",
  paid: "Pago",
  partial: "Parcial",
  cancelled: "Cancelado",
  expired: "Expirado",
  accepted: "Aceito",
  refused: "Recusado"
};

export const paymentMethodLabels: Record<PaymentMethod, string> = {
  virement: "Transferência",
  cheque: "Cheque",
  especes: "Dinheiro",
  cb: "Cartão",
  stripe: "Stripe",
  autre: "Outro"
};
