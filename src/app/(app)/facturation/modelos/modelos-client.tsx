"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BillingNav } from "@/components/app/billing-nav";
import { Button } from "@/components/ui/button";
import { FormModal } from "@/components/ui/form-modal";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { calculateDocumentTotals, calculateLineHt, type EditorLine } from "@/lib/document-calculations";
import { createClient } from "@/lib/supabase/client";
import type { ActivityCategory, VatRegime } from "@/lib/types";

export type TemplateLine = {
  id: string;
  template_id: string;
  ordre: number;
  designation: string;
  description: string | null;
  quantite: number;
  prix_unitaire_ht: number;
  taux_tva: number;
  categorie: ActivityCategory;
};

export type TemplateWithLines = {
  id: string;
  user_id: string;
  name: string;
  type: "devis" | "facture";
  description: string | null;
  conditions_paiement: string | null;
  notes_bas_page: string | null;
  lines: TemplateLine[];
};

const euro = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "EUR" });

const typeLabels: Record<TemplateWithLines["type"], string> = {
  devis: "Orçamento",
  facture: "Fatura"
};

const categoryLabels: Record<ActivityCategory, string> = {
  vente: "Venda",
  service_bic: "Serviço BIC",
  service_bnc: "Serviço BNC"
};

type LineForm = {
  designation: string;
  description: string;
  quantite: string;
  prix_unitaire_ht: string;
  taux_tva: string;
  categorie: ActivityCategory;
};

type HeaderForm = {
  name: string;
  type: TemplateWithLines["type"];
  description: string;
  conditions_paiement: string;
  notes_bas_page: string;
};

const emptyLine = (): LineForm => ({
  designation: "",
  description: "",
  quantite: "1",
  prix_unitaire_ht: "",
  taux_tva: "0",
  categorie: "service_bnc"
});

const emptyHeader = (): HeaderForm => ({
  name: "",
  type: "facture",
  description: "",
  conditions_paiement: "",
  notes_bas_page: ""
});

// Converte as linhas do modelo para o formato que a regra de cálculo do sistema
// espera, para não duplicar lógica fiscal (TVA só quando assujetti).
function toEditorLines(lines: { designation: string; quantite: number; prix_unitaire_ht: number; taux_tva: number; categorie: ActivityCategory }[]): EditorLine[] {
  return lines.map((l, i) => ({
    id: String(i),
    designation: l.designation,
    description: "",
    quantite: l.quantite,
    prix_unitaire_ht: l.prix_unitaire_ht,
    taux_tva: l.taux_tva,
    categorie: l.categorie
  }));
}

