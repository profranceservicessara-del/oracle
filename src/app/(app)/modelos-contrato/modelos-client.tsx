"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { FormModal } from "@/components/ui/form-modal";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";
import type { ContractTemplate } from "@/lib/types";

// Modelos "iniciais" — pré-preenchem o corpo com placeholders. O usuário edita
// e salva o seu próprio modelo. Placeholders trocados na geração do PDF.
const STARTERS: Array<{ label: string; title: string; body: string }> = [
  {
    label: "Prestação de serviços",
    title: "Contrato de prestação de serviços",
    body:
      "CONTRATO DE PRESTAÇÃO DE SERVIÇOS\n\nEntre {{empresa}} (SIRET {{siret}}), com sede em {{endereco}}, doravante PRESTADOR,\ne {{cliente}}, doravante CLIENTE.\n\n1. OBJETO\nO PRESTADOR compromete-se a executar os serviços descritos abaixo:\n[descrever os serviços]\n\n2. PREÇO E PAGAMENTO\n[valor, condições e prazos de pagamento]\n\n3. PRAZO\n[data de início e duração]\n\n4. OBRIGAÇÕES DAS PARTES\n[obrigações]\n\nFeito em {{data}}.\n\n____________________            ____________________\nPRESTADOR                        CLIENTE"
  },
  {
    label: "Reconhecimento de dívida",
    title: "Reconhecimento de dívida",
    body:
      "RECONHECIMENTO DE DÍVIDA\n\nEu, {{cliente}}, reconheço dever a {{empresa}} (SIRET {{siret}}) a quantia de [valor] euros.\n\nCompromisso de pagamento: [condições e prazo].\n\nFeito em {{endereco}}, em {{data}}.\n\n____________________\nDevedor"
  },
  {
    label: "Carta de intenções",
    title: "Carta de intenções",
    body:
      "CARTA DE INTENÇÕES\n\n{{empresa}} manifesta a {{cliente}} a intenção de negociar um acordo referente a [objeto].\n\nEsta carta é pré-contratual e não vincula as partes a um contrato definitivo.\n\nFeito em {{data}}."
  },
  { label: "Em branco", title: "", body: "" }
];

const PLACEHOLDERS = "{{empresa}} · {{siret}} · {{endereco}} · {{cliente}} · {{data}}";

type Form = { title: string; body: string };
const emptyForm: Form = { title: "", body: "" };

