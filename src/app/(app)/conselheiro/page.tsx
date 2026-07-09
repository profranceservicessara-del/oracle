import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { AdvisorRequest } from "@/lib/types";
import { ConselheiroClient } from "./conselheiro-client";

// Gestão > Meu Conselheiro — central de solicitações de suporte/orientação.
// O usuário envia uma mensagem e a equipe responde em até 48h. Persistido em
// advisor_requests (RLS por dono). Read-only quanto a status/resposta.
export default async function ConselheiroPage() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data } = await supabase
    .from("advisor_requests")
    .select("*")
    .order("created_at", { ascending: false });

  return <ConselheiroClient initialRequests={(data ?? []) as AdvisorRequest[]} />;
}