export function ModelosClient({
  initialTemplates,
  regimeTva,
  userId
}: {
  initialTemplates: TemplateWithLines[];
  regimeTva: VatRegime;
  userId: string;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const { showToast } = useToast();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<TemplateWithLines | null>(null);
  const [header, setHeader] = useState<HeaderForm>(emptyHeader);
  const [lines, setLines] = useState<LineForm[]>([emptyLine()]);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!modalOpen) return;
    setError("");
    if (editing) {
      setHeader({
        name: editing.name,
        type: editing.type,
        description: editing.description ?? "",
        conditions_paiement: editing.conditions_paiement ?? "",
        notes_bas_page: editing.notes_bas_page ?? ""
      });
      setLines(
        editing.lines.length > 0
          ? editing.lines.map((l) => ({
              designation: l.designation,
              description: l.description ?? "",
              quantite: String(l.quantite),
              prix_unitaire_ht: String(l.prix_unitaire_ht),
              taux_tva: String(l.taux_tva),
              categorie: l.categorie
            }))
          : [emptyLine()]
      );
    } else {
      setHeader(emptyHeader());
      setLines([emptyLine()]);
    }
  }, [modalOpen, editing]);

  const formTotals = useMemo(
    () =>
      calculateDocumentTotals(
        toEditorLines(
          lines.map((l) => ({
            designation: l.designation,
            quantite: Number(l.quantite) || 0,
            prix_unitaire_ht: Number(l.prix_unitaire_ht) || 0,
            taux_tva: Number(l.taux_tva) || 0,
            categorie: l.categorie
          }))
        ),
        regimeTva
      ),
    [lines, regimeTva]
  );

  function templateTotal(t: TemplateWithLines): number {
    return calculateDocumentTotals(toEditorLines(t.lines), regimeTva).totalTtc;
  }

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }
  function openEdit(t: TemplateWithLines) {
    setEditing(t);
    setModalOpen(true);
  }

  function updateLine(index: number, patch: Partial<LineForm>) {
    setLines((current) => current.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  }
  function addLine() {
    setLines((current) => [...current, emptyLine()]);
  }
  function removeLine(index: number) {
    setLines((current) => (current.length <= 1 ? current : current.filter((_, i) => i !== index)));
  }

  async function save() {
    if (!header.name.trim()) {
      setError("Dê um nome ao modelo.");
      return;
    }
    const filled = lines.filter((l) => l.designation.trim() !== "");
    if (filled.length === 0) {
      setError("Adicione ao menos uma linha com designação.");
      return;
    }
    setError("");
    setSaving(true);

    const payload = {
      user_id: userId,
      name: header.name.trim(),
      type: header.type,
      description: header.description || null,
      conditions_paiement: header.conditions_paiement || null,
      notes_bas_page: header.notes_bas_page || null
    };

    let templateId = editing?.id ?? null;
    if (templateId) {
      const { error: updateError } = await supabase.from("document_templates").update(payload).eq("id", templateId);
      if (updateError) {
        setSaving(false);
        showToast("Não foi possível salvar o modelo.", "error");
        return;
      }
    } else {
      const { data, error: insertError } = await supabase.from("document_templates").insert(payload).select("id").single();
      if (insertError || !data) {
        setSaving(false);
        showToast(
          insertError?.code === "23505" ? "Já existe um modelo com esse nome." : "Não foi possível criar o modelo.",
          "error"
        );
        return;
      }
      templateId = data.id as string;
    }

    // Regrava as linhas: apaga as antigas e reinsere na ordem atual.
    const { error: deleteError } = await supabase.from("document_template_lines").delete().eq("template_id", templateId);
    if (deleteError) {
      setSaving(false);
      showToast("Não foi possível salvar as linhas do modelo.", "error");
      return;
    }
    const linePayloads = filled.map((l, i) => ({
      template_id: templateId,
      ordre: i + 1,
      designation: l.designation.trim(),
      description: l.description || null,
      quantite: Number(l.quantite) || 1,
      prix_unitaire_ht: Number(l.prix_unitaire_ht) || 0,
      taux_tva: Number(l.taux_tva) || 0,
      categorie: l.categorie
    }));
    const { error: linesError } = await supabase.from("document_template_lines").insert(linePayloads);
    setSaving(false);
    if (linesError) {
      showToast("Não foi possível salvar as linhas do modelo.", "error");
      return;
    }

    showToast(editing ? "Modelo atualizado." : "Modelo criado.", "success");
    setModalOpen(false);
    router.refresh();
  }

  async function remove(t: TemplateWithLines) {
    if (!window.confirm(`Excluir o modelo "${t.name}"?`)) return;
    setBusyId(t.id);
    const { error: deleteError } = await supabase.from("document_templates").delete().eq("id", t.id);
    setBusyId(null);
    if (deleteError) {
      showToast("Não foi possível excluir o modelo.", "error");
      return;
    }
    showToast("Modelo excluído.", "success");
    router.refresh();
  }

  // Cria um rascunho em /documentos a partir do modelo, copiando as linhas, e
  // abre o editor para escolher o cliente e emitir.
  async function createFromTemplate(t: TemplateWithLines) {
    if (t.lines.length === 0) {
      showToast("Este modelo não tem linhas.", "error");
      return;
    }
    setBusyId(t.id);

    const totals = calculateDocumentTotals(toEditorLines(t.lines), regimeTva);
    const { data: created, error: docError } = await supabase
      .from("documents")
      .insert({
        user_id: userId,
        type: t.type,
        status: "draft",
        date_emission: new Date().toISOString().slice(0, 10),
        conditions_paiement: t.conditions_paiement,
        notes_bas_page: t.notes_bas_page,
        total_ht: totals.totalHt,
        total_tva: totals.totalTva,
        total_ttc: totals.totalTtc
      })
      .select("id")
      .single();

    if (docError || !created) {
      setBusyId(null);
      showToast("Não foi possível criar o documento a partir do modelo.", "error");
      return;
    }

    const linePayloads = t.lines.map((l, i) => ({
      document_id: created.id as string,
      user_id: userId,
      ordre: i + 1,
      designation: l.designation,
      description: l.description,
      quantite: l.quantite,
      prix_unitaire_ht: l.prix_unitaire_ht,
      taux_tva: l.taux_tva,
      categorie: l.categorie,
      total_ligne_ht: calculateLineHt({
        id: String(i),
        designation: l.designation,
        description: "",
        quantite: l.quantite,
        prix_unitaire_ht: l.prix_unitaire_ht,
        taux_tva: l.taux_tva,
        categorie: l.categorie
      })
    }));
    const { error: linesError } = await supabase.from("document_lines").insert(linePayloads);
    setBusyId(null);
    if (linesError) {
      showToast("Documento criado, mas as linhas falharam. Abra e confira.", "error");
      router.push(`/documentos/${created.id}/editar`);
      return;
    }

    showToast("Rascunho criado a partir do modelo.", "success");
    router.push(`/documentos/${created.id}/editar`);
  }

  const totalLines = initialTemplates.reduce((sum, t) => sum + t.lines.length, 0);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="space-y-6">
        <BillingNav active="modelos" />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold text-ink">Modelos</h1>
              <p className="mt-1 text-sm text-muted">
                Documentos-modelo reutilizáveis. Criar a partir de um modelo gera um rascunho já com as linhas.
              </p>
            </div>
            <Button onClick={openCreate} type="button">
              + Novo modelo
            </Button>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Modelos</p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-ink">{initialTemplates.length}</p>
            </div>
            <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Linhas cadastradas</p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-ink">{totalLines}</p>
            </div>
            <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Regime de TVA</p>
              <p className="mt-1 text-lg font-semibold text-ink">{regimeTva === "assujetti" ? "Assujetti" : "Franchise"}</p>
            </div>
          </div>

          {initialTemplates.length === 0 ? (
            <div className="mt-6 flex flex-col items-center rounded-2xl bg-white px-6 py-14 text-center shadow-sm ring-1 ring-black/5">
              <p className="text-lg font-semibold text-ink">Nenhum modelo ainda.</p>
              <p className="mt-2 max-w-md text-sm text-muted">
                Crie um modelo com as linhas que você repete todo mês e gere orçamentos e faturas em um clique.
              </p>
              <Button className="mt-6" onClick={openCreate} type="button">
                Criar primeiro modelo
              </Button>
            </div>
          ) : (
            <section className="mt-6 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
              <div className="flex items-center justify-between gap-3 border-b border-line bg-slate-50 px-5 py-3">
                <h2 className="text-sm font-semibold text-ink">Meus modelos</h2>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold tabular-nums text-slate-600">
                  {initialTemplates.length}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-line text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      <th className="px-5 py-2.5">Nome</th>
                      <th className="px-5 py-2.5">Tipo</th>
                      <th className="px-5 py-2.5 text-right">Linhas</th>
                      <th className="px-5 py-2.5 text-right">Total TTC</th>
                      <th className="px-5 py-2.5 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {initialTemplates.map((t) => (
                      <tr className="border-b border-line last:border-b-0" key={t.id}>
                        <td className="px-5 py-2.5">
                          <span className="font-medium text-ink">{t.name}</span>
                          {t.description ? <p className="text-xs text-muted">{t.description}</p> : null}
                        </td>
                        <td className="px-5 py-2.5">
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600 ring-1 ring-inset ring-slate-200">
                            {typeLabels[t.type]}
                          </span>
                        </td>
                        <td className="px-5 py-2.5 text-right tabular-nums text-slate-600">{t.lines.length}</td>
                        <td className="px-5 py-2.5 text-right font-medium tabular-nums text-ink">{euro.format(templateTotal(t))}</td>
                        <td className="px-5 py-2.5">
                          <div className="flex flex-wrap justify-end gap-1.5">
                            <button
                              className="rounded-lg px-2 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200 transition hover:bg-emerald-50 disabled:opacity-60"
                              disabled={busyId === t.id}
                              onClick={() => void createFromTemplate(t)}
                              type="button"
                            >
                              {busyId === t.id ? "Criando..." : "Usar modelo"}
                            </button>
                            <button
                              className="rounded-lg px-2 py-1 text-xs font-semibold text-slate-600 ring-1 ring-inset ring-slate-200 transition hover:bg-slate-50"
                              onClick={() => openEdit(t)}
                              type="button"
                            >
                              Editar
                            </button>
                            <button
                              className="rounded-lg px-2 py-1 text-xs font-semibold text-rose-600 ring-1 ring-inset ring-rose-200 transition hover:bg-rose-50 disabled:opacity-60"
                              disabled={busyId === t.id}
                              onClick={() => void remove(t)}
                              type="button"
                            >
                              Excluir
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          <p className="mt-4 text-xs text-muted">
            O modelo guarda apenas as linhas e as condições. O cliente é escolhido depois, no rascunho gerado.
          </p>
        </div>
      </div>

      <FormModal
        description="Linhas e condições que você reaproveita ao criar orçamentos e faturas."
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Editar modelo" : "Novo modelo"}
      >
        <div className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium text-ink">
              Nome do modelo
              <Input className="mt-2" onChange={(e) => setHeader({ ...header, name: e.target.value })} value={header.name} />
            </label>
            <label className="text-sm font-medium text-ink">
              Tipo
              <Select
                className="mt-2"
                onChange={(e) => setHeader({ ...header, type: e.target.value as TemplateWithLines["type"] })}
                value={header.type}
              >
                <option value="facture">Fatura</option>
                <option value="devis">Orçamento</option>
              </Select>
            </label>
          </div>
          <label className="text-sm font-medium text-ink">
            Descrição (opcional)
            <Input className="mt-2" onChange={(e) => setHeader({ ...header, description: e.target.value })} value={header.description} />
          </label>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-ink">Linhas</h3>
              <Button onClick={addLine} type="button" variant="secondary">
                + Adicionar linha
              </Button>
            </div>
            <div className="space-y-3">
              {lines.map((line, index) => (
                <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-inset ring-slate-200" key={index}>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <label className="text-xs font-medium text-slate-500">
                      Designação
                      <Input className="mt-1" onChange={(e) => updateLine(index, { designation: e.target.value })} value={line.designation} />
                    </label>
                    <label className="text-xs font-medium text-slate-500">
                      Descrição
                      <Input className="mt-1" onChange={(e) => updateLine(index, { description: e.target.value })} value={line.description} />
                    </label>
                    <div className="grid grid-cols-2 gap-2 sm:col-span-2 sm:grid-cols-4">
                      <label className="text-xs font-medium text-slate-500">
                        Quantidade
                        <Input className="mt-1" min="0" onChange={(e) => updateLine(index, { quantite: e.target.value })} step="0.001" type="number" value={line.quantite} />
                      </label>
                      <label className="text-xs font-medium text-slate-500">
                        Preço unitário HT
                        <Input className="mt-1" min="0" onChange={(e) => updateLine(index, { prix_unitaire_ht: e.target.value })} step="0.01" type="number" value={line.prix_unitaire_ht} />
                      </label>
                      <label className="text-xs font-medium text-slate-500">
                        TVA %
                        <Input className="mt-1" min="0" onChange={(e) => updateLine(index, { taux_tva: e.target.value })} step="0.1" type="number" value={line.taux_tva} />
                      </label>
                      <label className="text-xs font-medium text-slate-500">
                        Categoria
                        <Select className="mt-1" onChange={(e) => updateLine(index, { categorie: e.target.value as ActivityCategory })} value={line.categorie}>
                          {(Object.keys(categoryLabels) as ActivityCategory[]).map((c) => (
                            <option key={c} value={c}>
                              {categoryLabels[c]}
                            </option>
                          ))}
                        </Select>
                      </label>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-xs tabular-nums text-slate-500">
                      Total da linha:{" "}
                      <span className="font-semibold text-ink">
                        {euro.format(
                          calculateLineHt({
                            id: String(index),
                            designation: line.designation,
                            description: "",
                            quantite: Number(line.quantite) || 0,
                            prix_unitaire_ht: Number(line.prix_unitaire_ht) || 0,
                            taux_tva: Number(line.taux_tva) || 0,
                            categorie: line.categorie
                          })
                        )}
                      </span>
                    </span>
                    {lines.length > 1 ? (
                      <button
                        className="rounded-lg px-2 py-1 text-xs font-semibold text-rose-600 ring-1 ring-inset ring-rose-200 transition hover:bg-rose-50"
                        onClick={() => removeLine(index)}
                        type="button"
                      >
                        Remover
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap justify-end gap-6 rounded-2xl bg-white p-4 text-sm shadow-sm ring-1 ring-black/5">
            <div className="text-right">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Total HT</p>
              <p className="mt-0.5 font-semibold tabular-nums text-ink">{euro.format(formTotals.totalHt)}</p>
            </div>
            <div className="text-right">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Total TVA</p>
              <p className="mt-0.5 font-semibold tabular-nums text-ink">{euro.format(formTotals.totalTva)}</p>
            </div>
            <div className="text-right">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Total TTC</p>
              <p className="mt-0.5 font-semibold tabular-nums text-ink">{euro.format(formTotals.totalTtc)}</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium text-ink">
              Condições de pagamento (opcional)
              <Input className="mt-2" onChange={(e) => setHeader({ ...header, conditions_paiement: e.target.value })} value={header.conditions_paiement} />
            </label>
            <label className="text-sm font-medium text-ink">
              Nota de rodapé (opcional)
              <Input className="mt-2" onChange={(e) => setHeader({ ...header, notes_bas_page: e.target.value })} value={header.notes_bas_page} />
            </label>
          </div>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <div className="flex justify-end gap-2">
            <Button onClick={() => setModalOpen(false)} type="button" variant="secondary">
              Cancelar
            </Button>
            <Button disabled={saving} onClick={() => void save()} type="button">
              {saving ? "Salvando..." : "Salvar modelo"}
            </Button>
          </div>
        </div>
      </FormModal>
    </main>
  );
}
