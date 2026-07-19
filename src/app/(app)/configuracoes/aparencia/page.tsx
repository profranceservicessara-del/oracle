"use client";

import { AppearanceEditor } from "@/components/app/appearance-editor";

export default function AparenciaPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6">
        <p className="text-sm font-semibold text-brand">Configurações · Cobrança</p>
        <h1 className="mt-2 text-2xl font-semibold text-ink">Aparência</h1>
      </div>
      <AppearanceEditor />
    </main>
  );
}
