import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Client, Document } from "@/lib/types";
import { RascunhosClient, type DraftRow } from "./rascunhos-client";

// Cobrança > Rascunhos — documentos ainda não emitidos (status 'draft'), de
// qualquer tipo. Só leitura, derivado de `documents`. Sem schema novo.
export default async function RascunhosPage() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [documentsRes, clientsRes] = await Promise.all([
    supabase
      .from("documents")
      .select("id, type, client_id, numero, date_emission, total_ttc, created_at")
      .eq("status", "draft")
      .order("created_at", { ascending: false }),
    supabase.from("clients").select("id, nom, raison_sociale")
  ]);

  const nameByClient = new Map<string, string>();
  for (const c of (clientsRes.data ?? []) as Pick<Client, "id" | "nom" | "raison_sociale">[]) {
    nameByClient.set(c.id, c.raison_sociale || c.nom || "Cliente sem nome");
  }

  type RawDraft = Pick<Document, "id" | "type" | "client_id" | "numero" | "date_emission" | "total_ttc" | "created_at">;

  const rows: DraftRow[] = ((documentsRes.data ?? []) as RawDraft[]).map((doc) => ({
    id: doc.id,
    type: doc.type,
    numero: doc.numero,
    clientName: doc.client_id ? nameByClient.get(doc.client_id) ?? "Cliente sem nome" : "Sem cliente",
    dateEmission: doc.date_emission,
    totalTtc: Number(doc.total_ttc) || 0,
    createdAt: doc.created_at
  }));

  return <RascunhosClient rows={rows} />;
}
