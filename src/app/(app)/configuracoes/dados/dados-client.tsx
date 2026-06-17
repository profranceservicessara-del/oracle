"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { FormModal } from "@/components/ui/form-modal";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";

export function DadosClient() {
  const router = useRouter();
  const supabase = createClient();
  const { showToast } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");

  async function exportData() {
    setIsExporting(true);
    const response = await fetch("/api/rgpd/export", { method: "POST" });
    const payload = (await response.json()) as { error?: string; signedUrl?: string };
    setIsExporting(false);

    if (!response.ok || !payload.signedUrl) {
      showToast(payload.error ?? "Não foi possível exportar seus dados.", "error");
      return;
    }

    window.open(payload.signedUrl, "_blank", "noopener,noreferrer");
  }

  async function deleteAccount() {
    setIsDeleting(true);
    const response = await fetch("/api/rgpd/delete", {
      body: JSON.stringify({ confirmation }),
      headers: { "Content-Type": "application/json" },
      method: "POST"
    });
    const payload = (await response.json()) as { error?: string };
    setIsDeleting(false);

    if (!response.ok) {
      showToast(payload.error ?? "Não foi possível excluir a conta.", "error");
      return;
    }

    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6">
        <p className="text-sm font-semibold text-brand">Configurações</p>
        <h1 className="mt-2 text-2xl font-semibold text-ink">Dados pessoais</h1>
        <p className="mt-2 text-sm text-muted">
          Exporte seus dados ou solicite a exclusão da conta conforme RGPD.
        </p>
      </div>

      <section className="grid gap-4 rounded-lg border border-line bg-white p-6 shadow-sm">
        <div className="rounded-md border border-line p-4">
          <h2 className="font-semibold text-ink">Exporter mes données</h2>
          <p className="mt-2 text-sm text-muted">
            Gera um ZIP com os dados das suas tabelas e a lista de caminhos dos PDFs privados.
            O link expira em 15 minutos. Limite: 2 exports por dia.
          </p>
          <Button className="mt-4" disabled={isExporting} onClick={() => void exportData()} type="button">
            {isExporting ? "Gerando..." : "Exporter mes données"}
          </Button>
        </div>

        <div className="rounded-md border border-red-200 bg-red-50 p-4">
          <h2 className="font-semibold text-red-900">Supprimer mon compte</h2>
          <p className="mt-2 text-sm text-red-800">
            A exclusão anonimiza dados de contato imediatamente. Documentos fiscais emitidos
            são preservados pelo prazo legal em conta técnica anonimizada.
          </p>
          <Button
            className="mt-4"
            onClick={() => setIsDeleteOpen(true)}
            type="button"
            variant="secondary"
          >
            Supprimer mon compte
          </Button>
        </div>
      </section>

      <FormModal
        description='Digite "CONFIRMAR" para solicitar a exclusão. Esta ação encerra suas sessões.'
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        title="Confirmar exclusão"
      >
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            void deleteAccount();
          }}
        >
          <Input
            onChange={(event) => setConfirmation(event.target.value)}
            placeholder="CONFIRMAR"
            value={confirmation}
          />
          <div className="flex justify-end gap-2">
            <Button onClick={() => setIsDeleteOpen(false)} type="button" variant="secondary">
              Cancelar
            </Button>
            <Button disabled={confirmation !== "CONFIRMAR" || isDeleting} type="submit">
              {isDeleting ? "Excluindo..." : "Confirmar exclusão"}
            </Button>
          </div>
        </form>
      </FormModal>
    </main>
  );
}
