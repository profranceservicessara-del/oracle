"use client";

import { useMemo, useState } from "react";
import { LivresNav } from "@/components/app/livres-nav";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { FormModal } from "@/components/ui/form-modal";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";
import type { Purchase } from "@/lib/types";
import { purchaseSchema } from "@/lib/validation";

type PurchaseForm = {
  date_achat: string;
  fournisseur: string;
  designation: string;
  montant: string;
  moyen: string;
  reference_piece: string;
};

const today = new Date().toISOString().slice(0, 10);
const emptyForm: PurchaseForm = {
  date_achat: today,
  fournisseur: "",
  designation: "",
  montant: "",
  moyen: "",
  reference_piece: ""
};

const euroFormatter = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR"
});

function toForm(purchase: Purchase): PurchaseForm {
  return {
    date_achat: purchase.date_achat,
    fournisseur: purchase.fournisseur,
    designation: purchase.designation,
    montant: String(purchase.montant),
    moyen: purchase.moyen ?? "",
    reference_piece: purchase.reference_piece ?? ""
  };
}

function yearsFromPurchases(purchases: Purchase[]) {
  const years = [...new Set(purchases.map((purchase) => purchase.date_achat.slice(0, 4)))].sort().reverse();
  return years.length > 0 ? years : [String(new Date().getFullYear())];
}

