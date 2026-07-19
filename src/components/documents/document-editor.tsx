"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormModal } from "@/components/ui/form-modal";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { emitDocumentAction } from "@/app/(app)/documentos/actions";
import { fiscalConfig } from "@/config/fiscal";
import { createClient } from "@/lib/supabase/client";
import {
  calculateDocumentTotals,
  tvaFranchiseMention,
  type EditorLine
} from "@/lib/document-calculations";
import { isProfileIncomplete } from "@/lib/profile-completeness";
import { clientSchema } from "@/lib/validation";
import {
  categoryLabels,
  clientTypeLabels,
  documentTypeLabels,
  paymentMethodLabels,
  type ActivityCategory,
  type CatalogItem,
  type Client,
  type ClientType,
  type Document,
  type DocumentType,
  type DocumentLine,
  type PaymentMethod,
  type Profile
} from "@/lib/types";

// Meios de pagamento oferecidos como opção na fatura (subconjunto curado).
const PAYMENT_METHOD_OPTIONS: PaymentMethod[] = ["virement", "cheque", "especes", "cb", "stripe"];
const euroFmt = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
import { DocumentPreview } from "./document-preview";
import { ResteAVivrePanel } from "./reste-a-vivre-panel";

type DocumentEditorProps = {
  catalogItems: CatalogItem[];
  clients: Client[];
  initialClientId?: string;
  initialDocument: Document | null;
  initialLines: DocumentLine[];
  initialType: DocumentType;
  profile: Profile | null;
  userId: string;
};

type ClientFormState = {
  type: ClientType;
  nom: string;
  raison_sociale: string;
  siren: string;
  adresse_rue: string;
  adresse_cp: string;
  adresse_ville: string;
  email: string;
  telephone: string;
  notes: string;
};

const today = new Date().toISOString().slice(0, 10);

const emptyClientForm: ClientFormState = {
  type: "particulier",
  nom: "",
  raison_sociale: "",
  siren: "",
  adresse_rue: "",
  adresse_cp: "",
  adresse_ville: "",
  email: "",
  telephone: "",
  notes: ""
};

// Unidade da linha (coluna document_lines.unite, default "unité").
const lineUnits = ["unité", "h", "kg", "m", "cm", "km", "pièce", "service", "forfait"] as const;
const DEFAULT_UNIT = "unité";

// EditorLine não carrega `unite`; estende localmente sem alterar o tipo compartilhado.
type EditorLineWithUnit = EditorLine & { unite: string };

function newLine(): EditorLineWithUnit {
  return {
    id: crypto.randomUUID(),
    designation: "",
    description: "",
    quantite: 1,
    prix_unitaire_ht: 0,
    taux_tva: fiscalConfig.legalDocumentValues.defaultVatRate,
    categorie: "service_bic",
    unite: DEFAULT_UNIT
  };
}

function fromDbLine(line: DocumentLine): EditorLineWithUnit {
  return {
    id: line.id,
    designation: line.designation,
    description: line.description ?? "",
    quantite: line.quantite,
    prix_unitaire_ht: line.prix_unitaire_ht,
    taux_tva: line.taux_tva,
    categorie: line.categorie,
    // Coluna existe no DB mas não no tipo DocumentLine — fallback seguro.
    unite: (line as { unite?: string | null }).unite ?? DEFAULT_UNIT
  };
}

function dateOrDefault(value: string | null | undefined) {
  return value ?? today;
}

function toDbDate(value: string) {
  return value || null;
}

