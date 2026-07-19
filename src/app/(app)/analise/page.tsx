import { redirect } from "next/navigation";
import { loadAnaliseData } from "@/lib/analise-data";
import { createClient } from "@/lib/supabase/server";
import { AnaliseClient } from "./analise-client";

// Gestão > Análise (aba Resultados dos Livros) — dashboard anual: CA (recebido)
// × despesas × resultado por mês, tesouraria e ponte para a declaração.
// 100% read-only. NÃO calcula imposto/contribuição — só a base; /urssaf é a fonte.
export default async function AnalisePage() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const data = await loadAnaliseData(user.id);

  return <AnaliseClient aReceber={data.aReceber} bank={data.bank} entradas={data.entradas} periodicite={data.periodicite} saidas={data.saidas} />;
}
