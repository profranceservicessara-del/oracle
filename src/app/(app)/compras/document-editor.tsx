"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { FormModal } from "@/components/ui/form-modal";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";
import { PaymentsSection } from "./payments-section";
import { purchaseDocumentSchema } from "./validation";
import {
  DOC_TYPE_META,
  VAT_METHOD_LABELS,
  computeLine,
  isEffective,
  type AccountingCode,
  type PurchaseDocStatus,
  type PurchaseDocType,
  type PurchaseDocument,
  type PurchaseDocumentLine,
  type PurchaseVatMethod,
  type SupplierOption
} from "./types";

const euro = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "EUR" });

const inputCls =
  "h-11 w-full rounded-2xl border border-line bg-white px-3 text-base text-ink outline-none transition placeholder:text-slate-400 focus:border-brand focus:ring-2 focus:ring-[#bcd0ee] disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500";

type HeaderForm = {
  third_id: string;
  external_number: string;
  document_date: string;
  due_date: string;
  currency: string;
  vat_method: PurchaseVatMethod;
  amounts_include_tax: boolean;
  send_to_accounting: boolean;
  with_delivery: boolean;
  notes: string;
};

type LineForm = {
  reference: string;
  description: string;
  accounting_code_id: string;
  quantity: string;
  amount_excl_tax: string;
  amount_incl_tax: string;
  vat_rate: string;
};

const emptyHeader = (): HeaderForm => ({
  third_id: "",
  external_number: "",
  document_date: new Date().toISOString().slice(0, 10),
  due_date: "",
  currency: "EUR",
  vat_method: "debit",
  amounts_include_tax: false,
  send_to_accounting: false,
  with_delivery: false,
  notes: ""
});

const emptyLine = (): LineForm => ({
  reference: "",
  description: "",
  accounting_code_id: "",
  quantity: "1",
  amount_excl_tax: "",
  amount_incl_tax: "",
  vat_rate: "0"
});

