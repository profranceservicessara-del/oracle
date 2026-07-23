import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Client, Document } from "@/lib/types";
import { NotasCreditoClient, type AvoirRow, type EligibleFacture } from "./notas-credito-client";

// Cobrança > Notas de crédito (avoirs) — lista os documentos type='avoir' e
// permite gerar uma nova a partir de uma fatura existente (RPC create_avoir via
// server action). Só leitura + a action que já existe. Sem schema novo.
export default async function NotasCreditoPage() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  type RawDoc = Pick<
    Document,
    "id" | "type" | "status" | "client_id" | "numero" | "date_emission" | "total_ttc" | "facture_origine_id"
  >;

  const [avoirsRes, facturesRes, clientsRes] = await Promise.all([
    supabase
      .from("documents")
      .select("id, type, status, client_id, numero, date_emission, total_ttc, facture_origine_id")
      .eq("type", "avoir")
      .order("date_emission", { ascending: false }),
    supabase
      .from("documents")
      .select("id, type, status, client_id, numero, date_emission, total_ttc, facture_origine_id")
      .eq("type", "facture")
      .not("status", "in", "(draft,cancelled)")
      .order("date_emission", { ascending: false }),
    supabase.from("clients").select("id, nom, raison_sociale")
  ]);

  const nameByClient = new Map<string, string>();
  for (const c of (clientsRes.data ?? []) as Pick<Client, "id" | "nom" | "raison_sociale">[]) {
    nameByClient.set(c.id, c.raison_sociale || c.nom || "Cliente sem nome");
  }

  const factures = (facturesRes.data ?? []) as RawDoc[];
  const numeroByFacture = new Map<string, string>();
  for (const f of factures) {
    numeroByFacture.set(f.id, f.numero ?? "Sem número");
  }

  const clientNameOf = (clientId: string | null) =>
    clientId ? nameByClient.get(clientId) ?? "Cliente sem nome" : "Sem cliente";

  const rows: AvoirRow[] = ((avoirsRes.data ?? []) as RawDoc[]).map((doc) => ({
    id: doc.id,
    numero: doc.numero,
    clientName: clientNameOf(doc.client_id),
    dateEmission: doc.date_emission,
    totalTtc: Number(doc.total_ttc) || 0,
    factureOrigineNumero: doc.facture_origine_id
      ? numeroByFacture.get(doc.facture_origine_id) ?? "Fatura não encontrada"
      : null
  }));

  const eligibles: EligibleFacture[] = factures.map((f) => ({
    id: f.id,
    numero: f.numero,
    clientName: clientNameOf(f.client_id),
    dateEmission: f.date_emission,
    totalTtc: Number(f.total_ttc) || 0
  }));

  return <NotasCreditoClient eligibles={eligibles} rows={rows} />;
}
