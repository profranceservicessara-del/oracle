import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Client, Document, DocumentLine } from "@/lib/types";
import { LinhasClient, type LineRow } from "./linhas-client";

// Cobrança > Linhas — relatório item a item: cada linha de documento cruzada com
// o documento e o cliente. Só leitura, derivado de document_lines. A RLS já
// limita as linhas ao usuário; o join é feito em memória (sem embed) para não
// depender do nome da foreign key.
export default async function LinhasPage() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  type RawDoc = Pick<Document, "id" | "type" | "numero" | "date_emission" | "client_id">;

  const [linesRes, documentsRes, clientsRes] = await Promise.all([
    supabase
      .from("document_lines")
      .select(
        "id, document_id, ordre, designation, description, quantite, prix_unitaire_ht, taux_tva, categorie, total_ligne_ht"
      )
      .order("ordre", { ascending: true }),
    supabase.from("documents").select("id, type, numero, date_emission, client_id"),
    supabase.from("clients").select("id, nom, raison_sociale")
  ]);

  const nameByClient = new Map<string, string>();
  for (const c of (clientsRes.data ?? []) as Pick<Client, "id" | "nom" | "raison_sociale">[]) {
    nameByClient.set(c.id, c.raison_sociale || c.nom || "Cliente sem nome");
  }

  const docById = new Map<string, RawDoc>();
  for (const d of (documentsRes.data ?? []) as RawDoc[]) {
    docById.set(d.id, d);
  }

  type RawLine = Pick<
    DocumentLine,
    | "id"
    | "document_id"
    | "ordre"
    | "designation"
    | "description"
    | "quantite"
    | "prix_unitaire_ht"
    | "taux_tva"
    | "categorie"
    | "total_ligne_ht"
  >;

  const rows: LineRow[] = ((linesRes.data ?? []) as RawLine[])
    .flatMap((line) => {
      const doc = docById.get(line.document_id);
      // Linha sem documento visível (não deveria acontecer sob RLS) é ignorada.
      if (!doc) return [];
      return [
        {
          id: line.id,
          documentId: doc.id,
          numero: doc.numero,
          type: doc.type,
          clientName: doc.client_id ? nameByClient.get(doc.client_id) ?? "Cliente sem nome" : "Sem cliente",
          dateEmission: doc.date_emission,
          designation: line.designation,
          description: line.description,
          categorie: line.categorie,
          quantite: Number(line.quantite) || 0,
          prixUnitaireHt: Number(line.prix_unitaire_ht) || 0,
          tauxTva: Number(line.taux_tva) || 0,
          totalLigneHt: Number(line.total_ligne_ht) || 0,
          ordre: Number(line.ordre) || 0
        }
      ];
    })
    // Data de emissão desc; sem data vai para o fim. Desempate pela ordem da linha.
    .sort((a, b) => {
      if (a.dateEmission !== b.dateEmission) {
        if (!a.dateEmission) return 1;
        if (!b.dateEmission) return -1;
        return b.dateEmission.localeCompare(a.dateEmission);
      }
      return a.ordre - b.ordre;
    });

  return <LinhasClient rows={rows} />;
}
