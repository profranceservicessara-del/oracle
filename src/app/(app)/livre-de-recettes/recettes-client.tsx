"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { FormModal } from "@/components/ui/form-modal";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import {
  categoryLabel,
  periodOptions,
  type RevenueBookRow
} from "@/lib/accounting";
import { createClient } from "@/lib/supabase/client";
import { paymentMethodLabels, type ActivityCategory, type ManualReceipt, type PaymentMethod, type Profile } from "@/lib/types";
import { manualReceiptSchema } from "@/lib/validation";

const euroFormatter = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });

// Linha unificada do livro: derivada de fatura OU manual.
type BookRow = {
  id: string;
  date: string;
  numero: string;
  clientName: string;
  category: ActivityCategory;
  montant: number;
  moyen: string;
  manualId: string | null;
};

type ReceiptForm = {
  client_name: string;
  reference: string;
  date_encaissement: string;
  categorie: ActivityCategory;
  moyen: PaymentMethod;
  montant: string;
};

const TABS = [
  { label: "Livro de receitas", href: "/livre-de-recettes", active: true },
  { label: "Livro de compras", href: "/registre-des-achats", active: false },
  { label: "Resultados", href: "/analise", active: false }
];

function availableYears(rows: BookRow[]) {
  const years = [...new Set(rows.map((row) => row.date.slice(0, 4)))].sort().reverse();
  return years.length > 0 ? years : [String(new Date().getFullYear())];
}

function emptyForm(defaultCat: ActivityCategory): ReceiptForm {
  const today = new Date();
  const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  return { client_name: "", reference: "", date_encaissement: iso, categorie: defaultCat, moyen: "virement", montant: "" };
}

