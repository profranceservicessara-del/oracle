"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { generateAndStorePdf } from "@/lib/pdf";
import { paymentSchema } from "@/lib/validation";

type ActionResult = {
  error?: string;
  documentId?: string;
  pdfPath?: string;
};

function errorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Não foi possível concluir a operação.";
}

export async function emitDocumentAction(documentId: string): Promise<ActionResult> {
  const supabase = createClient();

  const { error: rateError } = await supabase.rpc("check_pdf_rate_limit");
  if (rateError) {
    return { error: rateError.message };
  }

  const { data, error } = await supabase.rpc("emit_document", { doc_id: documentId });

  if (error || !data) {
    return {
      error:
        error?.message ??
        "Não foi possível emitir. Verifique se o perfil fiscal está completo e se o documento é um rascunho."
    };
  }

  try {
    const { path } = await generateAndStorePdf(supabase, documentId);
    revalidatePath("/documentos");
    revalidatePath(`/documentos/${documentId}`);
    return { documentId, pdfPath: path };
  } catch (pdfError) {
    return { documentId, error: `Documento emitido, mas o PDF não foi gerado: ${errorMessage(pdfError)}` };
  }
}

export async function convertDevisToFactureAction(devisId: string): Promise<ActionResult> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("convert_devis_to_facture", { p_devis_id: devisId });

  if (error || !data) {
    return { error: error?.message ?? "Não foi possível converter o devis." };
  }

  revalidatePath("/documentos");
  return { documentId: data as string };
}

export async function createAvoirAction(factureId: string): Promise<ActionResult> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("create_avoir", { facture_id: factureId });

  if (error || !data) {
    return { error: error?.message ?? "Não foi possível criar o avoir." };
  }

  revalidatePath("/documentos");
  return { documentId: data as string };
}

export async function updateDocumentStatusAction(
  documentId: string,
  status: "accepted" | "refused" | "cancelled"
): Promise<ActionResult> {
  const supabase = createClient();
  const { error } = await supabase.from("documents").update({ status }).eq("id", documentId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/documentos");
  revalidatePath(`/documentos/${documentId}`);
  return { documentId };
}

export async function registerPaymentAction(
  documentId: string,
  formData: unknown
): Promise<{ error?: string; paymentId?: string }> {
  const parsed = paymentSchema.safeParse(formData);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados de pagamento inválidos." };
  }

  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Sessão expirada." };
  }

  const [{ data: document }, { data: existingPayments }] = await Promise.all([
    supabase
      .from("documents")
      .select("id,user_id,type,status,total_ttc")
      .eq("id", documentId)
      .single(),
    supabase.from("payments").select("montant").eq("document_id", documentId)
  ]);

  if (!document || document.user_id !== user.id || document.type !== "facture") {
    return { error: "Facture não encontrada." };
  }

  if (!["sent", "partial", "paid"].includes(document.status)) {
    return { error: "Só é possível registrar pagamento em uma facture emitida." };
  }

  const paidTotal = (existingPayments ?? []).reduce(
    (sum, payment) => sum + Number(payment.montant),
    0
  );
  const nextTotal = paidTotal + parsed.data.montant;

  if (nextTotal > Number(document.total_ttc)) {
    return { error: "O total dos pagamentos não pode ultrapassar o total TTC da facture." };
  }

  const { data, error } = await supabase
    .from("payments")
    .insert({
      ...parsed.data,
      document_id: documentId,
      user_id: user.id
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: error?.message ?? "Não foi possível registrar o pagamento." };
  }

  revalidatePath("/documentos");
  revalidatePath(`/documentos/${documentId}`);
  revalidatePath("/livre-de-recettes");
  revalidatePath("/dashboard");
  return { paymentId: data.id as string };
}
