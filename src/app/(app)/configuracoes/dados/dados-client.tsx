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
  const [vitrineToken, setVitrineToken] = useState("");

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

  function saveVitrineToken() {
    // TODO: Persistir o token VITRINE (requer coluna nova em profiles + tratamento seguro do segredo no backend).
    showToast("Integração VITRINE será conectada em breve.", "info");
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

      <section className="mt-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Integrações</p>
        <h2 className="mt-1 text-lg font-semibold text-ink">Integração com VITRINE</h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          Se você usa a VITRINE, ative esta integração para autorizar o ProFacture a recuperar as
          informações das suas missões realizadas na VITRINE e automatizar o tratamento contábil.
        </p>
        <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-600 ring-1 ring-black/5">
          <p className="font-medium text-ink">Gere um token na sua conta VITRINE:</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            <li>Acesse “Parâmetros da conta”.</li>
            <li>Abra a aba “API Keys”.</li>
            <li>Gere um novo token e copie.</li>
          </ol>
        </div>
        <div className="mt-4 flex items-start gap-2 rounded-xl bg-[#002D72]/5 p-3 text-sm text-[#002D72] ring-1 ring-[#002D72]/10">
          <svg aria-hidden="true" className="mt-0.5 shrink-0" fill="none" height="18" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24" width="18">
            <circle cx="12" cy="12" r="9" />
            <line x1="12" x2="12" y1="11" y2="16" />
            <line x1="12" x2="12" y1="8" y2="8" />
          </svg>
          <span>Apenas as prestações realizadas após o registro do seu RIB na VITRINE serão consideradas.</span>
        </div>
        {/* TODO: Persistir o Token VITRINE (requer coluna nova em profiles + tratamento seguro do segredo no backend). */}
        <label className="mt-4 block text-sm font-medium text-ink">
          Token VITRINE
          <Input
            className="mt-2"
            onChange={(event) => setVitrineToken(event.target.value)}
            placeholder="Cole seu token VITRINE"
            value={vitrineToken}
          />
        </label>
        <div className="mt-4 flex justify-end">
          <Button disabled={!vitrineToken.trim()} onClick={saveVitrineToken} type="button">
            Salvar
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
