import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateAndStorePdf } from "@/lib/pdf";

export const runtime = "nodejs";

async function getOwnedDocument(supabase: ReturnType<typeof createClient>, documentId: string) {
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: NextResponse.json({ error: "Não autenticado." }, { status: 401 }) };
  }

  const { data: document, error } = await supabase
    .from("documents")
    .select("id, user_id, pdf_path, numero")
    .eq("id", documentId)
    .eq("user_id", user.id)
    .single();

  if (error || !document) {
    return { error: NextResponse.json({ error: "Documento não encontrado." }, { status: 404 }) };
  }

  return { document };
}

export async function POST(_request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const owned = await getOwnedDocument(supabase, params.id);

  if (owned.error) {
    return owned.error;
  }

  const { error: rateError } = await supabase.rpc("check_pdf_rate_limit");
  if (rateError) {
    return NextResponse.json({ error: rateError.message }, { status: 429 });
  }

  try {
    const result = await generateAndStorePdf(supabase, params.id);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Não foi possível gerar o PDF." },
      { status: 500 }
    );
  }
}

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const owned = await getOwnedDocument(supabase, params.id);

  if (owned.error) {
    return owned.error;
  }

  if (!owned.document.pdf_path) {
    return NextResponse.json({ error: "PDF ainda não gerado." }, { status: 404 });
  }

  const { data, error } = await supabase.storage
    .from("documents")
    .createSignedUrl(owned.document.pdf_path, 900);

  if (error || !data) {
    return NextResponse.json({ error: "Não foi possível criar o link de download." }, { status: 500 });
  }

  return NextResponse.json({
    expiresIn: 900,
    signedUrl: data.signedUrl
  });
}
