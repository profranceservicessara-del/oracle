import { NextResponse, type NextRequest } from "next/server";
import { renderHtmlToPdf } from "@/lib/pdf";
import { createClient } from "@/lib/supabase/server";
import type { ContractTemplate, Profile } from "@/lib/types";

export const runtime = "nodejs";

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Gera PDF de um modelo de contrato. Substitui placeholders com dados do perfil
// (+ cliente opcional). Template e perfil são RLS-scoped ao usuário.
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { data: template } = await supabase.from("contract_templates").select("*").eq("id", params.id).maybeSingle();
  if (!template) {
    return NextResponse.json({ error: "Modelo não encontrado." }, { status: 404 });
  }
  const tpl = template as ContractTemplate;

  const { data: profileData } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  const profile = profileData as Profile | null;

  const empresa = [profile?.prenom, profile?.nome].filter(Boolean).join(" ") || "—";
  const endereco = [profile?.adresse_rue, [profile?.adresse_cp, profile?.adresse_ville].filter(Boolean).join(" ")]
    .filter(Boolean)
    .join(", ");
  const today = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });

  // Cliente opcional (nome livre via ?client=), fallback vazio.
  const cliente = request.nextUrl.searchParams.get("client")?.trim() || "________________";

  const values: Record<string, string> = {
    "{{empresa}}": empresa,
    "{{siret}}": profile?.siret ?? "________________",
    "{{endereco}}": endereco || "________________",
    "{{cliente}}": cliente,
    "{{data}}": today
  };

  let body = tpl.body || "";
  for (const [key, value] of Object.entries(values)) {
    body = body.split(key).join(value);
  }

  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
    * { box-sizing: border-box; }
    body { font-family: Georgia, "Times New Roman", serif; color: #1a1a1a; margin: 0; padding: 48px 56px; line-height: 1.6; font-size: 12pt; }
    h1 { font-size: 18pt; margin: 0 0 4px; }
    .meta { color: #666; font-size: 9pt; margin-bottom: 28px; border-bottom: 1px solid #ddd; padding-bottom: 16px; }
    .body { white-space: pre-wrap; }
    .foot { margin-top: 40px; color: #888; font-size: 8pt; }
  </style></head><body>
    <h1>${esc(tpl.title)}</h1>
    <div class="meta">${esc(empresa)}${profile?.siret ? " · SIRET " + esc(profile.siret) : ""}${endereco ? " · " + esc(endereco) : ""}<br>Gerado em ${esc(today)}</div>
    <div class="body">${esc(body)}</div>
    <div class="foot">Documento gerado pelo Oracle. Modelo indicativo — revise a validade jurídica.</div>
  </body></html>`;

  try {
    const pdf = await renderHtmlToPdf(html);
    const filename = `${tpl.title.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 60) || "contrato"}.pdf`;
    const disposition = request.nextUrl.searchParams.get("download") === "1" ? "attachment" : "inline";
    return new NextResponse(Buffer.from(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${disposition}; filename="${filename}"`
      }
    });
  } catch {
    return NextResponse.json({ error: "Não foi possível gerar o PDF." }, { status: 500 });
  }
}
