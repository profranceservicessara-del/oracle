import { redirect } from "next/navigation";
import { LivreDeRecettesClient } from "@/app/(app)/livre-de-recettes/recettes-client";
import { fetchRevenueBookRows } from "@/lib/accounting-data";
import { createClient } from "@/lib/supabase/server";
import type { ManualReceipt, Profile } from "@/lib/types";

export default async function LivreDeRecettesPage() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [{ data: profile }, rows, manualRes] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    fetchRevenueBookRows(supabase),
    supabase.from("manual_receipts").select("*").order("date_encaissement", { ascending: false })
  ]);

  return (
    <LivreDeRecettesClient
      manualReceipts={(manualRes.data ?? []) as ManualReceipt[]}
      profile={profile as Profile | null}
      rows={rows}
      userId={user.id}
    />
  );
}
