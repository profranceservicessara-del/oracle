import { redirect } from "next/navigation";
import { RegistreDesAchatsClient } from "@/app/(app)/registre-des-achats/achats-client";
import { createClient } from "@/lib/supabase/server";
import type { Purchase } from "@/lib/types";

export default async function RegistreDesAchatsPage() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: purchases } = await supabase
    .from("purchases")
    .select("*")
    .order("date_achat", { ascending: false });

  return (
    <RegistreDesAchatsClient
      initialPurchases={(purchases ?? []) as Purchase[]}
      userId={user.id}
    />
  );
}
