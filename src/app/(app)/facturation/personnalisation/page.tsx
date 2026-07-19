import { redirect } from "next/navigation";
import { AppearanceEditor } from "@/components/app/appearance-editor";
import { BillingNav } from "@/components/app/billing-nav";
import { createClient } from "@/lib/supabase/server";

// Personalizar fatura — o editor de aparência dentro da própria seção Cobrança
// (não navega para Configurações). Reusa o componente compartilhado; o "Salvar"
// vive no próprio editor.
export default async function PersonnalisationPage() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="space-y-6">
        <BillingNav active="aparencia" />

        <div>
          <h1 className="text-2xl font-semibold text-ink">Personalizar fatura</h1>
          <p className="mt-1 text-sm text-muted">Ajuste o visual dos seus documentos de faturamento sem sair de Cobrança.</p>
        </div>

        <AppearanceEditor />
      </div>
    </main>
  );
}
