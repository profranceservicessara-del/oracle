import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ContractTemplate } from "@/lib/types";
import { ModelosClient } from "./modelos-client";

// Gestão > Modelos de contrato — biblioteca real (persistida em
// contract_templates, RLS por usuário) + geração de PDF com placeholders.
export default async function ModelosContratoPage() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data } = await supabase
    .from("contract_templates")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return <ModelosClient initialTemplates={(data ?? []) as ContractTemplate[]} userId={user.id} />;
}
