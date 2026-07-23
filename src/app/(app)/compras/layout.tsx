import type { ReactNode } from "react";
import { ComprasNav } from "./compras-nav";

// Shell do módulo Compras (contas a pagar). Cabeçalho + sub-nav de abas.
// Os filhos renderizam só o conteúdo, sem outro container max-w.
export default function ComprasLayout({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Compras</h1>
          <p className="mt-1 text-sm text-muted">Contas a pagar, faturas de fornecedores e documentos de compra.</p>
        </div>
        <ComprasNav />
        {children}
      </div>
    </main>
  );
}
