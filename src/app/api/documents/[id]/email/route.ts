import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { generateAndStorePdf } from "@/lib/pdf";

export const runtime = "nodejs";

const emailSchema = z.object({
  body: z.string().trim().min(1),
  subject: z.string().trim().min(1),
  to: z.string().trim().email()
});

function base64FromArrayBuffer(buffer: ArrayBuffer) {
  return Buffer.from(buffer).toString("base64");
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const parsed = emailSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Payload de email inválido." }, { status: 400 });
  }

  const { data: document, error: documentError } = await supabase
    .from("documents")
    .select("id, user_id, numero, pdf_path")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .single();

  if (documentError || !document) {
    return NextResponse.json({ error: "Documento não encontrado." }, { status: 404 });
  }

  const { error: rateError } = await supabase.rpc("check_email_rate_limit");
  if (rateError) {
    return NextResponse.json({ error: rateError.message }, { status: 429 });
  }

  let pdfPath = document.pdf_path as string | null;
  if (!pdfPath) {
    const generated = await generateAndStorePdf(supabase, params.id);
    pdfPath = generated.path;
  }

  const { data: file, error: downloadError } = await supabase.storage
    .from("documents")
    .download(pdfPath);

  if (downloadError || !file) {
    return NextResponse.json({ error: "Não foi possível anexar o PDF." }, { status: 500 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "RESEND_API_KEY não configurada." }, { status: 500 });
  }

  const emailPayload = {
    attachments: [
      {
        content: base64FromArrayBuffer(await file.arrayBuffer()),
        filename: `${document.numero ?? "document"}.pdf`
      }
    ],
    from: "ProFacture <onboarding@resend.dev>",
    html: parsed.data.body.replaceAll("\n", "<br />"),
    subject: parsed.data.subject,
    text: parsed.data.body,
    to: parsed.data.to
  };

  const response = await fetch("https://api.resend.com/emails", {
    body: JSON.stringify(emailPayload),
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    method: "POST"
  });

  if (!response.ok) {
    return NextResponse.json({ error: "Não foi possível enviar o email." }, { status: 502 });
  }

  const { error: logError } = await supabase.rpc("log_email_send", {
    p_document_id: params.id,
    p_subject: parsed.data.subject,
    p_to_email: parsed.data.to
  });

  if (logError) {
    return NextResponse.json({ error: logError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
