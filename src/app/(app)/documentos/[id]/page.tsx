import Link from "next/link";
import { redirect } from "next/navigation";
import { DocumentActions } from "@/components/documents/document-actions";
import { DocumentPreview } from "@/components/documents/document-preview";
import { PaymentsSection } from "@/components/documents/payments-section";
import { createClient } from "@/lib/supabase/server";
import type { Client, Document, DocumentLine, Payment, Profile } from "@/lib/types";

function toEditorLine(line: DocumentLine) {
  return {
    id: line.id,
    designation: line.designation,
    description: line.description ?? "",
    quantite: line.quantite,
    prix_unitaire_ht: line.prix_unitaire_ht,
    taux_tva: line.taux_tva,
    categorie: line.categorie
  };
}

export default async function DocumentoPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: document } = await supabase
    .from("documents")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!document) {
    redirect("/documentos");
  }

  const typedDocument = document as Document;
  const [{ data: lines }, { data: client }, { data: profile }, { data: payments }] = await Promise.all([
    supabase
      .from("document_lines")
      .select("*")
      .eq("document_id", typedDocument.id)
      .order("ordre", { ascending: true }),
    typedDocument.client_id
      ? supabase.from("clients").select("*").eq("id", typedDocument.client_id).single()
      : Promise.resolve({ data: null }),
    supabase.from("profiles").select("*").eq("id", user.id).single()
    ,
    supabase
      .from("payments")
      .select("*")
      .eq("document_id", typedDocument.id)
      .order("date_encaissement", { ascending: true })
  ]);

  const typedProfile = profile as Profile | null;

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-brand">Documento</p>
          <h1 className="mt-2 text-2xl font-semibold text-ink">
            {typedDocument.numero || "Documento rascunho"}
          </h1>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          {typedDocument.status === "draft" ? (
            <Link
              className="inline-flex h-11 items-center justify-center gap-2 rounded bg-brand px-4 text-sm font-semibold text-white shadow-sm ring-1 ring-[#002D72]/20 transition hover:bg-[#003a94] active:bg-[#001F4D] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              href={`/documentos/${typedDocument.id}/editar`}
            >
              Editar rascunho
            </Link>
          ) : null}
          <DocumentActions client={client as Client | null} document={typedDocument} />
        </div>
      </div>

      <DocumentPreview
        client={client as Client | null}
        conditionsPaiement={typedDocument.conditions_paiement ?? ""}
        dateEcheance={typedDocument.date_echeance ?? ""}
        dateEmission={typedDocument.date_emission ?? ""}
        datePrestation={typedDocument.date_prestation ?? ""}
        documentType={typedDocument.type}
        lines={((lines ?? []) as DocumentLine[]).map(toEditorLine)}
        notesBasPage={typedDocument.notes_bas_page ?? ""}
        profile={typedProfile}
        regimeTva={typedProfile?.regime_tva ?? "franchise"}
        validiteJours={typedDocument.validite_jours}
      />
      <PaymentsSection document={typedDocument} payments={(payments ?? []) as Payment[]} />
    </main>
  );
}
