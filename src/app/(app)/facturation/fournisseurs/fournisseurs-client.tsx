"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BillingNav } from "@/components/app/billing-nav";
import { Button } from "@/components/ui/button";
import { FormModal } from "@/components/ui/form-modal";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";
import type { Purchase, SupplierInvoice, SupplierInvoiceStatus } from "@/lib/types";
import { validateUpload } from "@/lib/upload-validation";
import { supplierInvoiceSchema } from "@/lib/validation";

const INVOICE_BUCKET = "supplier-invoices";

const euro = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "EUR" });
const methodLabels: Record<string, string> = {
  virement: "Transferência",
  cheque: "Cheque",
  especes: "Dinheiro",
  cb: "Cartão",
  stripe: "Stripe",
  autre: "Outro"
};

type PeriodKey = "tout" | "annee" | "mois";

function periodBounds(key: PeriodKey): { start: string; end: string } | null {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  if (key === "annee") return { start: `${y}-01-01`, end: `${y}-12-31` };
  if (key === "mois") return { start: iso(new Date(y, m, 1)), end: iso(new Date(y, m + 1, 0)) };
  return null;
}

export function FournisseursClient({
  initialPurchases,
  initialInvoices = [],
  userId
}: {
  initialPurchases: Purchase[];
  initialInvoices?: SupplierInvoice[];
  userId: string;
}) {
  // V2: se houver faturas dedicadas, usa a visão rica com CRUD.
  // Senão, fallback pro modo V1 derivado de purchases (com atalho p/ criar
  // a primeira fatura).
  return initialInvoices.length > 0 ? (
    <InvoicesView invoices={initialInvoices} purchases={initialPurchases} userId={userId} />
  ) : (
    <PurchasesView initialPurchases={initialPurchases} userId={userId} />
  );
}

// ---- Formulário compartilhado (create/edit) ------------------------------
type InvoiceForm = {
  fournisseur: string;
  reference: string;
  designation: string;
  date_reception: string;
  date_echeance: string;
  montant_ttc: string;
  montant_tva: string;
  status: SupplierInvoiceStatus;
  purchase_id: string;
};

const emptyInvoiceForm: InvoiceForm = {
  fournisseur: "",
  reference: "",
  designation: "",
  date_reception: new Date().toISOString().slice(0, 10),
  date_echeance: "",
  montant_ttc: "",
  montant_tva: "",
  status: "a_payer",
  purchase_id: ""
};

function invoiceToForm(inv: SupplierInvoice): InvoiceForm {
  return {
    fournisseur: inv.fournisseur,
    reference: inv.reference ?? "",
    designation: inv.designation ?? "",
    date_reception: inv.date_reception,
    date_echeance: inv.date_echeance ?? "",
    montant_ttc: String(inv.montant_ttc),
    montant_tva: inv.montant_tva == null ? "" : String(inv.montant_tva),
    status: inv.status,
    purchase_id: inv.purchase_id ?? ""
  };
}

function purchaseLabel(p: Purchase): string {
  const val = euro.format(Number(p.montant) || 0);
  return `${p.date_achat} · ${p.fournisseur} · ${val}`;
}