export function DocumentEditor({
  catalogItems,
  clients: initialClients,
  initialClientId,
  initialDocument,
  initialLines,
  initialType,
  profile,
  userId
}: DocumentEditorProps) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const { showToast } = useToast();
  const [documentId, setDocumentId] = useState(initialDocument?.id ?? null);
  const [documentType, setDocumentType] = useState<DocumentType>(initialDocument?.type ?? initialType);
  const [clients, setClients] = useState(initialClients);
  const [clientId, setClientId] = useState(initialDocument?.client_id ?? initialClientId ?? "");
  const [dateEmission, setDateEmission] = useState(dateOrDefault(initialDocument?.date_emission));
  const [datePrestation, setDatePrestation] = useState(
    dateOrDefault(initialDocument?.date_prestation)
  );
  const [dateEcheance, setDateEcheance] = useState(dateOrDefault(initialDocument?.date_echeance));
  const [validiteJours, setValiditeJours] = useState(initialDocument?.validite_jours ?? 30);
  const [conditionsPaiement, setConditionsPaiement] = useState(
    initialDocument?.conditions_paiement ?? "Paiement à réception de facture."
  );
  const [notesBasPage, setNotesBasPage] = useState(initialDocument?.notes_bas_page ?? "");
  const [moyensPaiement, setMoyensPaiement] = useState<PaymentMethod[]>(
    (initialDocument?.moyens_paiement as PaymentMethod[] | null) ?? []
  );
  const [acompteEnabled, setAcompteEnabled] = useState<boolean>(
    initialDocument?.acompte_pct != null && Number(initialDocument.acompte_pct) > 0
  );
  const [acomptePct, setAcomptePct] = useState<string>(
    initialDocument?.acompte_pct != null ? String(initialDocument.acompte_pct) : "30"
  );
  const [lines, setLines] = useState<EditorLineWithUnit[]>(
    initialLines.length > 0 ? initialLines.map(fromDbLine) : [newLine()]
  );
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "error">("idle");
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [isEmitModalOpen, setIsEmitModalOpen] = useState(false);
  const [isProfileBlockOpen, setIsProfileBlockOpen] = useState(false);
  const [isEmitting, setIsEmitting] = useState(false);
  const [clientForm, setClientForm] = useState<ClientFormState>(emptyClientForm);
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});
  const [termOpen, setTermOpen] = useState(false);
  const [customDays, setCustomDays] = useState("");
  const termRef = useRef<HTMLDivElement>(null);
  const hasHydrated = useRef(false);

  useEffect(() => {
    if (!termOpen) return;
    function onDown(event: MouseEvent) {
      if (termRef.current && !termRef.current.contains(event.target as Node)) setTermOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [termOpen]);

  function applyPaymentTerm(term: number | "fim") {
    const base = /^\d{4}-\d{2}-\d{2}$/.test(dateEmission) ? new Date(`${dateEmission}T00:00:00`) : new Date();
    const due = new Date(base);
    if (term === "fim") due.setMonth(due.getMonth() + 1, 0);
    else due.setDate(due.getDate() + term);
    const iso = `${due.getFullYear()}-${String(due.getMonth() + 1).padStart(2, "0")}-${String(due.getDate()).padStart(2, "0")}`;
    const br = `${String(due.getDate()).padStart(2, "0")}/${String(due.getMonth() + 1).padStart(2, "0")}/${due.getFullYear()}`;
    setConditionsPaiement(term === "fim" ? `Vencimento no fim do mês — em ${br}` : term === 0 ? `Pagamento à vista — em ${br}` : `Vencimento em ${term} dias — em ${br}`);
    if (documentType !== "devis") setDateEcheance(iso);
    setTermOpen(false);
    setCustomDays("");
  }

  function toggleMoyen(method: PaymentMethod) {
    setMoyensPaiement((current) =>
      current.includes(method) ? current.filter((item) => item !== method) : [...current, method]
    );
  }

  const regimeTva = profile?.regime_tva ?? "franchise";
  const totals = useMemo(() => calculateDocumentTotals(lines, regimeTva), [lines, regimeTva]);
  const selectedClient = clients.find((client) => client.id === clientId) ?? null;

  const snapshot = useMemo(
    () =>
      JSON.stringify({
        acompteEnabled,
        acomptePct,
        clientId,
        conditionsPaiement,
        dateEcheance,
        dateEmission,
        datePrestation,
        documentType,
        lines,
        moyensPaiement,
        notesBasPage,
        totals,
        validiteJours
      }),
    [
      acompteEnabled,
      acomptePct,
      clientId,
      conditionsPaiement,
      dateEcheance,
      dateEmission,
      datePrestation,
      documentType,
      lines,
      moyensPaiement,
      notesBasPage,
      totals,
      validiteJours
    ]
  );

  useEffect(() => {
    if (!hasHydrated.current) {
      hasHydrated.current = true;
      return;
    }

    const timeout = window.setTimeout(() => {
      void saveDraft();
    }, 1500);

    return () => window.clearTimeout(timeout);
    // Autosave is intentionally keyed by the serialized editor snapshot.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshot]);

  function updateLine(id: string, patch: Partial<EditorLineWithUnit>) {
    setLines((current) =>
      current.map((line) => (line.id === id ? { ...line, ...patch } : line))
    );
  }

  function addCatalogLine(itemId: string) {
    const item = catalogItems.find((catalogItem) => catalogItem.id === itemId);

    if (!item) {
      return;
    }

    setLines((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        designation: item.designation,
        description: item.description ?? "",
        quantite: 1,
        prix_unitaire_ht: item.prix_unitaire_ht,
        taux_tva: fiscalConfig.legalDocumentValues.defaultVatRate,
        categorie: item.categorie,
        unite: item.unite || DEFAULT_UNIT
      }
    ]);
  }

  function moveLine(index: number, direction: -1 | 1) {
    setLines((current) => {
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= current.length) {
        return current;
      }

      const next = [...current];
      const [line] = next.splice(index, 1);
      next.splice(nextIndex, 0, line);
      return next;
    });
  }

  async function saveDraft() {
    setSaveState("saving");
    const mentionTva = regimeTva === "franchise" ? tvaFranchiseMention : null;
    const documentPayload = {
      user_id: userId,
      client_id: clientId || null,
      type: documentType,
      status: "draft",
      date_emission: toDbDate(dateEmission),
      date_prestation: toDbDate(datePrestation),
      date_echeance: documentType !== "devis" ? toDbDate(dateEcheance) : null,
      validite_jours: documentType === "devis" ? validiteJours : null,
      total_ht: totals.totalHt,
      total_tva: totals.totalTva,
      total_ttc: totals.totalTtc,
      mention_tva: mentionTva,
      conditions_paiement: conditionsPaiement || null,
      notes_bas_page: notesBasPage || null,
      moyens_paiement: moyensPaiement.length > 0 ? moyensPaiement : null,
      acompte_pct: acompteEnabled && Number(acomptePct) > 0 ? Number(acomptePct) : null
    };

    let currentDocumentId = documentId;

    if (!currentDocumentId) {
      const { data, error } = await supabase
        .from("documents")
        .insert(documentPayload)
        .select("id")
        .single();

      if (error || !data) {
        setSaveState("error");
        showToast("Não foi possível salvar o rascunho.", "error");
        return null;
      }

      currentDocumentId = data.id;
      setDocumentId(currentDocumentId);
      router.replace(`/documentos/${currentDocumentId}/editar`);
    } else {
      const { error } = await supabase.from("documents").update(documentPayload).eq("id", currentDocumentId);

      if (error) {
        setSaveState("error");
        showToast("Não foi possível salvar o rascunho.", "error");
        return null;
      }
    }

    const { error: deleteError } = await supabase
      .from("document_lines")
      .delete()
      .eq("document_id", currentDocumentId);

    if (deleteError) {
      setSaveState("error");
      showToast("Não foi possível atualizar as linhas.", "error");
      return null;
    }

    const validLines = lines.filter((line) => line.designation.trim() !== "");
    if (validLines.length > 0) {
      const { error: linesError } = await supabase.from("document_lines").insert(
        validLines.map((line, index) => ({
          document_id: currentDocumentId,
          user_id: userId,
          ordre: index + 1,
          designation: line.designation.trim(),
          description: line.description.trim() || null,
          quantite: line.quantite,
          prix_unitaire_ht: line.prix_unitaire_ht,
          taux_tva: regimeTva === "franchise" ? 0 : line.taux_tva,
          categorie: line.categorie,
          unite: line.unite || DEFAULT_UNIT,
          total_ligne_ht: Number((line.quantite * line.prix_unitaire_ht).toFixed(2))
        }))
      );

      if (linesError) {
        setSaveState("error");
        showToast("Não foi possível salvar as linhas.", "error");
        return null;
      }
    }

    setLastSavedAt(new Date());
    setSaveState("idle");
    return currentDocumentId;
  }

  async function createQuickClient() {
    const parsed = clientSchema.safeParse(clientForm);

    if (!parsed.success) {
      const nextErrors: Record<string, string> = {};
      parsed.error.issues.forEach((issue) => {
        const key = issue.path[0]?.toString() ?? "form";
        nextErrors[key] = issue.message;
      });
      setClientErrors(nextErrors);
      return;
    }

    const { data, error } = await supabase
      .from("clients")
      .insert({ ...parsed.data, user_id: userId })
      .select("*")
      .single();

    if (error || !data) {
      showToast("Não foi possível criar o cliente.", "error");
      return;
    }

    setClients((current) => [data as Client, ...current]);
    setClientId(data.id);
    setClientForm(emptyClientForm);
    setClientErrors({});
    setIsClientModalOpen(false);
    showToast("Cliente criado e selecionado.", "success");
  }

  function openClientModal(type: ClientType) {
    setClientForm({ ...emptyClientForm, type });
    setClientErrors({});
    setIsClientModalOpen(true);
  }

  function startEmit() {
    if (isProfileIncomplete(profile)) {
      setIsProfileBlockOpen(true);
      return;
    }
    if (!clientId) {
      showToast("Selecione um cliente antes de emitir.", "error");
      return;
    }
    if (!lines.some((line) => line.designation.trim() !== "")) {
      showToast("Adicione ao menos uma linha com descrição antes de emitir.", "error");
      return;
    }
    setIsEmitModalOpen(true);
  }

  async function emitDocument() {
    setIsEmitting(true);
    const savedDocumentId = await saveDraft();

    if (!savedDocumentId) {
      setIsEmitting(false);
      return;
    }

    const result = await emitDocumentAction(savedDocumentId);
    setIsEmitting(false);

    if (result.error) {
      showToast(result.error, "error");
      if (!result.documentId) {
        return;
      }
    }

    router.replace(`/documentos/${savedDocumentId}`);
    router.refresh();
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-brand">Editor de documento</p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            {documentType === "avoir" ? (
              <Select className="w-44" disabled value="avoir">
                <option value="avoir">Avoir</option>
              </Select>
            ) : (
              <Select
                className="w-44"
                onChange={(event) => setDocumentType(event.target.value as "devis" | "facture")}
                value={documentType}
              >
                <option value="devis">Devis</option>
                <option value="facture">Facture</option>
              </Select>
            )}
            <Badge tone="warning">Rascunho</Badge>
          </div>
        </div>
        <div className="flex flex-col items-start gap-3 sm:items-end">
          <p className="text-sm text-muted">
            {saveState === "saving"
              ? "Salvando..."
              : saveState === "error"
                ? "Erro ao salvar"
                : lastSavedAt
                  ? `salvo às ${lastSavedAt.toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit"
                    })}`
                  : "Alterações serão salvas automaticamente"}
          </p>
          <Button onClick={startEmit} type="button">
            Emitir
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <section className="rounded-lg border border-line bg-white p-5 shadow-sm">
            <div className="grid gap-4 md:grid-cols-[1fr_auto]">
              <label className="text-sm font-medium text-ink">
                Cliente
                <Select
                  className="mt-2"
                  onChange={(event) => setClientId(event.target.value)}
                  value={clientId}
                >
                  <option value="">Selecionar cliente</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.type === "professionnel" ? client.raison_sociale : client.nom}
                    </option>
                  ))}
                </Select>
              </label>
              <div className="flex flex-wrap items-end gap-2">
                <Button onClick={() => openClientModal("professionnel")} type="button" variant="secondary">
                  Adicionar uma empresa
                </Button>
                <Button onClick={() => openClientModal("particulier")} type="button" variant="secondary">
                  Adicionar um indivíduo privado
                </Button>
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-line bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-ink">Datas</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <label className="text-sm font-medium text-ink">
                Emissão
                <Input
                  className="mt-2"
                  onChange={(event) => setDateEmission(event.target.value)}
                  type="date"
                  value={dateEmission}
                />
              </label>
              <label className="text-sm font-medium text-ink">
                Prestação
                <Input
                  className="mt-2"
                  onChange={(event) => setDatePrestation(event.target.value)}
                  type="date"
                  value={datePrestation}
                />
              </label>
              {documentType !== "devis" ? (
                <label className="text-sm font-medium text-ink">
                  Vencimento
                  <Input
                    className="mt-2"
                    onChange={(event) => setDateEcheance(event.target.value)}
                    type="date"
                    value={dateEcheance}
                  />
                </label>
              ) : (
                <label className="text-sm font-medium text-ink">
                  Validade (dias)
                  <Input
                    className="mt-2"
                    min="0"
                    onChange={(event) => setValiditeJours(Number(event.target.value))}
                    type="number"
                    value={validiteJours}
                  />
                </label>
              )}
            </div>
          </section>

          <section className="rounded-lg border border-line bg-white p-5 shadow-sm">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <h2 className="text-lg font-semibold text-ink">Linhas</h2>
              <div className="flex flex-wrap gap-2">
                <Select
                  className="w-64"
                  onChange={(event) => {
                    addCatalogLine(event.target.value);
                    event.currentTarget.value = "";
                  }}
                  value=""
                >
                  <option value="">Adicionar do catálogo</option>
                  {catalogItems
                    .filter((item) => !item.archived)
                    .map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.designation}
                      </option>
                    ))}
                </Select>
              </div>
            </div>

            <div className="space-y-4">
              {lines.map((line, index) => (
                <div className="rounded-md border border-line p-4" key={line.id}>
                  <div className="grid gap-3 md:grid-cols-[1fr_110px_120px_140px]">
                    <label className="text-sm font-medium text-ink">
                      Designação
                      <Input
                        className="mt-2"
                        onChange={(event) => updateLine(line.id, { designation: event.target.value })}
                        value={line.designation}
                      />
                    </label>
                    <label className="text-sm font-medium text-ink">
                      Quantidade
                      <Input
                        className="mt-2"
                        min="0.001"
                        onChange={(event) =>
                          updateLine(line.id, { quantite: Number(event.target.value) })
                        }
                        step="0.001"
                        type="number"
                        value={line.quantite}
                      />
                    </label>
                    <label className="text-sm font-medium text-ink">
                      Unidade
                      <Select
                        className="mt-2"
                        onChange={(event) => updateLine(line.id, { unite: event.target.value })}
                        value={line.unite || DEFAULT_UNIT}
                      >
                        {lineUnits.map((unit) => (
                          <option key={unit} value={unit}>
                            {unit}
                          </option>
                        ))}
                      </Select>
                    </label>
                    <label className="text-sm font-medium text-ink">
                      Preço HT
                      <Input
                        className="mt-2"
                        min="0"
                        onChange={(event) =>
                          updateLine(line.id, { prix_unitaire_ht: Number(event.target.value) })
                        }
                        step="0.01"
                        type="number"
                        value={line.prix_unitaire_ht}
                      />
                    </label>
                  </div>
                  <div className="mt-3 grid gap-3 md:grid-cols-[1fr_180px_120px]">
                    <label className="text-sm font-medium text-ink">
                      Description
                      <Textarea
                        className="mt-2"
                        onChange={(event) => updateLine(line.id, { description: event.target.value })}
                        value={line.description}
                      />
                    </label>
                    <label className="text-sm font-medium text-ink">
                      Categoria
                      <Select
                        className="mt-2"
                        onChange={(event) =>
                          updateLine(line.id, { categorie: event.target.value as ActivityCategory })
                        }
                        value={line.categorie}
                      >
                        <option value="vente">{categoryLabels.vente}</option>
                        <option value="service_bic">{categoryLabels.service_bic}</option>
                        <option value="service_bnc">{categoryLabels.service_bnc}</option>
                      </Select>
                    </label>
                    {regimeTva === "assujetti" ? (
                      <label className="text-sm font-medium text-ink">
                        TVA %
                        <Input
                          className="mt-2"
                          min="0"
                          onChange={(event) =>
                            updateLine(line.id, { taux_tva: Number(event.target.value) })
                          }
                          step="0.1"
                          type="number"
                          value={line.taux_tva}
                        />
                      </label>
                    ) : (
                      <div className="text-sm text-muted">TVA 0%</div>
                    )}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      disabled={index === 0}
                      onClick={() => moveLine(index, -1)}
                      type="button"
                      variant="secondary"
                    >
                      Subir
                    </Button>
                    <Button
                      disabled={index === lines.length - 1}
                      onClick={() => moveLine(index, 1)}
                      type="button"
                      variant="secondary"
                    >
                      Descer
                    </Button>
                    <Button
                      disabled={lines.length === 1}
                      onClick={() => setLines((current) => current.filter((item) => item.id !== line.id))}
                      type="button"
                      variant="secondary"
                    >
                      Remover
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex justify-end">
              <Button onClick={() => setLines((current) => [...current, newLine()])} type="button">
                Adicionar
              </Button>
            </div>
          </section>

          <section className="rounded-lg border border-line bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-ink">Condições</h2>
            <div className="mt-4 grid gap-4">
              <div className="text-sm font-medium text-ink">
                <div className="flex items-center justify-between gap-2">
                  <span>Condições de pagamento</span>
                  <div className="relative" ref={termRef}>
                    <button
                      aria-expanded={termOpen}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                      onClick={() => setTermOpen((value) => !value)}
                      type="button"
                    >
                      Definir prazo
                      <svg className={`transition-transform ${termOpen ? "rotate-180" : ""}`} fill="none" height="14" stroke="currentColor" strokeLinecap="round" strokeWidth="2" viewBox="0 0 24 24" width="14"><path d="m6 9 6 6 6-6" /></svg>
                    </button>
                    {termOpen ? (
                      <div className="absolute right-0 top-full z-20 mt-1.5 w-56 rounded-xl bg-white p-2 shadow-xl ring-1 ring-black/10">
                        {([["0 dias", 0], ["7 dias", 7], ["14 dias", 14], ["30 dias", 30], ["60 dias", 60], ["90 dias", 90], ["Fim do mês", "fim"]] as const).map(([label, val]) => (
                          <button
                            className="flex w-full items-center rounded-lg px-2.5 py-1.5 text-left text-sm text-slate-700 transition hover:bg-slate-50"
                            key={label}
                            onClick={() => applyPaymentTerm(val)}
                            type="button"
                          >
                            {label}
                          </button>
                        ))}
                        <div className="mt-1 flex items-center gap-1.5 border-t border-line px-1 pt-2">
                          <Input
                            className="h-9"
                            min="0"
                            onChange={(event) => setCustomDays(event.target.value)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter" && customDays) {
                                event.preventDefault();
                                applyPaymentTerm(Number(customDays));
                              }
                            }}
                            placeholder="Adicione um número..."
                            type="number"
                            value={customDays}
                          />
                          <span className="text-xs text-muted">dia</span>
                          <button
                            className="rounded-lg bg-[#1D4ED8] px-2.5 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
                            disabled={!customDays}
                            onClick={() => applyPaymentTerm(Number(customDays))}
                            type="button"
                          >
                            OK
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
                <Input
                  className="mt-2"
                  onChange={(event) => setConditionsPaiement(event.target.value)}
                  value={conditionsPaiement}
                />
              </div>

              {/* Meios de pagamento aceitos */}
              <div className="text-sm font-medium text-ink">
                <span>Meios de pagamento aceitos</span>
                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {PAYMENT_METHOD_OPTIONS.map((method) => {
                    const checked = moyensPaiement.includes(method);
                    return (
                      <label
                        className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm font-normal transition ${
                          checked ? "border-brand bg-brand/5 text-ink" : "border-line text-slate-600 hover:bg-slate-50"
                        }`}
                        key={method}
                      >
                        <input
                          checked={checked}
                          className="h-4 w-4 accent-brand"
                          onChange={() => toggleMoyen(method)}
                          type="checkbox"
                        />
                        {paymentMethodLabels[method]}
                      </label>
                    );
                  })}
                </div>
                <p className="mt-1.5 text-xs font-normal text-muted">Aparecem no rodapé do documento como formas aceitas.</p>
              </div>

              {/* Solicitar depósito (acompte) */}
              <div className="text-sm font-medium text-ink">
                <label className="flex cursor-pointer items-center gap-2.5">
                  <input
                    checked={acompteEnabled}
                    className="h-4 w-4 accent-brand"
                    onChange={(event) => setAcompteEnabled(event.target.checked)}
                    type="checkbox"
                  />
                  Solicitar um depósito (acompte)
                </label>
                {acompteEnabled ? (
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <Input
                        className="h-9 w-24"
                        max="100"
                        min="1"
                        onChange={(event) => setAcomptePct(event.target.value)}
                        type="number"
                        value={acomptePct}
                      />
                      <span className="text-sm font-normal text-slate-600">% do total</span>
                    </div>
                    {Number(acomptePct) > 0 && totals.totalTtc > 0 ? (
                      <span className="text-sm font-normal text-muted">
                        ≈ {euroFmt.format((totals.totalTtc * Number(acomptePct)) / 100)} na encomenda
                      </span>
                    ) : null}
                  </div>
                ) : null}
              </div>

              <label className="text-sm font-medium text-ink">
                Notas de rodapé
                <Textarea
                  className="mt-2"
                  onChange={(event) => setNotesBasPage(event.target.value)}
                  value={notesBasPage}
                />
              </label>
            </div>
          </section>

          <DocumentPreview
            acomptePct={acompteEnabled && Number(acomptePct) > 0 ? Number(acomptePct) : null}
            client={selectedClient}
            conditionsPaiement={conditionsPaiement}
            dateEcheance={dateEcheance}
            moyensPaiement={moyensPaiement}
            dateEmission={dateEmission}
            datePrestation={datePrestation}
            documentType={documentType}
            lines={lines}
            notesBasPage={notesBasPage}
            profile={profile}
            regimeTva={regimeTva}
            validiteJours={validiteJours}
          />
        </div>

        <div className="lg:sticky lg:top-6 lg:self-start">
          <ResteAVivrePanel byCategory={totals.byCategory} profile={profile} />
        </div>
      </div>

      <FormModal
        isOpen={isClientModalOpen}
        onClose={() => setIsClientModalOpen(false)}
        title="Criar cliente"
      >
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            void createQuickClient();
          }}
        >
          <label className="text-sm font-medium text-ink">
            Tipo
            <Select
              className="mt-2"
              onChange={(event) =>
                setClientForm((current) => ({ ...current, type: event.target.value as ClientType }))
              }
              value={clientForm.type}
            >
              <option value="particulier">Indivíduo privado</option>
              <option value="professionnel">Empresa</option>
            </Select>
          </label>
          <label className="text-sm font-medium text-ink">
            Nome
            <Input
              className="mt-2"
              onChange={(event) => setClientForm((current) => ({ ...current, nom: event.target.value }))}
              value={clientForm.nom}
            />
            {clientErrors.nom ? <p className="mt-1 text-sm text-red-600">{clientErrors.nom}</p> : null}
          </label>
          <label className="text-sm font-medium text-ink">
            Razão social
            <Input
              className="mt-2"
              onChange={(event) =>
                setClientForm((current) => ({ ...current, raison_sociale: event.target.value }))
              }
              value={clientForm.raison_sociale}
            />
            {clientErrors.raison_sociale ? (
              <p className="mt-1 text-sm text-red-600">{clientErrors.raison_sociale}</p>
            ) : null}
          </label>
          <label className="text-sm font-medium text-ink">
            SIREN
            <Input
              className="mt-2"
              maxLength={9}
              onChange={(event) =>
                setClientForm((current) => ({ ...current, siren: event.target.value }))
              }
              value={clientForm.siren}
            />
            {clientErrors.siren ? (
              <p className="mt-1 text-sm text-red-600">{clientErrors.siren}</p>
            ) : null}
          </label>
          <label className="text-sm font-medium text-ink">
            Email
            <Input
              className="mt-2"
              onChange={(event) =>
                setClientForm((current) => ({ ...current, email: event.target.value }))
              }
              type="email"
              value={clientForm.email}
            />
            {clientErrors.email ? (
              <p className="mt-1 text-sm text-red-600">{clientErrors.email}</p>
            ) : null}
          </label>
          <div className="flex justify-end gap-2">
            <Button onClick={() => setIsClientModalOpen(false)} type="button" variant="secondary">
              Cancelar
            </Button>
            <Button type="submit">Criar e selecionar</Button>
          </div>
        </form>
      </FormModal>

      <FormModal
        description="Depois da emissão, o documento recebe número sequencial definitivo e não poderá mais ter conteúdo alterado."
        isOpen={isEmitModalOpen}
        onClose={() => setIsEmitModalOpen(false)}
        title="Emitir documento"
      >
        <div className="space-y-4">
          <p className="text-sm leading-6 text-muted">
            Confirme apenas quando todos os dados estiverem corretos. A numeração será gerada pelo banco de dados e o PDF será salvo no bucket privado.
          </p>
          <div className="flex justify-end gap-2">
            <Button onClick={() => setIsEmitModalOpen(false)} type="button" variant="secondary">
              Cancelar
            </Button>
            <Button disabled={isEmitting} onClick={() => void emitDocument()} type="button">
              {isEmitting ? "Emitindo..." : "Confirmar emissão"}
            </Button>
          </div>
        </div>
      </FormModal>

      <FormModal
        isOpen={isProfileBlockOpen}
        onClose={() => setIsProfileBlockOpen(false)}
        title="Perfil incompleto"
      >
        <div className="space-y-5">
          <div className="flex items-start gap-3 rounded-xl bg-[#EAF1FF] p-4 ring-1 ring-[#D7E2FF]">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-[#1D4ED8] ring-1 ring-[#D7E2FF]">
              <svg fill="none" height="18" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24" width="18">
                <path d="M3 21h18" /><path d="M5 21V7l8-4v18" /><path d="M19 21V11l-6-4" />
              </svg>
            </span>
            <p className="text-sm leading-6 text-slate-700">
              Complete as informações da sua empresa antes de emitir uma fatura.
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button onClick={() => setIsProfileBlockOpen(false)} type="button" variant="secondary">
              Fechar
            </Button>
            <Link
              className="inline-flex items-center justify-center rounded-xl bg-[#1D4ED8] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1743B8]"
              href="/configuracoes/empresa"
            >
              Completar perfil
            </Link>
          </div>
        </div>
      </FormModal>
    </main>
  );
}
