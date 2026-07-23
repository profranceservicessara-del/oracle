import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Client, Document, Payment } from "@/lib/types";
import { PrazosClient, type OutstandingRow } from "./prazos-client";

const DAY = 24 * 60 * 60 * 1000;

// Dias de atraso: positivo = vencido, negativo ou zero = a vencer.
function daysOverdue(refDate: string | null, today: Date): number | null {
  if (!refDate) return null;
  const ref = new Date(refDate);
  if (Number.isNaN(ref.getTime())) return null;
  return Math.floor((today.getTime() - ref.getTime()) / DAY);
}

// Cobrança > Prazos — faturas de venda com saldo em aberto, uma linha por
// documento. Saldo = total_ttc menos pagamentos registrados. A visão agregada
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

  const [facturesRes, paymentsRes, clientsRes] = await Promise.all([
    supabase
      .from("documents")
      .select("id, client_id, numero, date_emission, date_echeance, total_ttc, status")
      .eq("type", "facture")
      .not("status", "in", "(draft,cancelled)"),
    supabase.from("payments").select("document_id, montant"),
    supabase.from("clients").select("id, nom, raison_sociale")
  ]);

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
      const solde = Math.round(((Number(doc.total_ttc) || 0) - (paidByDoc.get(doc.id) ?? 0)) * 100) / 100;
      return {
        id: doc.id,
        numero: doc.numero,
        clientName: doc.client_id ? nameByClient.get(doc.client_id) ?? "Cliente sem nome" : "Sem cliente",
        dateEmission: doc.date_emission,
        dateEcheance: doc.date_echeance,
        daysOverdue: daysOverdue(doc.date_echeance, today),
        solde
      };
    })
    .filter((r) => r.solde > 0.005)
    // Vencimento ascendente; faturas sem vencimento vão para o fim.
    .sort((a, b) => {
      if (!a.dateEcheance && !b.dateEcheance) return 0;
      if (!a.dateEcheance) return 1;
      if (!b.dateEcheance) return -1;
      return a.dateEcheance.localeCompare(b.dateEcheance);
    });

  return <PrazosClient rows={rows} />;
}