export function RegistreDesAchatsClient({
  initialPurchases,
  userId
}: {
  initialPurchases: Purchase[];
  userId: string;
}) {
  const supabase = useMemo(() => createClient(), []);
  const { showToast } = useToast();
  const [purchases, setPurchases] = useState(initialPurchases);
  const years = useMemo(() => yearsFromPurchases(purchases), [purchases]);
  const [year, setYear] = useState(years[0]);
  const [month, setMonth] = useState("todos");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState<Purchase | null>(null);
  const [form, setForm] = useState<PurchaseForm>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  const filteredPurchases = useMemo(
    () =>
      purchases.filter((purchase) => {
        const matchesYear = purchase.date_achat.slice(0, 4) === year;
        const matchesMonth = month === "todos" || purchase.date_achat.slice(5, 7) === month;
        return matchesYear && matchesMonth;
      }),
    [month, purchases, year]
  );

  async function refreshPurchases() {
    const { data, error } = await supabase
      .from("purchases")
      .select("*")
      .order("date_achat", { ascending: false });

    if (error) {
      showToast("Não foi possível atualizar o registro.", "error");
      return;
    }

    setPurchases((data ?? []) as Purchase[]);
  }

  function openCreate() {
    setEditingPurchase(null);
    setForm(emptyForm);
    setErrors({});
    setIsModalOpen(true);
  }

  function openEdit(purchase: Purchase) {
    setEditingPurchase(purchase);
    setForm(toForm(purchase));
    setErrors({});
    setIsModalOpen(true);
  }

  async function savePurchase() {
    const parsed = purchaseSchema.safeParse(form);

    if (!parsed.success) {
      const nextErrors: Record<string, string> = {};
      parsed.error.issues.forEach((issue) => {
        nextErrors[issue.path[0]?.toString() ?? "form"] = issue.message;
      });
      setErrors(nextErrors);
      return;
    }

    setIsSaving(true);
    const payload = { ...parsed.data, user_id: userId };
    const request = editingPurchase
      ? supabase.from("purchases").update(payload).eq("id", editingPurchase.id)
      : supabase.from("purchases").insert(payload);
    const { error } = await request;
    setIsSaving(false);

    if (error) {
      showToast("Não foi possível salvar a compra.", "error");
      return;
    }

    setIsModalOpen(false);
    showToast(editingPurchase ? "Compra atualizada." : "Compra criada.", "success");
    await refreshPurchases();
  }

  async function deletePurchase(purchase: Purchase) {
    const { error } = await supabase.from("purchases").delete().eq("id", purchase.id);

    if (error) {
      showToast("Não foi possível remover a compra.", "error");
      return;
    }

    showToast("Compra removida.", "success");
    await refreshPurchases();
  }

  const query = `year=${year}&month=${month}`;
  const columns: DataTableColumn<Purchase>[] = [
    { header: "Data", render: (purchase) => purchase.date_achat },
    { header: "Fornecedor", render: (purchase) => purchase.fournisseur },
    { header: "Designação", render: (purchase) => purchase.designation },
    { header: "Montante", render: (purchase) => euroFormatter.format(Number(purchase.montant)) },
    { header: "Meio", render: (purchase) => purchase.moyen || "-" },
    { header: "Referência", render: (purchase) => purchase.reference_piece || "-" },
    {
      header: "Ações",
      render: (purchase) => (
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => openEdit(purchase)} type="button" variant="secondary">
            Editar
          </Button>
          <Button onClick={() => void deletePurchase(purchase)} type="button" variant="secondary">
            Remover
          </Button>
        </div>
      )
    }
  ];

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-brand">Registre des achats</p>
          <h1 className="mt-2 text-2xl font-semibold text-ink">Compras</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            className="inline-flex h-11 items-center justify-center gap-2 rounded bg-white px-4 text-sm font-semibold text-ink shadow-sm ring-1 ring-black/5 transition hover:bg-slate-50 active:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            href={`/api/registre-des-achats/export?format=csv&${query}`}
          >
            Export CSV
          </a>
          <a
            className="inline-flex h-11 items-center justify-center gap-2 rounded bg-white px-4 text-sm font-semibold text-ink shadow-sm ring-1 ring-black/5 transition hover:bg-slate-50 active:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            href={`/api/registre-des-achats/export?format=pdf&${query}`}
          >
            Export PDF
          </a>
          <Button onClick={openCreate} type="button">
            Nova compra
          </Button>
        </div>
      </div>

      <LivresNav active="compras" />

      <section className="mb-4 grid gap-3 rounded-lg border border-line bg-white p-4 sm:grid-cols-2">
        <label className="text-sm font-medium text-ink">
          Ano
          <Select className="mt-2" onChange={(event) => setYear(event.target.value)} value={year}>
            {years.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </Select>
        </label>
        <label className="text-sm font-medium text-ink">
          Mês
          <Select className="mt-2" onChange={(event) => setMonth(event.target.value)} value={month}>
            <option value="todos">Todos</option>
            {Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, "0")).map(
              (item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              )
            )}
          </Select>
        </label>
      </section>

      <DataTable
        columns={columns}
        emptyMessage="Nenhuma compra encontrada."
        getRowKey={(purchase) => purchase.id}
        rows={filteredPurchases}
      />

      <FormModal
        description="Dados usados no registre des achats."
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingPurchase ? "Editar compra" : "Nova compra"}
      >
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            void savePurchase();
          }}
        >
          <label className="text-sm font-medium text-ink">
            Data
            <Input className="mt-2" onChange={(event) => setForm({ ...form, date_achat: event.target.value })} type="date" value={form.date_achat} />
            {errors.date_achat ? <span className="text-xs text-red-600">{errors.date_achat}</span> : null}
          </label>
          <label className="text-sm font-medium text-ink">
            Fornecedor
            <Input className="mt-2" onChange={(event) => setForm({ ...form, fournisseur: event.target.value })} value={form.fournisseur} />
            {errors.fournisseur ? <span className="text-xs text-red-600">{errors.fournisseur}</span> : null}
          </label>
          <label className="text-sm font-medium text-ink">
            Designação
            <Input className="mt-2" onChange={(event) => setForm({ ...form, designation: event.target.value })} value={form.designation} />
            {errors.designation ? <span className="text-xs text-red-600">{errors.designation}</span> : null}
          </label>
          <label className="text-sm font-medium text-ink">
            Montante
            <Input className="mt-2" min="0" onChange={(event) => setForm({ ...form, montant: event.target.value })} step="0.01" type="number" value={form.montant} />
            {errors.montant ? <span className="text-xs text-red-600">{errors.montant}</span> : null}
          </label>
          <label className="text-sm font-medium text-ink">
            Meio
            <Input className="mt-2" onChange={(event) => setForm({ ...form, moyen: event.target.value })} value={form.moyen} />
          </label>
          <label className="text-sm font-medium text-ink">
            Referência da peça
            <Input className="mt-2" onChange={(event) => setForm({ ...form, reference_piece: event.target.value })} value={form.reference_piece} />
          </label>
          <div className="flex justify-end gap-2">
            <Button onClick={() => setIsModalOpen(false)} type="button" variant="secondary">
              Cancelar
            </Button>
            <Button disabled={isSaving} type="submit">
              {isSaving ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </FormModal>
    </main>
  );
}
