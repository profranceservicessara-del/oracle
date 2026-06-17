import { NextResponse } from "next/server";
import { createZip } from "@/lib/server/zip";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

async function tableData(supabase: ReturnType<typeof createClient>, table: string, userId: string) {
  const column = table === "profiles" ? "id" : "user_id";
  const { data, error } = await supabase.from(table).select("*").eq(column, userId);

  if (error) {
    throw new Error(`${table}: ${error.message}`);
  }

  return data ?? [];
}

export async function POST() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Sessão expirada." }, { status: 401 });
  }

  const { error: rateError } = await supabase.rpc("check_rgpd_export_rate_limit");
  if (rateError) {
    return NextResponse.json({ error: rateError.message }, { status: 429 });
  }

  const tables = [
    "profiles",
    "clients",
    "catalog_items",
    "documents",
    "document_lines",
    "payments",
    "purchases",
    "sequences",
    "audit_log"
  ];

  try {
    const entries = await Promise.all(
      tables.map(async (table) => [table, await tableData(supabase, table, user.id)] as const)
    );
    const data = Object.fromEntries(entries);
    const pdfPaths = ((data.documents as Array<{ pdf_path: string | null }>) ?? [])
      .map((document) => document.pdf_path)
      .filter(Boolean);
    const payload = {
      exported_at: new Date().toISOString(),
      pdf_paths: pdfPaths,
      tables: data
    };
    const zip = createZip([
      {
        name: "profacture-export.json",
        content: JSON.stringify(payload, null, 2)
      },
      {
        name: "pdf-paths.json",
        content: JSON.stringify(pdfPaths, null, 2)
      }
    ]);
    const path = `${user.id}/rgpd-export-${Date.now()}.zip`;
    const { error: uploadError } = await supabase.storage
      .from("rgpd-exports")
      .upload(path, zip, {
        contentType: "application/zip",
        upsert: true
      });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { data: signed, error: signedError } = await supabase.storage
      .from("rgpd-exports")
      .createSignedUrl(path, 900);

    if (signedError || !signed?.signedUrl) {
      return NextResponse.json({ error: "Não foi possível gerar o link de download." }, { status: 500 });
    }

    return NextResponse.json({ expiresIn: 900, signedUrl: signed.signedUrl });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Não foi possível exportar os dados." },
      { status: 500 }
    );
  }
}
