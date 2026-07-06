"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  convertDevisToFactureAction,
  createAvoirAction,
  updateDocumentStatusAction
} from "@/app/(app)/documentos/actions";
import { Button } from "@/components/ui/button";
import { FormModal } from "@/components/ui/form-modal";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import type { Client, Document } from "@/lib/types";

type DocumentActionsProps = {
  client: Client | null;
  document: Document;
};

function defaultSubject(document: Document) {
  return `${document.type === "devis" ? "Votre devis" : document.type === "avoir" ? "Votre avoir" : "Votre facture"} ${document.numero ?? ""}`.trim();
}

function defaultBody(document: Document) {
  return `Bonjour,\n\nVeuillez trouver ci-joint ${document.type === "devis" ? "votre devis" : document.type === "avoir" ? "votre avoir" : "votre facture"} ${document.numero ?? ""}.\n\nCordialement.`;
}

export function DocumentActions({ client, document }: DocumentActionsProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [isEmailOpen, setIsEmailOpen] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [emailTo, setEmailTo] = useState(client?.email ?? "");
  const [emailSubject, setEmailSubject] = useState(() => defaultSubject(document));
  const [emailBody, setEmailBody] = useState(() => defaultBody(document));

  const canMarkDevis = document.type === "devis" && document.status === "sent";
  const canConvert = document.type === "devis" && document.status === "accepted";
  const canCreateAvoir = document.type === "facture" && document.status !== "draft";
  const canCancel = document.type === "facture" && document.status === "sent";
  const canEmail = document.status !== "draft";
  const canDownload = document.status !== "draft";

  async function openSignedPdf() {
    let response = await fetch(`/api/documents/${document.id}/pdf`);
    let payload = (await response.json()) as { error?: string; signedUrl?: string };

    // PDF ainda não gerado (ex.: falha na emissão): gera sob demanda e tenta de novo.
    if (response.status === 404) {
      const gen = await fetch(`/api/documents/${document.id}/pdf`, { method: "POST" });
      if (!gen.ok) {
        const genPayload = (await gen.json().catch(() => ({}))) as { error?: string };
        showToast(genPayload.error ?? "Não foi possível gerar o PDF.", "error");
        return;
      }
      response = await fetch(`/api/documents/${document.id}/pdf`);
      payload = (await response.json()) as { error?: string; signedUrl?: string };
    }

    if (!response.ok || !payload.signedUrl) {
      showToast(payload.error ?? "Não foi possível abrir o PDF.", "error");
      return;
    }

    window.open(payload.signedUrl, "_blank", "noopener,noreferrer");
  }

  async function sendEmail() {
    setIsBusy(true);
    const response = await fetch(`/api/documents/${document.id}/email`, {
      body: JSON.stringify({ body: emailBody, subject: emailSubject, to: emailTo }),
      headers: { "Content-Type": "application/json" },
      method: "POST"
    });
    const payload = (await response.json()) as { error?: string };
    setIsBusy(false);

    if (!response.ok) {
      showToast(payload.error ?? "Não foi possível enviar o email.", "error");
      return;
    }

    showToast("Email enviado.", "success");
    setIsEmailOpen(false);
  }

  async function runAction(action: () => Promise<{ error?: string; documentId?: string }>, success: string) {
    setIsBusy(true);
    const result = await action();
    setIsBusy(false);

    if (result.error) {
      showToast(result.error, "error");
      return;
    }

    showToast(success, "success");
    if (result.documentId && result.documentId !== document.id) {
      router.push(`/documentos/${result.documentId}/editar`);
      return;
    }

    router.refresh();
  }

  const buttons = (
    <>
        {canDownload ? (
          <Button onClick={() => void openSignedPdf()} type="button" variant="secondary">
            Baixar PDF
          </Button>
        ) : null}
        {canEmail ? (
          <Button onClick={() => setIsEmailOpen(true)} type="button" variant="secondary">
            Enviar email
          </Button>
        ) : null}
        {canMarkDevis ? (
          <>
            <Button
              disabled={isBusy}
              onClick={() =>
                void runAction(
                  () => updateDocumentStatusAction(document.id, "accepted"),
                  "Devis marcado como aceito."
                )
              }
              type="button"
              variant="secondary"
            >
              Aceitar devis
            </Button>
            <Button
              disabled={isBusy}
              onClick={() =>
                void runAction(
                  () => updateDocumentStatusAction(document.id, "refused"),
                  "Devis marcado como recusado."
                )
              }
              type="button"
              variant="secondary"
            >
              Recusar devis
            </Button>
          </>
        ) : null}
        {canConvert ? (
          <Button
            disabled={isBusy}
            onClick={() =>
              void runAction(() => convertDevisToFactureAction(document.id), "Facture criada em rascunho.")
            }
            type="button"
          >
            Converter em facture
          </Button>
        ) : null}
        {canCreateAvoir ? (
          <Button
            disabled={isBusy}
            onClick={() =>
              void runAction(() => createAvoirAction(document.id), "Avoir criado em rascunho.")
            }
            type="button"
            variant="secondary"
          >
            Criar um avoir
          </Button>
        ) : null}
        {canCancel ? (
          <Button
            disabled={isBusy}
            onClick={() =>
              void runAction(
                () => updateDocumentStatusAction(document.id, "cancelled"),
                "Facture cancelada."
              )
            }
            type="button"
            variant="secondary"
          >
            Cancelar facture
          </Button>
        ) : null}
    </>
  );

  return (
    <>
      <div className="flex flex-wrap justify-end gap-2">{buttons}</div>
      <FormModal
        description="Revise o assunto e a mensagem antes de enviar. O PDF será anexado automaticamente."
        isOpen={isEmailOpen}
        onClose={() => setIsEmailOpen(false)}
        title="Enviar por email"
      >
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            void sendEmail();
          }}
        >
          <label className="text-sm font-medium text-ink">
            Destinatário
            <Input
              className="mt-2"
              onChange={(event) => setEmailTo(event.target.value)}
              type="email"
              value={emailTo}
            />
          </label>
          <label className="text-sm font-medium text-ink">
            Assunto
            <Input
              className="mt-2"
              onChange={(event) => setEmailSubject(event.target.value)}
              value={emailSubject}
            />
          </label>
          <label className="text-sm font-medium text-ink">
            Mensagem
            <Textarea
              className="mt-2"
              onChange={(event) => setEmailBody(event.target.value)}
              value={emailBody}
            />
          </label>
          <div className="flex justify-end gap-2">
            <Button onClick={() => setIsEmailOpen(false)} type="button" variant="secondary">
              Cancelar
            </Button>
            <Button disabled={isBusy} type="submit">
              {isBusy ? "Enviando..." : "Enviar"}
            </Button>
          </div>
        </form>
      </FormModal>
    </>
  );
}
