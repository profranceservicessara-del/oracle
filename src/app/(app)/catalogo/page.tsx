import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { CatalogItem } from "@/lib/types";
import { CatalogoClient } from "./catalogo-client";

export default async function CatalogoPage() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: items } = await supabase
    .from("catalog_items")
    .select("*")
    .order("created_at", { ascending: false });

  return <CatalogoClient initialItems={(items ?? []) as CatalogItem[]} userId={user.id} />;
}
