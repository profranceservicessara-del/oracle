import { redirect } from "next/navigation";
import { DocumentEditor } from "@/components/documents/document-editor";
import { createClient } from "@/lib/supabase/server";
import type { CatalogItem, Client, Profile } from "@/lib/types";

export default async function NovoDocumentoPage({
  searchParams
}: {
  searchParams: { type?: string; client?: string };
}) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const initialType = searchParams.type === "facture" ? "facture" : "devis";
  const initialClientId = searchParams.client;
  const [{ data: clients }, { data: catalogItems }, { data: profile }] = await Promise.all([
    supabase.from("clients").select("*").eq("archived", false).order("created_at", { ascending: false }),
    supabase
      .from("catalog_items")
      .select("*")
      .eq("archived", false)
      .order("created_at", { ascending: false }),
    supabase.from("profiles").select("*").eq("id", user.id).single()
  ]);

  return (
    <DocumentEditor
      catalogItems={(catalogItems ?? []) as CatalogItem[]}
      clients={(clients ?? []) as Client[]}
      initialClientId={initialClientId}
      initialDocument={null}
      initialLines={[]}
      initialType={initialType}
      profile={profile as Profile | null}
      userId={user.id}
    />
  );
}
