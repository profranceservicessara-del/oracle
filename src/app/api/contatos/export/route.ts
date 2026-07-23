import { NextRequest, NextResponse } from "next/server";
import { csvResponse } from "@/lib/accounting-data";
import { renderHtmlToPdf } from "@/lib/pdf";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type Column = { key: string; label: string };

function escapeHtml(value: string) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

// Recebe as linhas já filtradas do client e devolve CSV ou PDF. Só formata o
// que o próprio usuário mandou (nada é lido do banco), atrás de auth.
export async function POST(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
  }

  let body: { format?: string; filename?: string; title?: string; columns?: Column[]; rows?: Record<string, unknown>[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps invalide." }, { status: 400 });
  }

  const columns = Array.isArray(body.columns) ? body.columns.slice(0, 40) : [];
  const rows = Array.isArray(body.rows) ? body.rows.slice(0, 5000) : [];
  const title = typeof body.title === "string" ? body.title.slice(0, 120) : "Contatos";
  const filename = (typeof body.filename === "string" ? body.filename : "contatos").replace(/[^a-zA-Z0-9._-]/g, "");
  const format = body.format === "pdf" ? "pdf" : "csv";
  if (columns.length === 0) {
    return NextResponse.json({ error: "Nenhuma coluna." }, { status: 400 });
  }

  const cell = (row: Record<string, unknown>, key: string) => {
    const v = row[key];
    return v == null ? "" : String(v);
  };

  if (format === "csv") {
    return csvResponse(`${filename}.csv`, [
      columns.map((c) => c.label),
      ...rows.map((row) => columns.map((c) => cell(row, c.key)))
    ]);
  }

  const generatedAt = new Date().toLocaleDateString("fr-FR");
  const html = `<!doctype html><html lang="pt"><head><meta charset="utf-8" /><style>
    * { box-sizing: border-box; }
    body { font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; color: #0f172a; margin: 28px; }
    h1 { font-size: 18px; margin: 0 0 2px; color: #1B2A4A; }
    .meta { font-size: 11px; color: #64748b; margin-bottom: 16px; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    thead th { text-align: left; text-transform: uppercase; letter-spacing: .04em; font-size: 9px; color: #64748b; border-bottom: 1.5px solid #1B2A4A; padding: 6px 8px; }
    tbody td { padding: 6px 8px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
    tbody tr:nth-child(even) { background: #f8fafc; }
  </style></head><body>
    <h1>${escapeHtml(title)}</h1>
    <p class="meta">${rows.length} registro${rows.length === 1 ? "" : "s"} · gerado em ${generatedAt}</p>
    <table>
      <thead><tr>${columns.map((c) => `<th>${escapeHtml(c.label)}</th>`).join("")}</tr></thead>
      <tbody>
        ${rows.map((row) => `<tr>${columns.map((c) => `<td>${escapeHtml(cell(row, c.key))}</td>`).join("")}</tr>`).join("")}
      </tbody>
    </table>
  </body></html>`;

  const pdf = await renderHtmlToPdf(html);
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Disposition": `attachment; filename="${filename}.pdf"`,
      "Content-Type": "application/pdf"
    }
  });
}
