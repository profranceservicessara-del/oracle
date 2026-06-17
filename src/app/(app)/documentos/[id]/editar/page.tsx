import { redirect } from "next/navigation";
import { DocumentEditor } from "@/components/documents/document-editor";
import { createClient } from "@/lib/supabase/server";
import type { CatalogItem, Client, Document, DocumentLine, Profile } from "@/lib/types";

export default async function EditarDocumentoPage({ params }: { params: { id: string } }) {
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

  if (typedDocument.status !== "draft") {
    redirect(`/documentos/${typedDocument.id}`);
  }

  const [{ data: lines }, { data: clients }, { data: catalogItems }, { data: profile }] =
    await Promise.all([
      supabase
        .from("document_lines")
        .select("*")
        .eq("document_id", typedDocument.id)
        .order("ordre", { ascending: true }),
      supabase.from("clients").select("*").order("created_at", { ascending: false }),
      supabase.from("catalog_items").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("*").eq("id", user.id).single()
    ]);

  return (
    <DocumentEditor
      catalogItems={(catalogItems ?? []) as CatalogItem[]}
      clients={(clients ?? []) as Client[]}
      initialDocument={typedDocument}
      initialLines={(lines ?? []) as DocumentLine[]}
      initialType={typedDocument.type}
      profile={profile as Profile | null}
      userId={user.id}
    />
  );
}