export function LivreDeRecettesClient({
  profile,
  rows,
  manualReceipts,
  userId
}: {
  profile: Profile | null;
  rows: RevenueBookRow[];
  manualReceipts: ManualReceipt[];
  userId: string;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const { showToast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const defaultCat: ActivityCategory = profile?.activite_principale ?? "service_bic";

  // Merge: derivadas (imutáveis, vêm de faturas) + manuais (removíveis).
  const allRows = useMemo<BookRow[]>(() => {
    const derived: BookRow[] = rows.map((r) => ({
      id: r.id,
      date: r.date,
      numero: r.numero,
      clientName: r.clientName,
      category: r.category,
      montant: r.montant,
      moyen: r.moyen,
      manualId: null
    }));
    const manual: BookRow[] = manualReceipts.map((m) => ({
      id: `manual-${m.id}`,
      date: m.date_encaissement,
      numero: m.reference ?? "Manual",
      clientName: m.client_name ?? "—",
      category: m.categorie,
      montant: Number(m.montant) || 0,
      moyen: paymentMethodLabels[m.moyen] ?? m.moyen,
      manualId: m.id
    }));
    return [...derived, ...manual].sort((a, b) => b.date.localeCompare(a.date));
  }, [rows, manualReceipts]);

  const years = useMemo(() => availableYears(allRows), [allRows]);
  const periodicite = profile?.declaration_periodicite ?? "trimestral";
  const [year, setYear] = useState(years[0]);
  const options = useMemo(() => periodOptions(Number(year), periodicite), [periodicite, year]);
  // Abre no período corrente (mês/trimestre de hoje), não no 1º do ano.
  const currentPeriodValue =
    periodicite === "mensal" ? String(new Date().getMonth() + 1) : String(Math.floor(new Date().getMonth() / 3) + 1);
  const [period, setPeriod] = useState(
    options.some((o) => o.value === currentPeriodValue) ? currentPeriodValue : options[0]?.value ?? "1"
  );
  const selectedPeriod = options.find((o) => o.value === period) ?? options[0];

  const filteredRows = useMemo(
    () => allRows.filter((r) => selectedPeriod && r.date >= selectedPeriod.start && r.date <= selectedPeriod.end),
    [allRows, selectedPeriod]
  );
  const totals = useMemo(() => {
    const t: Record<ActivityCategory, number> = { vente: 0, service_bic: 0, service_bnc: 0 };
    filteredRows.forEach((r) => {
      t[r.category] += r.montant;
    });
    return t;
  }, [filteredRows]);
  const query = `year=${year}&period=${period}&periodicite=${periodicite}`;

  // ---- Adicionar entrada manual -------------------------------------------
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<ReceiptForm>(() => emptyForm(defaultCat));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  function openModal() {
    setForm(emptyForm(defaultCat));
    setErrors({});
    setModalOpen(true);
  }

  async function saveEntry(addAnother: boolean) {
    const parsed = manualReceiptSchema.safeParse(form);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      parsed.error.issues.forEach((i) => {
        next[i.path[0]?.toString() ?? "form"] = i.message;
      });
      setErrors(next);
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("manual_receipts").insert({ ...parsed.data, user_id: userId });
    setSaving(false);
    if (error) {
      showToast("Não foi possível salvar a entrada.", "error");
      return;
    }
    showToast("Entrada adicionada ao livro.", "success");
    if (addAnother) {
      setForm(emptyForm(form.categorie));
      setErrors({});
    } else {
      setModalOpen(false);
    }
    router.refresh();
  }

  async function deleteEntry(manualId: string) {
    const { error } = await supabase.from("manual_receipts").delete().eq("id", manualId);
    if (error) {
      showToast("Não foi possível remover.", "error");
      return;
    }
    showToast("Entrada removida.", "success");
    router.refresh();
  }

  // ---- Import CSV (data;cliente;valor) ------------------------------------
  async function importCsv(file: File) {
    const text = await file.text();
    const entries: { date_encaissement: string; client_name: string | null; montant: number }[] = [];
    for (const raw of text.split(/\r?\n/)) {
      const line = raw.trim();
      if (!line) continue;
      const sep = line.includes(";") ? ";" : ",";
      const parts = line.split(sep).map((p) => p.trim().replace(/^"|"$/g, ""));
      if (parts.length < 2) continue;
      let d = parts[0];
      const dm = d.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
      if (dm) d = `${dm[3]}-${dm[2]}-${dm[1]}`;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) continue;
      const montant = Number(parts[parts.length - 1].replace(/\s/g, "").replace(",", "."));
      if (!Number.isFinite(montant) || montant <= 0) continue;
      const client = parts.length >= 3 ? parts.slice(1, -1).join(" ") : null;
      entries.push({ date_encaissement: d, client_name: client, montant });
    }
    if (entries.length === 0) {
      showToast("Nenhuma linha válida. Formato: data;cliente;valor.", "error");
      return;
    }
    const payload = entries.map((e) => ({
      ...e,
      user_id: userId,
      categorie: defaultCat,
      moyen: "virement" as PaymentMethod,
      reference: "Importado"
    }));
    const { error } = await supabase.from("manual_receipts").insert(payload);
    if (error) {
      showToast("Não foi possível importar.", "error");
      return;
    }
    showToast(`${entries.length} entrada(s) importada(s) na categoria ${categoryLabel(defaultCat)}. Atenção: importar o mesmo arquivo duas vezes duplica.`, "success");
    router.refresh();
  }

  const isEmpty = allRows.length === 0;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      {/* Header + abas */}
      <div className="mb-2 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold text-ink">Livros de contabilidade</h1>
        <div className="flex flex-wrap gap-2">
          <a
            className="inline-flex h-10 items-center justify-center rounded-full bg-white px-4 text-sm font-semibold text-ink shadow-sm ring-1 ring-black/5 transition hover:bg-slate-50"
            href={`/api/livre-de-recettes/export?format=csv&${query}`}
          >
            Export CSV
          </a>
          <a
            className="inline-flex h-10 items-center justify-center rounded-full bg-brand px-4 text-sm font-semibold text-white shadow-sm ring-1 ring-[#002D72]/20 transition hover:bg-[#003a94]"
            href={`/api/livre-de-recettes/export?format=pdf&${query}`}
          >
            Download PDF
          </a>
        </div>
      </div>
      <nav className="mb-6 flex gap-5 border-b border-line text-sm font-medium">
        {TABS.map((t) =>
          t.active ? (
            <span className="border-b-2 border-brand pb-2 text-brand" key={t.href}>{t.label}</span>
          ) : (
            <Link className="pb-2 text-slate-500 transition hover:text-ink" href={t.href} key={t.href}>{t.label}</Link>
          )
        )}
      </nav>

      {isEmpty ? (
        /* Hero vazio (referência) */
        <section className="rounded-2xl bg-white px-6 py-12 shadow-sm ring-1 ring-black/5 sm:px-10">
          <h2 className="text-2xl font-semibold text-ink">Seu livro de receitas</h2>
          <p className="mt-2 max-w-md text-sm text-muted">
            Centralize seus recebimentos em um só lugar: as faturas pagas entram automaticamente, e você pode adicionar recibos manuais ou importar via CSV.
          </p>
          <ul className="mt-4 space-y-1.5 text-sm text-slate-700">
            {["Entradas ilimitadas", "Adição automática de faturas pagas", "Importar via arquivo CSV"].map((f) => (
              <li className="flex items-center gap-2" key={f}>
                <svg className="text-brand" fill="none" height="16" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" viewBox="0 0 24 24" width="16"><path d="M20 6 9 17l-5-5" /></svg>
                {f}
              </li>
            ))}
          </ul>
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <Button onClick={openModal} type="button">Adicionar uma entrada</Button>
            <button className="text-sm font-semibold text-brand hover:underline" onClick={() => fileRef.current?.click()} type="button">
              Importar receitas
            </button>
          </div>
        </section>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-3">
              <Select aria-label="Ano" className="w-28" onChange={(e) => setYear(e.target.value)} value={year}>
                {years.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </Select>
              <Select aria-label="Período" className="w-44" onChange={(e) => setPeriod(e.target.value)} value={period}>
                {options.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </Select>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => fileRef.current?.click()} type="button" variant="secondary">Importar receitas</Button>
              <Button onClick={openModal} type="button">Adicionar uma entrada</Button>
            </div>
          </div>

          <section className="mb-4 grid gap-3 sm:grid-cols-3">
            {(["vente", "service_bic", "service_bnc"] as ActivityCategory[]).map((cat) => (
              <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5" key={cat}>
                <p className="text-sm text-muted">{categoryLabel(cat)}</p>
                <p className="mt-1 text-xl font-semibold tabular-nums">{euroFormatter.format(totals[cat])}</p>
              </div>
            ))}
          </section>

          <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead>
                  <tr className="border-b border-line text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    <th className="px-5 py-2.5">Data</th>
                    <th className="px-5 py-2.5">Referência</th>
                    <th className="px-5 py-2.5">Cliente</th>
                    <th className="px-5 py-2.5">Natureza</th>
                    <th className="px-5 py-2.5">Meio</th>
                    <th className="px-5 py-2.5">Origem</th>
                    <th className="px-5 py-2.5 text-right">Montante</th>
                    <th className="px-5 py-2.5 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.length === 0 ? (
                    <tr><td className="px-5 py-8 text-center text-sm text-muted" colSpan={8}>Nenhum recebimento nesse período.</td></tr>
                  ) : (
                    filteredRows.map((r) => (
                      <tr className="border-b border-line last:border-b-0" key={r.id}>
                        <td className="px-5 py-2.5 tabular-nums text-slate-600">{r.date}</td>
                        <td className="px-5 py-2.5 text-slate-600">{r.numero}</td>
                        <td className="px-5 py-2.5 text-ink">{r.clientName}</td>
                        <td className="px-5 py-2.5 text-slate-600">{categoryLabel(r.category)}</td>
                        <td className="px-5 py-2.5 text-slate-600">{r.moyen}</td>
                        <td className="px-5 py-2.5">
                          {r.manualId ? (
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600 ring-1 ring-inset ring-slate-200">Manual</span>
                          ) : (
                            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200">Fatura</span>
                          )}
                        </td>
                        <td className="px-5 py-2.5 text-right font-medium tabular-nums text-ink">{euroFormatter.format(r.montant)}</td>
                        <td className="px-5 py-2.5 text-right">
                          {r.manualId ? (
                            <button className="rounded-lg px-2 py-1 text-xs font-semibold text-rose-600 ring-1 ring-inset ring-rose-200 transition hover:bg-rose-50" onClick={() => void deleteEntry(r.manualId!)} type="button">
                              Remover
                            </button>
                          ) : null}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <p className="mt-4 text-xs text-muted">
            Entradas manuais contam no livro e nos exports. Para entrarem na declaração URSSAF, registre o pagamento em uma fatura — ou peça orientação ao <Link className="font-medium text-brand hover:underline" href="/conselheiro">Conselheiro</Link>.
          </p>
        </>
      )}

      <input accept=".csv,text/csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void importCsv(f); e.target.value = ""; }} ref={fileRef} type="file" />

      {/* Modal Adicionar entrada (referência Abby) */}
      <FormModal
        description="Recibo sem fatura — entra no livro de receitas."
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Adicionar uma entrada"
      >
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            void saveEntry(false);
          }}
        >
          <label className="text-sm font-medium text-ink">
            Cliente
            <Input className="mt-2" onChange={(e) => setForm({ ...form, client_name: e.target.value })} placeholder="Cliente" value={form.client_name} />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium text-ink">
              Referência
              <Input className="mt-2" onChange={(e) => setForm({ ...form, reference: e.target.value })} placeholder="Referência (número)" value={form.reference} />
            </label>
            <label className="text-sm font-medium text-ink">
              Data de pagamento *
              <Input className="mt-2" onChange={(e) => setForm({ ...form, date_encaissement: e.target.value })} type="date" value={form.date_encaissement} />
              {errors.date_encaissement ? <span className="text-xs text-red-600">{errors.date_encaissement}</span> : null}
            </label>
          </div>
          <label className="text-sm font-medium text-ink">
            Tipo de venda *
            <Select className="mt-2" onChange={(e) => setForm({ ...form, categorie: e.target.value as ActivityCategory })} value={form.categorie}>
              <option value="vente">Venda de mercadorias</option>
              <option value="service_bic">Prestação de serviços (BIC)</option>
              <option value="service_bnc">Prestação de serviços (BNC)</option>
            </Select>
          </label>
          <label className="text-sm font-medium text-ink">
            Método de pagamento *
            <Select className="mt-2" onChange={(e) => setForm({ ...form, moyen: e.target.value as PaymentMethod })} value={form.moyen}>
              {Object.entries(paymentMethodLabels).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </Select>
          </label>
          <label className="text-sm font-medium text-ink">
            Valor (€) *
            <Input className="mt-2" min="0" onChange={(e) => setForm({ ...form, montant: e.target.value })} placeholder="0,00" step="0.01" type="number" value={form.montant} />
            {errors.montant ? <span className="text-xs text-red-600">{errors.montant}</span> : null}
          </label>
          <div className="flex flex-wrap justify-end gap-2">
            <Button onClick={() => setModalOpen(false)} type="button" variant="secondary">Cancelar</Button>
            <Button disabled={saving} onClick={() => void saveEntry(true)} type="button" variant="secondary">
              Salvar e adicionar outra
            </Button>
            <Button disabled={saving} type="submit">{saving ? "Salvando…" : "Salvar"}</Button>
          </div>
        </form>
      </FormModal>
    </main>
  );
}
