import { redirect } from "next/navigation";
import { fetchRevenueBookRows } from "@/lib/accounting-data";
import { createClient } from "@/lib/supabase/server";
import type { DeclarationDraft, DeclarationLine, Profile } from "@/lib/types";
import { UrssafClient } from "./urssaf-client";

// Gestão > Declaração URSSAF — preparação de base de declaração com valores
// realmente recebidos (payments). Somente ajuda à preparação: NÃO envia nada
// à URSSAF, NÃO calcula contribuições, sem alíquotas. Rascunhos persistidos
// em urssaf_declaration_drafts/lines (RLS por dono).
export default async function UrssafPage() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [{ data: profile }, rows, draftsRes, linesRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("siret, activite_principale, declaration_periodicite, regime_tva, date_debut_activite")
      .eq("id", user.id)
      .maybeSingle(),
    fetchRevenueBookRows(supabase),
    supabase.from("urssaf_declaration_drafts").select("*").order("period_start", { ascending: false }),
    supabase.from("urssaf_declaration_lines").select("*").order("date_encaissement", { ascending: true })
  ]);

  return (
    <UrssafClient
      drafts={(draftsRes.data ?? []) as DeclarationDraft[]}
      initialRows={rows}
      lines={(linesRes.data ?? []) as DeclarationLine[]}
      profile={
        (profile ?? null) as Pick<
          Profile,
          "siret" | "activite_principale" | "declaration_periodicite" | "regime_tva" | "date_debut_activite"
        > | null
      }
    />
  );
}
