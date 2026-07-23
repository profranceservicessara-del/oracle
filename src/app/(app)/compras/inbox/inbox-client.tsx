"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";
import { validateUpload } from "@/lib/upload-validation";
import type { PurchaseIncoming } from "../types";

const INVOICE_BUCKET = "supplier-invoices";

const statusMeta: Record<string, { label: string; badge: string }> = {
  to_verify: { label: "A verificar", badge: "bg-slate-100 text-slate-600 ring-slate-200" },
  verified: { label: "Verificado", badge: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  rejected: { label: "Rejeitado", badge: "bg-rose-50 text-rose-700 ring-rose-200" }
};

export function InboxClient({ initialItems, userId }: { initialItems: PurchaseIncoming[]; userId: string }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const { showToast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function handleUpload(file: File | null) {
    if (!file) return;
    const fileError = validateUpload(file, "document");
    if (fileError) {
      showToast(fileError, "error");
      return;
    }
    setUploading(true);
    const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${userId}/${crypto.randomUUID()}-${safe}`;
    const { error: uploadError } = await supabase.storage
      .from(INVOICE_BUCKET)
      .upload(path, file, { contentType: file.type || undefined, upsert: false });
    if (uploadError) {
      setUploading(false);
      showToast("Não foi possível enviar o arquivo.", "error");
      return;
    }
    const { error } = await supabase.from("purchase_incoming").insert({
      user_id: userId,
      storage_path: path,
      original_filename: file.name,
      source: "upload",
      status: "to_verify"
    });
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
    if (error) {
      await supabase.storage.from(INVOICE_BUCKET).remove([path]);
      showToast("Não foi possível registrar o arquivo.", "error");
      return;
    }
    showToast("Arquivo enviado para verificação.", "success");
    router.refresh();
  }

  async function openAttachment(item: PurchaseIncoming) {
    const { data, error } = await supabase.storage.from(INVOICE_BUCKET).createSignedUrl(item.storage_path, 120);
    if (error || !data) {
      showToast("Não foi possível abrir o anexo.", "error");
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  async function convertToInvoice(item: PurchaseIncoming) {
    setBusyId(item.id);
    const { data: created, error } = await supabase
      .from("purchase_documents")
      .insert({ user_id: userId, type: "invoice", status: "draft" })
      .select("id")
      .single();
    if (error || !created) {
      setBusyId(null);
      showToast("Não foi possível criar o rascunho de fatura.", "error");
      return;
    }
    const { error: linkError } = await supabase
      .from("purchase_incoming")
      .update({ matched_document_id: created.id, status: "verified" })
      .eq("id", item.id);
    setBusyId(null);
    if (linkError) {
      showToast("Rascunho criado, mas o vínculo falhou.", "error");
      router.refresh();
      return;
    }
    showToast("Rascunho de fatura criado em Faturas.", "success");
    router.refresh();
  }

  async function reject(item: PurchaseIncoming) {
    setBusyId(item.id);
    const { error } = await supabase.from("purchase_incoming").update({ status: "rejected" }).eq("id", item.id);
    setBusyId(null);
    if (error) {
      showToast("Não foi possível rejeitar.", "error");
      return;
    }
    showToast("Documento rejeitado.", "success");
    router.refresh();
  }

  return (
    <div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-ink">A verificar</h2>
          <p className="mt-1 text-sm text-muted">Faturas recebidas por upload, aguardando conversão em documento de compra.</p>
        </div>
        <div>
          <input
            accept="application/pdf,image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => void handleUpload(e.target.files?.[0] ?? null)}
            ref={fileRef}
            type="file"
          />
          <Button disabled={uploading} onClick={() => fileRef.current?.click()} type="button">
            {uploading ? "Enviando..." : "+ Enviar documento"}
          </Button>
        </div>
      </div>

      {initialItems.length === 0 ? (
        <div className="mt-6 flex flex-col items-center rounded-2xl bg-white px-6 py-14 text-center shadow-sm ring-1 ring-black/5">
          <p className="text-lg font-semibold text-ink">Nenhum documento a verificar.</p>
          <p className="mt-2 max-w-md text-sm text-muted">Envie um PDF ou imagem de fatura recebida para convertê-lo em documento de compra.</p>
          <Button className="mt-6" disabled={uploading} onClick={() => fileRef.current?.click()} type="button">
            {uploading ? "Enviando..." : "Enviar primeiro documento"}
          </Button>
        </div>
      ) : (
        <section className="mt-6 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
          <div className="flex items-center justify-between gap-3 border-b border-line bg-slate-50 px-5 py-3">
            <h3 className="text-sm font-semibold text-ink">Documentos recebidos</h3>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold tabular-nums text-slate-600">{initialItems.length}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-line text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-2.5">Arquivo</th>
                  <th className="px-5 py-2.5">Recebido em</th>
                  <th className="px-5 py-2.5">Status</th>
                  <th className="px-5 py-2.5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {initialItems.map((item) => {
                  const meta = statusMeta[item.status] ?? { label: item.status, badge: "bg-slate-100 text-slate-600 ring-slate-200" };
                  const pending = item.status === "to_verify";
                  return (
                    <tr className="border-b border-line last:border-b-0" key={item.id}>
                      <td className="px-5 py-2.5 font-medium text-ink">{item.original_filename || "—"}</td>
                      <td className="px-5 py-2.5 tabular-nums text-slate-600">{item.created_at.slice(0, 10)}</td>
                      <td className="px-5 py-2.5">
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${meta.badge}`}>{meta.label}</span>
                      </td>
                      <td className="px-5 py-2.5">
                        <div className="flex flex-wrap justify-end gap-1.5">
                          <button className="rounded-lg px-2 py-1 text-xs font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-200 transition hover:bg-indigo-50" onClick={() => void openAttachment(item)} type="button">
                            Ver anexo
                          </button>
                          {pending ? (
                            <>
                              <button
                                className="rounded-lg px-2 py-1 text-xs font-semibold text-sky-700 ring-1 ring-inset ring-sky-200 transition hover:bg-sky-50 disabled:opacity-60"
                                disabled={busyId === item.id}
                                onClick={() => void convertToInvoice(item)}
                                type="button"
                              >
                                Converter em fatura
                              </button>
                              <button
                                className="rounded-lg px-2 py-1 text-xs font-semibold text-rose-600 ring-1 ring-inset ring-rose-200 transition hover:bg-rose-50 disabled:opacity-60"
                                disabled={busyId === item.id}
                                onClick={() => void reject(item)}
                                type="button"
                              >
                                Rejeitar
                              </button>
                            </>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
