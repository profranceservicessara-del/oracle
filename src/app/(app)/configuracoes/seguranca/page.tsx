"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { FormModal } from "@/components/ui/form-modal";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";

export default function SegurancaPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const { showToast } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");

  function notImplemented() {
    showToast("Disponível em breve.", "info");
  }

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
      body: JSON.stringify({ confirmation: deleteConfirm }),
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
        <h1 className="mt-2 text-2xl font-semibold text-ink">Segurança</h1>
        <p className="mt-2 text-sm text-muted">Proteja o acesso à sua conta e gerencie seus dados.</p>
      </div>

      {/* Módulos de segurança */}
      <section className="mb-6 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
        <div className="border-b border-line bg-slate-50 px-5 py-3">
          <h2 className="text-base font-semibold text-ink">Segurança</h2>
        </div>
        <div className="grid gap-4 px-5 py-5 sm:grid-cols-2">
          <div className="rounded-xl p-4 ring-1 ring-black/5">
            <h3 className="text-sm font-semibold text-ink">Senha</h3>
            <p className="mt-1 text-sm text-muted">Crie ou altere a senha de acesso à sua conta.</p>
            <Button className="mt-3" onClick={notImplemented} type="button" variant="secondary">
              Alterar senha
            </Button>
          </div>
          <div className="rounded-xl p-4 ring-1 ring-black/5">
            <h3 className="text-sm font-semibold text-ink">Dispositivos conectados</h3>
            <p className="mt-1 text-sm text-muted">Veja os dispositivos conectados à sua conta Oracle.</p>
            <Button className="mt-3" onClick={notImplemented} type="button" variant="secondary">
              Ver lista
            </Button>
          </div>
        </div>
      </section>

      {/* Exportar / Excluir (RGPD) */}
      <section className="mb-6 rounded-2xl bg-white px-4 text-sm shadow-sm ring-1 ring-black/5">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line py-3">
          <span className="min-w-0 text-slate-600">
            <span className="font-medium text-ink">Exportar meus dados</span> — ZIP dos seus dados; o link expira em 15 min (limite 2/dia).
          </span>
          <button
            className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold text-brand ring-1 ring-inset ring-slate-200 transition hover:bg-slate-50 disabled:opacity-60"
            disabled={isExporting}
            onClick={() => void exportData()}
            type="button"
          >
            {isExporting ? "Gerando..." : "Exportar"}
          </button>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 py-3">
          <span className="min-w-0 text-slate-600">
            <span className="font-medium text-ink">Excluir minha conta</span> — anonimiza os dados de contato; documentos fiscais são preservados pelo prazo legal.
          </span>
          <button
            className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-700 ring-1 ring-inset ring-slate-200 transition hover:bg-slate-50"
            onClick={() => setIsDeleteOpen(true)}
            type="button"
          >
            Excluir
          </button>
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
          <Input onChange={(event) => setDeleteConfirm(event.target.value)} placeholder="CONFIRMAR" value={deleteConfirm} />
          <div className="flex justify-end gap-2">
            <Button onClick={() => setIsDeleteOpen(false)} type="button" variant="secondary">
              Cancelar
            </Button>
            <Button disabled={deleteConfirm !== "CONFIRMAR" || isDeleting} type="submit">
              {isDeleting ? "Excluindo..." : "Confirmar exclusão"}
            </Button>
          </div>
        </form>
      </FormModal>
    </main>
  );
}
