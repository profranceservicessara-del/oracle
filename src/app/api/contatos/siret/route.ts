import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

// Busca no diretório oficial de empresas (recherche-entreprises.api.gouv.fr,
// INSEE, gratuita e sem chave). Proxy server-side: evita CORS e normaliza o
// retorno. Só busca (leitura pública), não grava nada.
type Hit = {
  siren: string;
  siret: string;
  name: string;
  naf_code: string;
  addr_line1: string;
  addr_zip_code: string;
  addr_city: string;
};

function str(v: unknown): string {
  return v == null ? "" : String(v);
}

export async function GET(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
  }

  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 3) {
    return NextResponse.json({ results: [] });
  }

  const url = `https://recherche-entreprises.api.gouv.fr/search?q=${encodeURIComponent(q)}&page=1&per_page=8`;
  let data: { results?: Array<Record<string, unknown>> };
  try {
    const res = await fetch(url, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(8000) });
    if (!res.ok) {
      return NextResponse.json({ error: "Diretório indisponível." }, { status: 502 });
    }
    data = await res.json();
  } catch {
    return NextResponse.json({ error: "Diretório indisponível." }, { status: 502 });
  }

  const results: Hit[] = (data.results ?? []).map((r) => {
    const siege = (r.siege ?? {}) as Record<string, unknown>;
    const line1 = [siege.numero_voie, siege.type_voie, siege.libelle_voie]
      .map(str)
      .filter(Boolean)
      .join(" ");
    return {
      siren: str(r.siren),
      siret: str(siege.siret),
      name: str(r.nom_complet || r.nom_raison_sociale),
      naf_code: str(r.activite_principale),
      addr_line1: line1,
      addr_zip_code: str(siege.code_postal),
      addr_city: str(siege.libelle_commune)
    };
  });

  return NextResponse.json({ results });
}
