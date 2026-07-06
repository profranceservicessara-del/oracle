"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { registerPaymentAction } from "@/app/(app)/documentos/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormModal } from "@/components/ui/form-modal";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { paymentMethodLabels, type Document, type Payment, type PaymentMethod } from "@/lib/types";

type PaymentsSectionProps = {
  document: Document;
  payments: Payment[];
};

const today = new Date().toISOString().slice(0, 10);

const euroFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "EUR"
});

// Métodos expostos no modal (labels do produto), reusando os valores do enum
// existente `PaymentMethod` — sem renomear payload keys.
const methodOptions: Array<{ value: PaymentMethod; label: string }> = [
  { value: "virement", label: "Transferência bancária" },
  { value: "cb", label: "Cartão" },
  { value: "especes", label: "Dinheiro" },
  { value: "cheque", label: "Cheque" },
  { value: "autre", label: "Outro" }
];

export function PaymentsSection({ document, payments }: PaymentsSectionProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [dateEncaissement, setDateEncaissement] = useState(today);
  const [montant, setMontant] = useState("");
  const [moyen, setMoyen] = useState<PaymentMethod>("virement");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const paidTotal = useMemo(
    () => payments.reduce((sum, payment) => sum + Number(payment.montant), 0),
    [payments]
  );
  const totalTtc = Number(document.total_ttc) || 0;
  const remaining = Math.max(0, totalTtc - paidTotal);

  // "Marcar como paga" só quando é facture emitida ainda não quitada
  // (exclui paid, cancelled, draft, expired e avoir/credited).
  const canMarkPaid = document.type === "facture" && ["sent", "partial"].includes(document.status);

  function openModal() {
    setDateEncaissement(today);
    setMontant(remaining > 0 ? remaining.toFixed(2) : "");
    setMoyen("virement");
    setNotes("");
    setError(null);
    setIsOpen(true);
  }

  async function savePayment() {
    const value = Number(montant);
    if (!montant || Number.isNaN(value) || value <= 0) {
      setError("Informe um valor recebido válido.");
      return;
    }
    if (value > remaining + 0.001) {
      setError(`O valor não pode ultrapassar o restante (${euroFormatter.format(remaining)}).`);
      return;
    }

    setError(null);
    setIsSaving(true);
    const result = await registerPaymentAction(document.id, {
      date_encaissement: dateEncaissement,
      montant,
      moyen,
      reference: "",
      notes
    });
    setIsSaving(false);

    if (result.error) {
      showToast(result.error, "error");
      return;
    }

    setIsOpen(false);
    showToast("Pagamento registrado com sucesso.", "success");
    router.refresh();
  }

  if (document.type !== "facture" || document.status === "draft") {
    return null;
  }

  const isPaid = document.status === "paid";

  return (
    <section className="mt-8 rounded-lg border border-line bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-ink">Paiements</h2>
          <p className="mt-1 text-sm text-muted">
            Total recebido: {euroFormatter.format(paidTotal)} · Restante: {euroFormatter.format(remaining)}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge tone={isPaid ? "success" : "warning"}>{isPaid ? "Pago" : "Em aberto"}</Badge>
          {canMarkPaid ? (
            <Button onClick={openModal} type="button">
              Marcar como paga
            </Button>
          ) : null}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead className="text-left text-xs uppercase text-muted">
            <tr className="border-b border-line">
              <th className="py-2 pr-3">Data</th>
              <th className="py-2 pr-3">Montante</th>
              <th className="py-2 pr-3">Meio</th>
              <th className="py-2 pr-3">Referência</th>
            </tr>
          </thead>
          <tbody>
            {payments.length > 0 ? (
              payments.map((payment) => (
                <tr className="border-b border-line last:border-b-0" key={payment.id}>
                  <td className="py-2 pr-3">{payment.date_encaissement}</td>
                  <td className="py-2 pr-3">{euroFormatter.format(Number(payment.montant))}</td>
                  <td className="py-2 pr-3">{paymentMethodLabels[payment.moyen]}</td>
                  <td className="py-2 pr-3">{payment.reference || "-"}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="py-4 text-muted" colSpan={4}>
                  Nenhum pagamento registrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <FormModal
        description="Registre o pagamento recebido para atualizar o status da fatura."
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Marcar como paga"
      >
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            void savePayment();
          }}
        >
          {/* Resumo do pagamento */}
          <div className="rounded-xl bg-slate-50 p-4 text-sm ring-1 ring-black/5">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Total da fatura</span>
              <span className="font-semibold tabular-nums text-ink">{euroFormatter.format(totalTtc)}</span>
            </div>
            <div className="mt-1.5 flex items-center justify-between">
              <span className="text-slate-500">Já recebido</span>
              <span className="font-semibold tabular-nums text-ink">{euroFormatter.format(paidTotal)}</span>
            </div>
            <div className="mt-1.5 flex items-center justify-between border-t border-line pt-1.5">
              <span className="text-slate-500">Restante</span>
              <span className="font-semibold tabular-nums text-[#1D4ED8]">{euroFormatter.format(remaining)}</span>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium text-ink">
              Data do pagamento
              <Input className="mt-2" onChange={(event) => setDateEncaissement(event.target.value)} type="date" value={dateEncaissement} />
            </label>
            <label className="text-sm font-medium text-ink">
              Valor recebido
              <Input className="mt-2" min="0.01" onChange={(event) => setMontant(event.target.value)} step="0.01" type="number" value={montant} />
            </label>
          </div>

          <label className="text-sm font-medium text-ink">
            Método de pagamento
            <Select className="mt-2" onChange={(event) => setMoyen(event.target.value as PaymentMethod)} value={moyen}>
              {methodOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </label>

          <label className="text-sm font-medium text-ink">
            Observação (opcional)
            <Textarea className="mt-2" onChange={(event) => setNotes(event.target.value)} value={notes} />
          </label>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <div className="flex items-center justify-end gap-3">
            <Button onClick={() => setIsOpen(false)} type="button" variant="secondary">
              Cancelar
            </Button>
            <Button disabled={isSaving} type="submit">
              {isSaving ? "Registrando…" : "Confirmar pagamento"}
            </Button>
          </div>
        </form>
      </FormModal>
    </section>
  );
}
