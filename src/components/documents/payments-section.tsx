"use client";

import { useMemo, useState } from "react";
import { registerPaymentAction } from "@/app/(app)/documentos/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

export function PaymentsSection({ document, payments }: PaymentsSectionProps) {
  const { showToast } = useToast();
  const [dateEncaissement, setDateEncaissement] = useState(today);
  const [montant, setMontant] = useState("");
  const [moyen, setMoyen] = useState<PaymentMethod>("virement");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const paidTotal = useMemo(
    () => payments.reduce((sum, payment) => sum + Number(payment.montant), 0),
    [payments]
  );
  const remaining = Math.max(0, Number(document.total_ttc) - paidTotal);
  const canRegister =
    document.type === "facture" && ["sent", "partial", "paid"].includes(document.status);

  async function savePayment() {
    setIsSaving(true);
    const result = await registerPaymentAction(document.id, {
      date_encaissement: dateEncaissement,
      montant,
      moyen,
      reference,
      notes
    });
    setIsSaving(false);

    if (result.error) {
      showToast(result.error, "error");
      return;
    }

    showToast("Pagamento registrado.", "success");
    setMontant("");
    setReference("");
    setNotes("");
  }

  if (document.type !== "facture" || document.status === "draft") {
    return null;
  }

  return (
    <section className="mt-8 rounded-lg border border-line bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-ink">Paiements</h2>
          <p className="mt-1 text-sm text-muted">
            Total recebido: {euroFormatter.format(paidTotal)} · Restante:{" "}
            {euroFormatter.format(remaining)}
          </p>
        </div>
        <Badge tone={document.status === "paid" ? "success" : "warning"}>
          {document.status === "paid" ? "Pago" : "Em aberto"}
        </Badge>
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

      {canRegister && document.status !== "paid" ? (
        <form
          className="mt-5 grid gap-3 border-t border-line pt-5 md:grid-cols-[150px_150px_180px_1fr]"
          onSubmit={(event) => {
            event.preventDefault();
            void savePayment();
          }}
        >
          <label className="text-sm font-medium text-ink">
            Data
            <Input
              className="mt-2"
              onChange={(event) => setDateEncaissement(event.target.value)}
              type="date"
              value={dateEncaissement}
            />
          </label>
          <label className="text-sm font-medium text-ink">
            Valor
            <Input
              className="mt-2"
              max={remaining}
              min="0.01"
              onChange={(event) => setMontant(event.target.value)}
              step="0.01"
              type="number"
              value={montant}
            />
          </label>
          <label className="text-sm font-medium text-ink">
            Meio
            <Select
              className="mt-2"
              onChange={(event) => setMoyen(event.target.value as PaymentMethod)}
              value={moyen}
            >
              {Object.entries(paymentMethodLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </label>
          <label className="text-sm font-medium text-ink">
            Referência
            <Input
              className="mt-2"
              onChange={(event) => setReference(event.target.value)}
              value={reference}
            />
          </label>
          <label className="text-sm font-medium text-ink md:col-span-3">
            Observações
            <Textarea className="mt-2" onChange={(event) => setNotes(event.target.value)} value={notes} />
          </label>
          <div className="flex items-end">
            <Button disabled={isSaving} type="submit">
              {isSaving ? "Registrando..." : "Registrar"}
            </Button>
          </div>
        </form>
      ) : null}
    </section>
  );
}