export function DocumentEditor({
  isOpen,
  editingId,
  type,
  suppliers,
  accountingCodes,
  userId,
  onClose,
  onSaved
}: {
  isOpen: boolean;
  editingId: string | null;
  type: PurchaseDocType;
  suppliers: SupplierOption[];
  accountingCodes: AccountingCode[];
  userId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const { showToast } = useToast();
  const meta = DOC_TYPE_META[type];

  const [currentId, setCurrentId] = useState<string | null>(null);
  const [status, setStatus] = useState<PurchaseDocStatus>("draft");
  const [internalNumber, setInternalNumber] = useState<string | null>(null);
  const [header, setHeader] = useState<HeaderForm>(emptyHeader);
  const [lines, setLines] = useState<LineForm[]>([emptyLine()]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const readOnly = isEffective(status) || status === "cancelled";

  const mapDocToHeader = useCallback((doc: PurchaseDocument): HeaderForm => ({
    third_id: doc.third_id ?? "",
    external_number: doc.external_number ?? "",
    document_date: doc.document_date,
    due_date: doc.due_date ?? "",
    currency: doc.currency ?? "EUR",
    vat_method: doc.vat_method,
    amounts_include_tax: doc.amounts_include_tax,
    send_to_accounting: doc.send_to_accounting,
    with_delivery: doc.with_delivery,
    notes: doc.notes ?? ""
  }), []);

  const load = useCallback(
    async (id: string) => {
      setLoading(true);
      const [docRes, linesRes] = await Promise.all([
        supabase.from("purchase_documents").select("*").eq("id", id).single(),
        supabase.from("purchase_document_lines").select("*").eq("document_id", id).order("position", { ascending: true })
      ]);
      const doc = docRes.data as PurchaseDocument | null;
      if (doc) {
        setStatus(doc.status);
        setInternalNumber(doc.internal_number);
        setHeader(mapDocToHeader(doc));
      }
      const rawLines = (linesRes.data ?? []) as PurchaseDocumentLine[];
      setLines(
        rawLines.length > 0
          ? rawLines.map((l) => ({
              reference: l.reference ?? "",
              description: l.description ?? "",
              accounting_code_id: l.accounting_code_id ?? "",
              quantity: String(l.quantity ?? 1),
              amount_excl_tax: String(l.amount_excl_tax ?? 0),
              amount_incl_tax: String(l.amount_incl_tax ?? 0),
              vat_rate: String(l.vat_rate ?? 0)
            }))
          : [emptyLine()]
      );
      setLoading(false);
    },
    [supabase, mapDocToHeader]
  );

  useEffect(() => {
    if (!isOpen) return;
    setErrors({});
    if (editingId) {
      setCurrentId(editingId);
      void load(editingId);
    } else {
      setCurrentId(null);
      setStatus("draft");
      setInternalNumber(null);
      setHeader(emptyHeader());
      setLines([emptyLine()]);
    }
  }, [isOpen, editingId, load]);

  // Totais ao vivo (o banco é a fonte da verdade; aqui só para exibir).
  const totals = useMemo(() => {
    let excl = 0;
    let incl = 0;
    for (const l of lines) {
      const c = computeLine(
        Number(l.amount_excl_tax) || 0,
        Number(l.amount_incl_tax) || 0,
        Number(l.vat_rate) || 0,
        header.amounts_include_tax
      );
      excl += c.excl;
      incl += c.incl;
    }
    excl = Math.round(excl * 100) / 100;
    incl = Math.round(incl * 100) / 100;
    return { excl, vat: Math.round((incl - excl) * 100) / 100, incl };
  }, [lines, header.amounts_include_tax]);

  function updateLine(index: number, patch: Partial<LineForm>) {
    setLines((current) => current.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  }
  function addLine() {
    setLines((current) => [...current, emptyLine()]);
  }
  function removeLine(index: number) {
    setLines((current) => (current.length <= 1 ? current : current.filter((_, i) => i !== index)));
  }

  // Valida cabeçalho + grava (insert ou update) e regrava linhas. Retorna o id
  // do documento salvo, ou null em caso de erro. internal_number NUNCA é
  // enviado (gerado por trigger).
  async function persist(): Promise<string | null> {
    const parsed = purchaseDocumentSchema.safeParse({
      type,
      third_id: header.third_id ? header.third_id : null,
      external_number: header.external_number,
      document_date: header.document_date,
      due_date: header.due_date,
      currency: header.currency,
      vat_method: header.vat_method,
      amounts_include_tax: header.amounts_include_tax,
      send_to_accounting: header.send_to_accounting,
      with_delivery: header.with_delivery,
      notes: header.notes
    });
    if (!parsed.success) {
      const next: Record<string, string> = {};
      parsed.error.issues.forEach((issue) => {
        next[issue.path[0]?.toString() ?? "form"] = issue.message;
      });
      setErrors(next);
      return null;
    }
    setErrors({});

    const headerPayload = {
      user_id: userId,
      type,
      third_id: parsed.data.third_id,
      external_number: parsed.data.external_number || null,
      document_date: parsed.data.document_date,
      due_date: header.due_date || null,
      currency: parsed.data.currency,
      vat_method: parsed.data.vat_method,
      amounts_include_tax: parsed.data.amounts_include_tax,
      send_to_accounting: parsed.data.send_to_accounting,
      with_delivery: parsed.data.with_delivery,
      notes: parsed.data.notes || null
    };

    let docId = currentId;
    if (docId) {
      const { error } = await supabase.from("purchase_documents").update(headerPayload).eq("id", docId);
      if (error) {
        showToast("Não foi possível salvar o documento.", "error");
        return null;
      }
    } else {
      const { data, error } = await supabase.from("purchase_documents").insert(headerPayload).select("id").single();
      if (error || !data) {
        showToast("Não foi possível criar o documento.", "error");
        return null;
      }
      docId = data.id as string;
      setCurrentId(docId);
    }

    // Regrava as linhas: apaga as antigas e reinsere as atuais na ordem.
    const { error: delError } = await supabase.from("purchase_document_lines").delete().eq("document_id", docId);
    if (delError) {
      showToast("Não foi possível salvar as linhas.", "error");
      return null;
    }
    const linePayloads = lines.map((l, i) => {
      const vat = Number(l.vat_rate) || 0;
      const c = computeLine(Number(l.amount_excl_tax) || 0, Number(l.amount_incl_tax) || 0, vat, header.amounts_include_tax);
      return {
        document_id: docId,
        position: i,
        reference: l.reference || null,
        description: l.description || null,
        accounting_code_id: l.accounting_code_id || null,
        quantity: Number(l.quantity) || 0,
        amount_excl_tax: c.excl,
        amount_incl_tax: c.incl,
        vat_rate: vat
      };
    });
    if (linePayloads.length > 0) {
      const { error: insError } = await supabase.from("purchase_document_lines").insert(linePayloads);
      if (insError) {
        showToast("Não foi possível salvar as linhas.", "error");
        return null;
      }
    }

    return docId;
  }

  async function handleSave() {
    setSaving(true);
    const id = await persist();
    if (id) {
      await load(id);
      showToast(currentId ? "Documento salvo." : "Documento criado.", "success");
      onSaved();
    }
    setSaving(false);
  }

  async function handleValidate() {
    if (!header.third_id) {
      showToast("Selecione um fornecedor para validar.", "error");
      return;
    }
    if (lines.length === 0) {
      showToast("Adicione ao menos uma linha para validar.", "error");
      return;
    }
    setSaving(true);
    const id = await persist();
    if (!id) {
      setSaving(false);
      return;
    }
    const { error } = await supabase.from("purchase_documents").update({ status: "validated" }).eq("id", id);
    if (error) {
      setSaving(false);
      showToast("Não foi possível validar o documento.", "error");
      return;
    }
    await load(id);
    showToast("Documento validado.", "success");
    onSaved();
    setSaving(false);
  }

  async function handleCancelDocument() {
    if (!currentId) {
      onClose();
      return;
    }
    if (!window.confirm("Cancelar este documento? Essa ação não pode ser desfeita.")) return;
    setSaving(true);
    const { error } = await supabase.from("purchase_documents").update({ status: "cancelled" }).eq("id", currentId);
    setSaving(false);
    if (error) {
      showToast("Não foi possível cancelar o documento.", "error");
      return;
    }
    await load(currentId);
    showToast("Documento cancelado.", "success");
    onSaved();
  }

  const canValidate = !currentId ? true : status === "draft" || status === "to_verify";
  const showValidate = status === "draft" || status === "to_verify" || !currentId;

  return (
    <FormModal
      description={`Documento de compra do tipo ${meta.singular.toLowerCase()}.`}
      isOpen={isOpen}
      onClose={onClose}
      title={currentId ? `${meta.singular} ${internalNumber ?? ""}`.trim() : `Novo ${meta.singular.toLowerCase()}`}
    >
      {loading ? (
        <p className="text-sm text-muted">Carregando documento...</p>
      ) : (
        <div className="grid gap-5">
          {readOnly ? (
            <div className="rounded-2xl bg-sky-50 px-4 py-3 text-sm text-sky-800 ring-1 ring-inset ring-sky-200">
              {status === "cancelled"
                ? "Documento cancelado. Cabeçalho e linhas não podem ser alterados."
                : "Documento validado. Cabeçalho e linhas ficam bloqueados; só os pagamentos podem mudar."}
            </div>
          ) : null}

          {/* Cabeçalho */}
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium text-ink sm:col-span-2">
              Fornecedor
              <Select
                className="mt-2"
                disabled={readOnly}
                onChange={(e) => setHeader({ ...header, third_id: e.target.value })}
                value={header.third_id}
              >
                <option value="">Selecione um fornecedor</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
              {errors.third_id ? <span className="text-xs text-red-600">{errors.third_id}</span> : null}
            </label>
            <label className="text-sm font-medium text-ink">
              Número externo (opcional)
              <Input className="mt-2" disabled={readOnly} onChange={(e) => setHeader({ ...header, external_number: e.target.value })} value={header.external_number} />
            </label>
            <label className="text-sm font-medium text-ink">
              Moeda
              <Input className="mt-2" disabled={readOnly} onChange={(e) => setHeader({ ...header, currency: e.target.value })} value={header.currency} />
            </label>
            <label className="text-sm font-medium text-ink">
              Data do documento
              <Input className="mt-2" disabled={readOnly} onChange={(e) => setHeader({ ...header, document_date: e.target.value })} type="date" value={header.document_date} />
              {errors.document_date ? <span className="text-xs text-red-600">{errors.document_date}</span> : null}
            </label>
            <label className="text-sm font-medium text-ink">
              Vencimento (opcional)
              <Input className="mt-2" disabled={readOnly} onChange={(e) => setHeader({ ...header, due_date: e.target.value })} type="date" value={header.due_date} />
            </label>
            <label className="text-sm font-medium text-ink">
              Método de IVA
              <Select className="mt-2" disabled={readOnly} onChange={(e) => setHeader({ ...header, vat_method: e.target.value as PurchaseVatMethod })} value={header.vat_method}>
                {(Object.keys(VAT_METHOD_LABELS) as PurchaseVatMethod[]).map((m) => (
                  <option key={m} value={m}>
                    {VAT_METHOD_LABELS[m]}
                  </option>
                ))}
              </Select>
            </label>
            <div className="flex flex-col justify-center gap-2 text-sm text-ink">
              <label className="flex items-center gap-2">
                <input checked={header.amounts_include_tax} disabled={readOnly} onChange={(e) => setHeader({ ...header, amounts_include_tax: e.target.checked })} type="checkbox" />
                Valores incluem IVA
              </label>
              <label className="flex items-center gap-2">
                <input checked={header.send_to_accounting} disabled={readOnly} onChange={(e) => setHeader({ ...header, send_to_accounting: e.target.checked })} type="checkbox" />
                Enviar para a contabilidade
              </label>
              <label className="flex items-center gap-2">
                <input checked={header.with_delivery} disabled={readOnly} onChange={(e) => setHeader({ ...header, with_delivery: e.target.checked })} type="checkbox" />
                Com entrega
              </label>
            </div>
            <label className="text-sm font-medium text-ink sm:col-span-2">
              Observações (opcional)
              <textarea
                className={`${inputCls} mt-2 h-auto min-h-[80px] py-2`}
                disabled={readOnly}
                onChange={(e) => setHeader({ ...header, notes: e.target.value })}
                value={header.notes}
              />
            </label>
          </div>

          {/* Linhas */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-ink">Linhas</h3>
              {!readOnly ? (
                <Button onClick={addLine} type="button" variant="secondary">
                  + Adicionar linha
                </Button>
              ) : null}
            </div>
            <div className="space-y-3">
              {lines.map((line, index) => {
                const vat = Number(line.vat_rate) || 0;
                const computed = computeLine(Number(line.amount_excl_tax) || 0, Number(line.amount_incl_tax) || 0, vat, header.amounts_include_tax);
                const editableValue = header.amounts_include_tax ? line.amount_incl_tax : line.amount_excl_tax;
                const otherLabel = header.amounts_include_tax ? "HT calculado" : "TTC calculado";
                const otherValue = header.amounts_include_tax ? computed.excl : computed.incl;
                return (
                  <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-inset ring-slate-200" key={index}>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <label className="text-xs font-medium text-slate-500">
                        Referência
                        <Input className="mt-1" disabled={readOnly} onChange={(e) => updateLine(index, { reference: e.target.value })} value={line.reference} />
                      </label>
                      <label className="text-xs font-medium text-slate-500">
                        Descrição
                        <Input className="mt-1" disabled={readOnly} onChange={(e) => updateLine(index, { description: e.target.value })} value={line.description} />
                      </label>
                      <label className="text-xs font-medium text-slate-500 sm:col-span-2">
                        Código contábil
                        <Select className="mt-1" disabled={readOnly} onChange={(e) => updateLine(index, { accounting_code_id: e.target.value })} value={line.accounting_code_id}>
                          <option value="">Sem código</option>
                          {accountingCodes.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.code} — {c.label}
                            </option>
                          ))}
                        </Select>
                      </label>
                      <div className="grid grid-cols-3 gap-2 sm:col-span-2">
                        <label className="text-xs font-medium text-slate-500">
                          Quantidade
                          <Input className="mt-1" disabled={readOnly} min="0" onChange={(e) => updateLine(index, { quantity: e.target.value })} step="0.0001" type="number" value={line.quantity} />
                        </label>
                        <label className="text-xs font-medium text-slate-500">
                          {header.amounts_include_tax ? "Valor TTC" : "Valor HT"}
                          <Input
                            className="mt-1"
                            disabled={readOnly}
                            onChange={(e) =>
                              updateLine(index, header.amounts_include_tax ? { amount_incl_tax: e.target.value } : { amount_excl_tax: e.target.value })
                            }
                            step="0.01"
                            type="number"
                            value={editableValue}
                          />
                        </label>
                        <label className="text-xs font-medium text-slate-500">
                          IVA %
                          <Input className="mt-1" disabled={readOnly} max="100" min="0" onChange={(e) => updateLine(index, { vat_rate: e.target.value })} step="0.01" type="number" value={line.vat_rate} />
                        </label>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-xs tabular-nums text-slate-500">
                        {otherLabel}: <span className="font-semibold text-ink">{euro.format(otherValue)}</span>
                      </span>
                      {!readOnly && lines.length > 1 ? (
                        <button className="rounded-lg px-2 py-1 text-xs font-semibold text-rose-600 ring-1 ring-inset ring-rose-200 transition hover:bg-rose-50" onClick={() => removeLine(index)} type="button">
                          Remover
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Totais ao vivo */}
          <div className="flex flex-wrap justify-end gap-6 rounded-2xl bg-white p-4 text-sm shadow-sm ring-1 ring-black/5">
            <div className="text-right">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Total HT</p>
              <p className="mt-0.5 font-semibold tabular-nums text-ink">{euro.format(totals.excl)}</p>
            </div>
            <div className="text-right">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Total IVA</p>
              <p className="mt-0.5 font-semibold tabular-nums text-ink">{euro.format(totals.vat)}</p>
            </div>
            <div className="text-right">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Total TTC</p>
              <p className="mt-0.5 font-semibold tabular-nums text-ink">{euro.format(totals.incl)}</p>
            </div>
          </div>

          {/* Pagamentos (só quando efetivado; o componente se auto-bloqueia) */}
          {currentId ? (
            <div>
              <h3 className="mb-2 text-sm font-semibold text-ink">Pagamentos</h3>
              <PaymentsSection
                documentId={currentId}
                onChanged={() => {
                  void load(currentId);
                  onSaved();
                }}
                status={status}
                totalInclTax={totals.incl}
                userId={userId}
              />
            </div>
          ) : null}

          {/* Ações */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-4">
            <div>
              {currentId && status !== "cancelled" ? (
                <Button disabled={saving} onClick={() => void handleCancelDocument()} type="button" variant="secondary">
                  Cancelar documento
                </Button>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={onClose} type="button" variant="secondary">
                Fechar
              </Button>
              {!readOnly ? (
                <Button disabled={saving} onClick={() => void handleSave()} type="button" variant="secondary">
                  {saving ? "Salvando..." : "Salvar"}
                </Button>
              ) : null}
              {showValidate && canValidate && !readOnly ? (
                <Button disabled={saving} onClick={() => void handleValidate()} type="button">
                  {saving ? "Processando..." : "Validar"}
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </FormModal>
  );
}
