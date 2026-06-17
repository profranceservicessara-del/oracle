import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Client, Document } from "@/lib/types";
import { DocumentosClient } from "./documentos-client";

export default async function DocumentosPage() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [{ data: documents }, { data: clients }] = await Promise.all([
    supabase
      .from("documents")
      .select("*")
      .in("type", ["devis", "facture"])
      .order("created_at", { ascending: false }),
    supabase.from("clients").select("*").order("created_at", { ascending: false })
  ]);

  return (
    <DocumentosClient
      clients={(clients ?? []) as Client[]}
      initialDocuments={(documents ?? []) as Document[]}
    />
  );
}
