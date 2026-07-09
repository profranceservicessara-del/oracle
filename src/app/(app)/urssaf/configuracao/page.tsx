import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";
import { UrssafConfigClient } from "./configuracao-client";

// Gestão > URSSAF > Configurar declaração — edita os campos do profile
// relevantes à declaração (SIRET, categoria de atividade, periodicidade).
// Persistência real via profiles (padrão existente). Sem cálculo fiscal,
// sem alíquota, sem URSSAF/API, sem schema novo.
export default async function UrssafConfigPage() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();

  return <UrssafConfigClient initialProfile={(profile ?? null) as Profile | null} userId={user.id} />;
}