export function ModelosClient({ initialTemplates, userId }: { initialTemplates: ContractTemplate[]; userId: string }) {
  const supabase = useMemo(() => createClient(), []);
  const { showToast } = useToast();
  const [templates, setTemplates] = useState(initialTemplates);
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Form>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState<ContractTemplate | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);

  useEffect(() => {
    if (!confirm) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !confirmBusy) setConfirm(null);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [confirm, confirmBusy]);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setIsOpen(true);
  }
  function openEdit(tpl: ContractTemplate) {
    setEditingId(tpl.id);
    setForm({ title: tpl.title, body: tpl.body });
    setIsOpen(true);
  }
  function applyStarter(label: string) {
    const s = STARTERS.find((x) => x.label === label);
    if (s) setForm({ title: s.title, body: s.body });
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!form.title.trim() || saving) return;
    setSaving(true);
    const payload = { title: form.title.trim(), body: form.body };

    if (editingId) {
      const { data, error } = await supabase.from("contract_templates").update(payload).eq("id", editingId).select("*").single();
      setSaving(false);
      if (error || !data) return showToast("Não foi possível salvar o modelo.", "error");
      setTemplates((cur) => cur.map((t) => (t.id === editingId ? (data as ContractTemplate) : t)));
      setIsOpen(false);
      showToast("Modelo salvo.", "success");
      return;
    }

    const { data, error } = await supabase
      .from("contract_templates")
      .insert({ ...payload, user_id: userId })
      .select("*")
      .single();
    setSaving(false);
    if (error || !data) return showToast("Não foi possível criar o modelo.", "error");
    setTemplates((cur) => [data as ContractTemplate, ...cur]);
    setIsOpen(false);
    showToast("Modelo criado.", "success");
  }

  async function doDelete() {
    if (!confirm || confirmBusy) return;
    setConfirmBusy(true);
    const { error } = await supabase.from("contract_templates").delete().eq("id", confirm.id);
    setConfirmBusy(false);
    if (error) return showToast("Não foi possível excluir.", "error");
    setTemplates((cur) => cur.filter((t) => t.id !== confirm.id));
    setConfirm(null);
    showToast("Modelo excluído.", "success");
  }

  function generatePdf(tpl: ContractTemplate) {
    window.open(`/api/contract-templates/${tpl.id}/pdf`, "_blank", "noopener,noreferrer");
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Gestão</p>
          <h1 className="mt-1 text-2xl font-semibold text-ink">Modelos de contrato</h1>
          <p className="mt-1 text-sm text-muted">Crie modelos reutilizáveis e gere PDFs com seus dados preenchidos.</p>
        </div>
        <Button onClick={openCreate} type="button">
          + Novo modelo
        </Button>
      </div>

      {templates.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl bg-white px-6 py-16 text-center shadow-sm ring-1 ring-black/5">
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 text-slate-400 ring-1 ring-black/5">
            <svg fill="none" height="28" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" viewBox="0 0 24 24" width="28">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /><path d="M9 15h6M9 11h6" />
            </svg>
          </span>
          <h2 className="mt-5 text-lg font-semibold text-ink">Nenhum modelo cadastrado.</h2>
          <p className="mt-2 max-w-sm text-sm text-muted">Comece de um modelo pronto ou crie do zero.</p>
          <Button className="mt-6" onClick={openCreate} type="button">
            + Novo modelo
          </Button>
        </div>
      ) : (
        <div className="divide-y divide-line overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
          {templates.map((tpl) => (
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4" key={tpl.id}>
              <div className="min-w-0">
                <p className="truncate font-medium text-ink">{tpl.title}</p>
                <p className="truncate text-xs text-muted">{tpl.body.slice(0, 80) || "Sem conteúdo"}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Button onClick={() => generatePdf(tpl)} type="button" variant="secondary">
                  Gerar PDF
                </Button>
                <button aria-label="Editar" className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-ink" onClick={() => openEdit(tpl)} title="Editar" type="button">
                  <svg fill="none" height="16" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" viewBox="0 0 24 24" width="16"><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
                </button>
                <button aria-label="Excluir" className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-600" onClick={() => setConfirm(tpl)} title="Excluir" type="button">
                  <svg fill="none" height="16" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" viewBox="0 0 24 24" width="16"><path d="M3 6h18" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <FormModal
        description={`Placeholders trocados no PDF: ${PLACEHOLDERS}`}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={editingId ? "Editar modelo" : "Novo modelo"}
      >
        <form className="grid gap-4" onSubmit={(event) => void save(event)}>
          {!editingId ? (
            <label className="text-sm font-medium text-ink">
              Começar de
              <Select className="mt-2" defaultValue="" onChange={(e) => applyStarter(e.target.value)}>
                <option value="">— escolher um modelo pronto —</option>
                {STARTERS.map((s) => (
                  <option key={s.label} value={s.label}>
                    {s.label}
                  </option>
                ))}
              </Select>
            </label>
          ) : null}
          <label className="text-sm font-medium text-ink">
            Título
            <Input className="mt-2" onChange={(e) => setForm((c) => ({ ...c, title: e.target.value }))} required value={form.title} />
          </label>
          <label className="text-sm font-medium text-ink">
            Corpo
            <Textarea className="mt-2 min-h-64 font-mono text-xs" onChange={(e) => setForm((c) => ({ ...c, body: e.target.value }))} value={form.body} />
          </label>
          <div className="flex justify-end gap-2">
            <Button onClick={() => setIsOpen(false)} type="button" variant="secondary">
              Cancelar
            </Button>
            <Button disabled={saving || !form.title.trim()} type="submit">
              {saving ? "Salvando…" : "Salvar"}
            </Button>
          </div>
        </form>
      </FormModal>

      {confirm ? (
        <div aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 py-8 backdrop-blur-sm" role="dialog">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-black/5">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-600 ring-1 ring-rose-100">
                <svg fill="none" height="18" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24" width="18"><path d="M3 6h18" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
              </span>
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-ink">Excluir</h2>
                <p className="mt-1 text-sm text-muted">Esta ação não pode ser desfeita.</p>
                <p className="mt-2 truncate rounded-lg bg-slate-50 px-3 py-1.5 text-sm font-medium text-ink ring-1 ring-black/5">{confirm.title}</p>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <Button disabled={confirmBusy} onClick={() => setConfirm(null)} type="button" variant="secondary">
                Cancelar
              </Button>
              <button className="inline-flex min-w-[6rem] items-center justify-center rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-700 disabled:opacity-60" disabled={confirmBusy} onClick={() => void doDelete()} type="button">
                {confirmBusy ? "…" : "Excluir"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
