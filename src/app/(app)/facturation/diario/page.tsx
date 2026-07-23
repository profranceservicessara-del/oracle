import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Client, Document, Payment } from "@/lib/types";
import { DiarioClient, type JournalEvent } from "./diario-client";

// Cobrança > Diário — linha do tempo DERIVADA. Não existe tabela de log: os
// eventos são reconstruídos a partir dos documentos numerados (emissão) e dos
// pagamentos registrados (recebimento). Só leitura, sem schema novo.
export default async function DiarioPage() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  type RawDoc = Pick<Document, "id" | "type" | "numero" | "date_emission" | "client_id" | "total_ttc">;
  type RawPayment = Pick<Payment, "id" | "document_id" | "date_encaissement" | "montant" | "moyen">;

  const [documentsRes, paymentsRes, clientsRes] = await Promise.all([
    supabase.from("documents").select("id, type, numero, date_emission, client_id, total_ttc").not("numero", "is", null),
    supabase.from("payments").select("id, document_id, date_encaissement, montant, moyen"),
    supabase.from("clients").select("id, nom, raison_sociale")
  ]);

  const nameByClient = new Map<string, string>();
  for (const c of (clientsRes.data ?? []) as Pick<Client, "id" | "nom" | "raison_sociale">[]) {
    nameByClient.set(c.id, c.raison_sociale || c.nom || "Cliente sem nome");
  }

  const documents = (documentsRes.data ?? []) as RawDoc[];
  const docById = new Map<string, RawDoc>();
  for (const d of documents) {
    docById.set(d.id, d);
  }

  const clientNameOf = (clientId: string | null) =>
    clientId ? nameByClient.get(clientId) ?? "Cliente sem nome" : "Sem cliente";

  const emissions: JournalEvent[] = documents.flatMap((doc) => {
    // Sem data de emissão não dá para posicionar na linha do tempo.
    if (!doc.date_emission) return [];
    return [
      {
        id: `doc-${doc.id}`,
        kind: "emissao" as const,
        date: doc.date_emission,
        documentId: doc.id,
        documentType: doc.type,
        numero: doc.numero,
        clientName: clientNameOf(doc.client_id),
        moyen: null,
        amount: Number(doc.total_ttc) || 0
      }
    ];
  });

  const receipts: JournalEvent[] = ((paymentsRes.data ?? []) as RawPayment[]).map((p) => {
    const doc = docById.get(p.document_id);
    return {
      id: `pay-${p.id}`,
      kind: "pagamento" as const,
      date: p.date_encaissement,
      documentId: p.document_id,
      documentType: doc?.type ?? null,
      numero: doc?.numero ?? null,
      clientName: doc ? clientNameOf(doc.client_id) : "Cliente sem nome",
      moyen: p.moyen,
      amount: Number(p.montant) || 0
    };
  });

  const events = [...emissions, ...receipts].sort((a, b) => b.date.localeCompare(a.date));

  return <DiarioClient events={events} />;
}
