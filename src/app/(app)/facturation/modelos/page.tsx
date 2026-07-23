import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { VatRegime } from "@/lib/types";
import { ModelosClient, type TemplateLine, type TemplateWithLines } from "./modelos-client";

// Cobrança > Modelos: documentos-modelo reutilizáveis (orçamento/fatura).
// Criar a partir de um modelo gera um rascunho em /documentos, copiando as
// linhas. Os totais usam a mesma regra fiscal do resto do sistema.
export default async function ModelosPage() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [templatesRes, linesRes, profileRes] = await Promise.all([
    supabase.from("document_templates").select("*").order("name", { ascending: true }),
    supabase.from("document_template_lines").select("*").order("ordre", { ascending: true }),
    supabase.from("profiles").select("regime_tva").eq("id", user.id).maybeSingle()
  ]);

  const linesByTemplate = new Map<string, TemplateLine[]>();
  for (const row of (linesRes.data ?? []) as TemplateLine[]) {
    const list = linesByTemplate.get(row.template_id) ?? [];
    list.push(row);
    linesByTemplate.set(row.template_id, list);
  }

  const templates = ((templatesRes.data ?? []) as Omit<TemplateWithLines, "lines">[]).map((t) => ({
    ...t,
    lines: linesByTemplate.get(t.id) ?? []
  }));

  const regimeTva = ((profileRes.data?.regime_tva as VatRegime | undefined) ?? "franchise") as VatRegime;

  return <ModelosClient initialTemplates={templates} regimeTva={regimeTva} userId={user.id} />;
}
