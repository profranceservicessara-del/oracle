import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ContatosClient } from "../contatos/contatos-client";
import { fetchContatosData } from "../contatos/data";

export default async function ClientesPage() {
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