function InvoiceFormModal({
  isOpen,
  editing,
  userId,
  purchases,
  onClose,
  onSaved
}: {
  isOpen: boolean;
  editing: SupplierInvoice | null;
  userId: string;
  purchases: Purchase[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const { showToast } = useToast();
  const [form, setForm] = useState<InvoiceForm>(emptyInvoiceForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    if (isOpen) {
      setForm(editing ? invoiceToForm(editing) : emptyInvoiceForm);
      setErrors({});
      setFile(null);
    }
  }, [isOpen, editing]);

  async function save() {
    const parsed = supplierInvoiceSchema.safeParse(form);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      parsed.error.issues.forEach((issue) => {
        next[issue.path[0]?.toString() ?? "form"] = issue.message;
      });
      setErrors(next);
      return;
    }

    setSaving(true);

    // Upload opcional do anexo (bucket privado, pasta = userId p/ RLS).
    let uploadedPath: string | null = null;
    if (file) {
      const fileError = validateUpload(file, "document");
      if (fileError) {
        setSaving(false);
        showToast(fileError, "error");
        return;
      }
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${userId}/${crypto.randomUUID()}-${safe}`;
      const { error: uploadError } = await supabase.storage
        .from(INVOICE_BUCKET)
        .upload(path, file, { contentType: file.type || undefined, upsert: false });
      if (uploadError) {
        setSaving(false);
        showToast("Não foi possível enviar o anexo.", "error");
        return;
      }
      uploadedPath = path;
    }

    // Payload só com colunas reais de supplier_invoices (+ user_id p/ RLS).
    // fichier_path só entra quando há novo anexo (edição sem novo arquivo
    // preserva o anexo atual).
    const payload = {
      ...parsed.data,
      user_id: userId,
      purchase_id: form.purchase_id || null,
      ...(uploadedPath ? { fichier_path: uploadedPath } : {})
    };
    const request = editing
      ? supabase.from("supplier_invoices").update(payload).eq("id", editing.id)
      : supabase.from("supplier_invoices").insert(payload);
    const { error } = await request;

    if (error) {
      if (uploadedPath) await supabase.storage.from(INVOICE_BUCKET).remove([uploadedPath]);
      setSaving(false);
      showToast("Não foi possível salvar a fatura.", "error");
      return;
    }

    // Anexo substituído: remove o antigo após sucesso.
    if (uploadedPath && editing?.fichier_path && editing.fichier_path !== uploadedPath) {
      await supabase.storage.from(INVOICE_BUCKET).remove([editing.fichier_path]);
    }

    setSaving(false);
    showToast(editing ? "Fatura atualizada." : "Fatura criada.", "success");
    onClose();
    onSaved();
  }

  return (
    <FormModal
      description="Dados da fatura de fornecedor."
      isOpen={isOpen}
      onClose={onClose}
      title={editing ? "Editar fatura" : "Nova fatura recebida"}
    >
      <form
        className="grid gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
      >
        <label className="text-sm font-medium text-ink">
          Fornecedor
          <Input className="mt-2" onChange={(e) => setForm({ ...form, fournisseur: e.target.value })} value={form.fournisseur} />
          {errors.fournisseur ? <span className="text-xs text-red-600">{errors.fournisseur}</span> : null}
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium text-ink">
            Data de recepção
            <Input className="mt-2" onChange={(e) => setForm({ ...form, date_reception: e.target.value })} type="date" value={form.date_reception} />
            {errors.date_reception ? <span className="text-xs text-red-600">{errors.date_reception}</span> : null}
          </label>
          <label className="text-sm font-medium text-ink">
            Vencimento (opcional)
            <Input className="mt-2" onChange={(e) => setForm({ ...form, date_echeance: e.target.value })} type="date" value={form.date_echeance} />
          </label>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium text-ink">
            Montante TTC
            <Input className="mt-2" min="0" onChange={(e) => setForm({ ...form, montant_ttc: e.target.value })} step="0.01" type="number" value={form.montant_ttc} />
            {errors.montant_ttc ? <span className="text-xs text-red-600">{errors.montant_ttc}</span> : null}
          </label>
          <label className="text-sm font-medium text-ink">
            TVA (opcional)
            <Input className="mt-2" min="0" onChange={(e) => setForm({ ...form, montant_tva: e.target.value })} step="0.01" type="number" value={form.montant_tva} />
            {errors.montant_tva ? <span className="text-xs text-red-600">{errors.montant_tva}</span> : null}
          </label>
        </div>
        <label className="text-sm font-medium text-ink">
          Referência (opcional)
          <Input className="mt-2" onChange={(e) => setForm({ ...form, reference: e.target.value })} value={form.reference} />
        </label>
        <label className="text-sm font-medium text-ink">
          Descrição (opcional)
          <Input className="mt-2" onChange={(e) => setForm({ ...form, designation: e.target.value })} value={form.designation} />
        </label>
        <label className="text-sm font-medium text-ink">
          Status
          <Select className="mt-2" onChange={(e) => setForm({ ...form, status: e.target.value as SupplierInvoiceStatus })} value={form.status}>
            <option value="a_payer">A pagar</option>
            <option value="payee">Paga</option>
            <option value="a_verifier">A verificar</option>
          </Select>
        </label>
        <label className="text-sm font-medium text-ink">
          Vincular a uma despesa (opcional)
          <Select className="mt-2" onChange={(e) => setForm({ ...form, purchase_id: e.target.value })} value={form.purchase_id}>
            <option value="">Sem despesa vinculada</option>
            {purchases.map((p) => (
              <option key={p.id} value={p.id}>
                {purchaseLabel(p)}
              </option>
            ))}
          </Select>
          <span className="mt-1 block text-xs text-muted">Vincular a uma despesa já lançada não cria nova saída no caixa (evita duplicidade).</span>
        </label>
        <label className="text-sm font-medium text-ink">
          Anexo (PDF ou imagem, opcional)
          <input
            accept="application/pdf,image/png,image/jpeg,image/webp"
            className="mt-2 block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-slate-700 hover:file:bg-slate-200"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            type="file"
          />
          {editing?.fichier_path && !file ? (
            <span className="mt-1 block text-xs text-muted">Já existe um anexo. Enviar um novo substitui o atual.</span>
          ) : null}
        </label>
        <div className="flex justify-end gap-2">
          <Button onClick={onClose} type="button" variant="secondary">
            Cancelar
          </Button>
          <Button disabled={saving} type="submit">
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </form>
    </FormModal>
  );
}

// ---- V1: visão derivada de purchases (fallback quando não há faturas) -----
function PurchasesView({ initialPurchases, userId }: { initialPurchases: Purchase[]; userId: string }) {
  const router = useRouter();
  const [period, setPeriod] = useState<PeriodKey>("annee");
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);

  const bounds = useMemo(() => periodBounds(period), [period]);

  const rows = useMemo(
    () =>
      bounds
        ? initialPurchases.filter((p) => p.date_achat >= bounds.start && p.date_achat <= bounds.end)
        : initialPurchases,
    [initialPurchases, bounds]
  );

  const total = rows.reduce((s, p) => s + (Number(p.montant) || 0), 0);
  const fournisseurs = new Set(rows.map((p) => (p.fournisseur || "").trim().toLowerCase()).filter(Boolean)).size;
  const now = new Date();
  const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const thisMonth = initialPurchases
    .filter((p) => p.date_achat?.slice(0, 7) === monthPrefix)
    .reduce((s, p) => s + (Number(p.montant) || 0), 0);

  function exportCsv() {
    const header = ["Data", "Fornecedor", "Descrição", "Referência", "Método", "Valor"];
    const body = rows.map((p) => [
      p.date_achat,
      (p.fournisseur || "").replace(/"/g, "'"),
      (p.designation || "").replace(/"/g, "'"),
      p.reference_piece || "",
      methodLabels[p.moyen ?? ""] ?? p.moyen ?? "",
      (Number(p.montant) || 0).toFixed(2)
    ]);
    const csv = [header, ...body].map((line) => line.map((c) => `"${c}"`).join(";")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `faturas-recebidas-${period}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const kpis = [
    { label: "Total de faturas", value: String(rows.length), tone: "text-ink" },
    { label: "Montante total", value: euro.format(total), tone: "text-rose-600" },
    { label: "Pago este mês", value: euro.format(thisMonth), tone: "text-ink" },
    { label: "Fornecedores", value: String(fournisseurs), tone: "text-ink" }
  ];

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-col gap-6 lg:flex-row">
        <BillingNav active="fournisseurs" />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold text-ink">Faturas recebidas</h1>
              <p className="mt-1 text-sm text-muted">Acompanhe as faturas de fornecedores e as despesas registradas.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Select aria-label="Período" className="w-40" onChange={(e) => setPeriod(e.target.value as PeriodKey)} value={period}>
                <option value="annee">Este ano</option>
                <option value="mois">Este mês</option>
                <option value="tout">Tudo</option>
              </Select>
              <Button disabled={rows.length === 0} onClick={exportCsv} type="button" variant="secondary">
                Exportar CSV
              </Button>
              <Button onClick={() => setInvoiceModalOpen(true)} type="button">
                + Nova fatura
              </Button>
            </div>
          </div>

          {/* KPIs */}
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {kpis.map((k) => (
              <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5" key={k.label}>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{k.label}</p>
                <p className={`mt-1 text-lg font-semibold tabular-nums ${k.tone}`}>{k.value}</p>
              </div>
            ))}
          </div>

          {/* Tabela / empty */}
          {rows.length === 0 ? (
            <div className="mt-6 flex flex-col items-center rounded-2xl bg-white px-6 py-14 text-center shadow-sm ring-1 ring-black/5">
              <p className="text-lg font-semibold text-ink">Nenhuma fatura recebida neste período.</p>
              <p className="mt-2 max-w-md text-sm text-muted">
                Cadastre a fatura de um fornecedor para acompanhar status e vencimentos aqui.
              </p>
              <Button className="mt-6" onClick={() => setInvoiceModalOpen(true)} type="button">
                Registrar primeira fatura
              </Button>
            </div>
          ) : (
            <section className="mt-6 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
              <div className="flex items-center justify-between gap-3 border-b border-line bg-slate-50 px-5 py-3">
                <h2 className="text-sm font-semibold text-ink">Despesas registradas</h2>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold tabular-nums text-slate-600">{rows.length}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-line text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      <th className="px-5 py-2.5">Data</th>
                      <th className="px-5 py-2.5">Fornecedor</th>
                      <th className="px-5 py-2.5">Descrição</th>
                      <th className="px-5 py-2.5">Referência</th>
                      <th className="px-5 py-2.5">Método</th>
                      <th className="px-5 py-2.5">Status</th>
                      <th className="px-5 py-2.5 text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((p) => (
                      <tr className="border-b border-line last:border-b-0" key={p.id}>
                        <td className="px-5 py-2.5 tabular-nums text-slate-600">{p.date_achat}</td>
                        <td className="px-5 py-2.5 font-medium text-ink">{p.fournisseur || "—"}</td>
                        <td className="px-5 py-2.5 text-slate-600">{p.designation || "—"}</td>
                        <td className="px-5 py-2.5 text-slate-500">{p.reference_piece || "—"}</td>
                        <td className="px-5 py-2.5 text-slate-600">{methodLabels[p.moyen ?? ""] ?? p.moyen ?? "—"}</td>
                        <td className="px-5 py-2.5">
                          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200">Paga</span>
                        </td>
                        <td className="px-5 py-2.5 text-right font-medium tabular-nums text-ink">{euro.format(Number(p.montant) || 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          <p className="mt-4 text-xs text-muted">
            As despesas registradas aqui são as mesmas somadas como saídas no <Link className="font-medium text-brand hover:underline" href="/financeiro">fluxo de caixa</Link>.
          </p>
        </div>
      </div>

      <InvoiceFormModal
        editing={null}
        isOpen={invoiceModalOpen}
        onClose={() => setInvoiceModalOpen(false)}
        onSaved={() => router.refresh()}
        purchases={initialPurchases}
        userId={userId}
      />
    </main>
  );
}

// ---- V2: visão de faturas dedicadas (supplier_invoices) + CRUD -----------
type StatusFilter = "toutes" | SupplierInvoiceStatus | "en_retard";

const statusMeta: Record<SupplierInvoiceStatus, { label: string; badge: string }> = {
  a_payer: { label: "A pagar", badge: "bg-amber-50 text-amber-700 ring-amber-200" },
  payee: { label: "Paga", badge: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  a_verifier: { label: "A verificar", badge: "bg-slate-100 text-slate-600 ring-slate-200" }
};
const overdueBadge = "bg-rose-50 text-rose-700 ring-rose-200";

// "Em atraso" NÃO é status persistido: derivado (a_payer && vencimento < hoje).
function isOverdue(inv: SupplierInvoice, today: string): boolean {
  return inv.status === "a_payer" && Boolean(inv.date_echeance && inv.date_echeance < today);
}

function InvoicesView({ invoices, purchases, userId }: { invoices: SupplierInvoice[]; purchases: Purchase[]; userId: string }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const { showToast } = useToast();
  const [filter, setFilter] = useState<StatusFilter>("toutes");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<SupplierInvoice | null>(null);
  const today = new Date().toISOString().slice(0, 10);

  const rows = useMemo(() => {
    if (filter === "toutes") return invoices;
    if (filter === "en_retard") return invoices.filter((i) => isOverdue(i, today));
    return invoices.filter((i) => i.status === filter);
  }, [invoices, filter, today]);

  const aPayer = invoices.filter((i) => i.status === "a_payer").reduce((s, i) => s + (Number(i.montant_ttc) || 0), 0);
  const paye = invoices.filter((i) => i.status === "payee").reduce((s, i) => s + (Number(i.montant_ttc) || 0), 0);
  const enRetard = invoices.filter((i) => isOverdue(i, today)).length;

  const kpis = [
    { label: "Total de faturas", value: String(invoices.length), tone: "text-ink" },
    { label: "Montante a pagar", value: euro.format(aPayer), tone: "text-amber-600" },
    { label: "Montante pago", value: euro.format(paye), tone: "text-emerald-600" },
    { label: "Em atraso", value: String(enRetard), tone: enRetard > 0 ? "text-rose-600" : "text-ink" }
  ];

  const filters: { key: StatusFilter; label: string }[] = [
    { key: "toutes", label: "Todas" },
    { key: "a_payer", label: "A pagar" },
    { key: "payee", label: "Pagas" },
    { key: "a_verifier", label: "A verificar" },
    { key: "en_retard", label: "Em atraso" }
  ];

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }
  function openEdit(inv: SupplierInvoice) {
    setEditing(inv);
    setModalOpen(true);
  }

  async function openAttachment(inv: SupplierInvoice) {
    if (!inv.fichier_path) return;
    const { data, error } = await supabase.storage.from(INVOICE_BUCKET).createSignedUrl(inv.fichier_path, 120);
    if (error || !data) {
      showToast("Não foi possível abrir o anexo.", "error");
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  async function remove(inv: SupplierInvoice) {
    const { error } = await supabase.from("supplier_invoices").delete().eq("id", inv.id);
    if (error) {
      showToast("Não foi possível remover a fatura.", "error");
      return;
    }
    showToast("Fatura removida.", "success", { action: { label: "Desfazer", onClick: () => void restore(inv) } });
    router.refresh();
  }

  // Undo: revalida os campos editáveis contra o schema e reinsere só colunas
  // reais (id/user_id/created_at incluídos p/ restaurar a row idêntica).
  async function restore(inv: SupplierInvoice) {
    const check = supplierInvoiceSchema.safeParse({
      fournisseur: inv.fournisseur,
      reference: inv.reference ?? "",
      designation: inv.designation ?? "",
      date_reception: inv.date_reception,
      date_echeance: inv.date_echeance ?? "",
      montant_ttc: String(inv.montant_ttc),
      montant_tva: inv.montant_tva == null ? "" : String(inv.montant_tva),
      status: inv.status
    });
    if (!check.success) {
      showToast("Não foi possível desfazer.", "error");
      return;
    }
    const payload = {
      id: inv.id,
      user_id: inv.user_id,
      fournisseur: inv.fournisseur,
      reference: inv.reference,
      designation: inv.designation,
      date_reception: inv.date_reception,
      date_echeance: inv.date_echeance,
      montant_ttc: inv.montant_ttc,
      montant_tva: inv.montant_tva,
      status: inv.status,
      purchase_id: inv.purchase_id,
      fichier_path: inv.fichier_path,
      created_at: inv.created_at
    };
    const { error } = await supabase.from("supplier_invoices").insert(payload);
    if (error) {
      showToast("Não foi possível desfazer.", "error");
      return;
    }
    showToast("Fatura restaurada.", "success");
    router.refresh();
  }

  // Marca como paga SEM criar despesa (só status). Fatura sem purchase_id fica
  // "Paga sem despesa vinculada" (visível na lista).
  async function markPaidOnly(inv: SupplierInvoice) {
    if (inv.status === "payee") return;
    const { error } = await supabase.from("supplier_invoices").update({ status: "payee" }).eq("id", inv.id);
    if (error) {
      showToast("Não foi possível atualizar.", "error");
      return;
    }
    showToast("Fatura marcada como paga.", "success");
    router.refresh();
  }

  // Opção A: cria a saída REAL no caixa via `purchases` (fonte única do
  // /financeiro) e vincula (purchase_id). Fatura nunca é somada no caixa → sem
  // double-count. Guard: só cria se ainda não houver vínculo. Se a criação do
  // purchase falhar, NÃO marca como paga (erro explícito).
  async function createExpense(inv: SupplierInvoice, markPaid: boolean) {
    if (inv.purchase_id) {
      showToast("Fatura já tem despesa vinculada.", "success");
      router.refresh();
      return;
    }

    const designation = inv.designation || inv.reference || `Fatura ${inv.fournisseur}`;
    const purchasePayload = {
      user_id: userId,
      date_achat: new Date().toISOString().slice(0, 10),
      fournisseur: inv.fournisseur,
      designation,
      montant: inv.montant_ttc,
      moyen: null as string | null,
      reference_piece: inv.reference
    };
    const { data: created, error: purchaseError } = await supabase
      .from("purchases")
      .insert(purchasePayload)
      .select("id")
      .single();
    if (purchaseError || !created) {
      showToast("Não foi possível criar a despesa. Fatura não alterada.", "error");
      return;
    }

    const update: { purchase_id: string; status?: SupplierInvoiceStatus } = { purchase_id: created.id };
    if (markPaid) update.status = "payee";
    const { error: linkError } = await supabase.from("supplier_invoices").update(update).eq("id", inv.id);
    if (linkError) {
      showToast("Despesa criada, mas o vínculo com a fatura falhou.", "error");
      router.refresh();
      return;
    }
    showToast(markPaid ? "Fatura paga e despesa criada." : "Despesa criada e vinculada.", "success");
    router.refresh();
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-col gap-6 lg:flex-row">
        <BillingNav active="fournisseurs" />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold text-ink">Faturas recebidas</h1>
              <p className="mt-1 text-sm text-muted">Acompanhe as faturas de fornecedores, vencimentos e pagamentos.</p>
            </div>
            <Button onClick={openCreate} type="button">
              + Nova fatura
            </Button>
          </div>

          {/* KPIs */}
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {kpis.map((k) => (
              <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5" key={k.label}>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{k.label}</p>
                <p className={`mt-1 text-lg font-semibold tabular-nums ${k.tone}`}>{k.value}</p>
              </div>
            ))}
          </div>

          {/* Filtros de status */}
          <div className="mt-6 flex flex-wrap gap-2">
            {filters.map((f) => (
              <button
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  filter === f.key ? "bg-brand text-white" : "bg-white text-slate-600 ring-1 ring-inset ring-slate-200 hover:bg-slate-50"
                }`}
                key={f.key}
                onClick={() => setFilter(f.key)}
                type="button"
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Tabela / empty */}
          {rows.length === 0 ? (
            <div className="mt-4 flex flex-col items-center rounded-2xl bg-white px-6 py-14 text-center shadow-sm ring-1 ring-black/5">
              <p className="text-lg font-semibold text-ink">Nenhuma fatura neste filtro.</p>
              <p className="mt-2 max-w-md text-sm text-muted">Ajuste o filtro para ver outras faturas de fornecedores.</p>
            </div>
          ) : (
            <section className="mt-4 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
              <div className="flex items-center justify-between gap-3 border-b border-line bg-slate-50 px-5 py-3">
                <h2 className="text-sm font-semibold text-ink">Faturas de fornecedores</h2>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold tabular-nums text-slate-600">{rows.length}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[860px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-line text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      <th className="px-5 py-2.5">Recepção</th>
                      <th className="px-5 py-2.5">Fornecedor</th>
                      <th className="px-5 py-2.5">Referência</th>
                      <th className="px-5 py-2.5">Vencimento</th>
                      <th className="px-5 py-2.5">Status</th>
                      <th className="px-5 py-2.5 text-right">Montante TTC</th>
                      <th className="px-5 py-2.5 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((inv) => {
                      const overdue = isOverdue(inv, today);
                      const meta = statusMeta[inv.status];
                      return (
                        <tr className="border-b border-line last:border-b-0" key={inv.id}>
                          <td className="px-5 py-2.5 tabular-nums text-slate-600">{inv.date_reception}</td>
                          <td className="px-5 py-2.5 font-medium text-ink">{inv.fournisseur}</td>
                          <td className="px-5 py-2.5 text-slate-500">{inv.reference || inv.designation || "—"}</td>
                          <td className="px-5 py-2.5 tabular-nums text-slate-600">{inv.date_echeance || "—"}</td>
                          <td className="px-5 py-2.5">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${overdue ? overdueBadge : meta.badge}`}>
                                {overdue ? "Em atraso" : meta.label}
                              </span>
                              {inv.purchase_id ? (
                                <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-sky-700 ring-1 ring-inset ring-sky-200">Despesa vinculada</span>
                              ) : inv.status === "payee" ? (
                                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 ring-1 ring-inset ring-amber-200">Paga sem despesa vinculada</span>
                              ) : null}
                            </div>
                          </td>
                          <td className="px-5 py-2.5 text-right font-medium tabular-nums text-ink">{euro.format(Number(inv.montant_ttc) || 0)}</td>
                          <td className="px-5 py-2.5">
                            <div className="flex flex-wrap justify-end gap-1.5">
                              {inv.status !== "payee" ? (
                                <button className="rounded-lg px-2 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200 transition hover:bg-emerald-50" onClick={() => void markPaidOnly(inv)} type="button">
                                  Marcar paga
                                </button>
                              ) : null}
                              {inv.status !== "payee" && !inv.purchase_id ? (
                                <button className="rounded-lg px-2 py-1 text-xs font-semibold text-sky-700 ring-1 ring-inset ring-sky-200 transition hover:bg-sky-50" onClick={() => void createExpense(inv, true)} type="button">
                                  Marcar paga e criar despesa
                                </button>
                              ) : null}
                              {inv.status === "payee" && !inv.purchase_id ? (
                                <button className="rounded-lg px-2 py-1 text-xs font-semibold text-sky-700 ring-1 ring-inset ring-sky-200 transition hover:bg-sky-50" onClick={() => void createExpense(inv, false)} type="button">
                                  Criar despesa
                                </button>
                              ) : null}
                              {inv.fichier_path ? (
                                <button className="rounded-lg px-2 py-1 text-xs font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-200 transition hover:bg-indigo-50" onClick={() => void openAttachment(inv)} type="button">
                                  Anexo
                                </button>
                              ) : null}
                              <button className="rounded-lg px-2 py-1 text-xs font-semibold text-slate-600 ring-1 ring-inset ring-slate-200 transition hover:bg-slate-50" onClick={() => openEdit(inv)} type="button">
                                Editar
                              </button>
                              <button className="rounded-lg px-2 py-1 text-xs font-semibold text-rose-600 ring-1 ring-inset ring-rose-200 transition hover:bg-rose-50" onClick={() => void remove(inv)} type="button">
                                Remover
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          <p className="mt-4 text-xs text-muted">
            &ldquo;Em atraso&rdquo; é calculado (vencimento passado e ainda a pagar), não é um status salvo. &ldquo;Criar despesa&rdquo; lança a saída no <Link className="font-medium text-brand hover:underline" href="/financeiro">fluxo de caixa</Link>; vincular a uma despesa já existente não duplica.
          </p>
        </div>
      </div>

      <InvoiceFormModal
        editing={editing}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={() => router.refresh()}
        purchases={purchases}
        userId={userId}
      />
    </main>
  );
}
