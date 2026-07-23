import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ContatosClient } from "./contatos-client";
import { fetchContatosData } from "./data";

// Módulo Contatos (CRM paralelo). Carrega os terceiros (contact_thirds) e as
// pessoas (contact_people) do usuário. Filtragem por aba é feita no client
// (volume pequeno por conta). Fase 2: listagem com abas, ordenação e paginação.
export default async function ContatosPage() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { people, thirds } = await fetchContatosData(supabase);

  return <ContatosClient initialPeople={people} initialThirds={thirds} userId={user.id} />;
}
