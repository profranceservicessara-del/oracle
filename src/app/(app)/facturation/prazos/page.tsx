import { redirect } from "next/navigation";
import { creditsByFacture, daysOverdue, dueReference, outstandingBalance } from "@/lib/receivables";
import { createClient } from "@/lib/supabase/server";
import type { Client, Document, Payment } from "@/lib/types";
import { PrazosClient, type OutstandingRow } from "./prazos-client";

// Cobrança > Prazos — faturas de venda com saldo em aberto, uma linha por
// documento. Saldo = total_ttc menos pagamentos e notas de crédito emitidas, pela
// mesma conta do /vencimentos (lib/receivables). A visão agregada
// por cliente (balance âgée) fica em /vencimentos. Só leitura.
export default async function PrazosPage() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  type RawFacture = Pick<
    Document,
    "id" | "client_id" | "numero" | "date_emission" | "date_echeance" | "total_ttc" | "status"
  >;

  const [facturesRes, paymentsRes, clientsRes, avoirsRes] = await Promise.all([
    supabase
      .from("documents")
      .select("id, client_id, numero, date_emission, date_echeance, total_ttc, status")
      .eq("type", "facture")
      .not("status", "in", "(draft,cancelled)"),
    supabase.from("payments").select("document_id, montant"),
    supabase.from("clients").select("id, nom, raison_sociale"),
    supabase
      .from("documents")
      .select("facture_origine_id, total_ttc")
      .eq("type", "avoir")
      .not("status", "in", "(draft,cancelled)")
  ]);
  const credits = creditsByFacture(
    (avoirsRes.data ?? []) as Array<{ facture_origine_id: string | null; total_ttc: number }>
  );

  const paidByDoc = new Map<string, number>();
  for (const p of (paymentsRes.data ?? []) as Pick<Payment, "document_id" | "montant">[]) {
    paidByDoc.set(p.document_id, (paidByDoc.get(p.document_id) ?? 0) + (Number(p.montant) || 0));
  }

  const nameByClient = new Map<string, string>();
  for (const c of (clientsRes.data ?? []) as Pick<Client, "id" | "nom" | "raison_sociale">[]) {
    nameByClient.set(c.id, c.raison_sociale || c.nom || "Cliente sem nome");
  }

  const today = new Date();

  const rows: OutstandingRow[] = ((facturesRes.data ?? []) as RawFacture[])
    .map((doc) => {
      const solde = outstandingBalance(doc.total_ttc, paidByDoc.get(doc.id) ?? 0, credits.get(doc.id) ?? 0);
      return {
        id: doc.id,
        numero: doc.numero,
        clientName: doc.client_id ? nameByClient.get(doc.client_id) ?? "Cliente sem nome" : "Sem cliente",
        dateEmission: doc.date_emission,
        dateEcheance: doc.date_echeance,
        // Sem vencimento conta da emissão, igual ao /vencimentos.
        daysOverdue: daysOverdue(dueReference(doc.date_echeance, doc.date_emission), today),
        solde
      };
    })
    .filter((r) => r.solde > 0.005)
    // Do mais atrasado para o mais distante, pela data de referência do atraso.
    .sort((a, b) => {
      const refA = dueReference(a.dateEcheance, a.dateEmission);
      const refB = dueReference(b.dateEcheance, b.dateEmission);
      if (!refA && !refB) return 0;
      if (!refA) return 1;
      if (!refB) return -1;
      return refA.localeCompare(refB);
    });

  return <PrazosClient rows={rows} />;
}
