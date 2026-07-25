import type { ReactNode } from "react";
import { CatalogoNav } from "./catalogo-nav";

// Shell do módulo Catálogo pro. Cabeçalho + sub-nav de abas. Os filhos
// renderizam só o conteúdo, sem outro container max-w.
export default function CatalogoProLayout({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Catálogo</h1>
          <p className="mt-1 text-sm text-muted">
            Produtos, serviços, variações, categorias, listas de preço e promoções.
          </p>
        </div>
        <CatalogoNav />
        {children}
      </div>
    </main>
  );
}
