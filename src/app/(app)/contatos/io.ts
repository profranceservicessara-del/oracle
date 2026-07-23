// Helpers de import/export do módulo Contatos (client-safe, sem dependências).

// Detecta separador (; ou ,) pela primeira linha não vazia.
function detectSep(text: string): string {
  const first = text.split(/\r?\n/).find((l) => l.trim() !== "") ?? "";
  return (first.match(/;/g)?.length ?? 0) > (first.match(/,/g)?.length ?? 0) ? ";" : ",";
}

// Parser CSV com aspas (campos podem conter separador e quebras escapadas).
export function parseCsv(text: string): string[][] {
  const sep = detectSep(text);
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === sep) {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (c !== "\r") {
      field += c;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((v) => v.trim() !== ""));
}

function norm(h: string): string {
  return h
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

// Aliases de cabeçalho aceitos na importação (pt/fr/en) por campo.
export const THIRD_ALIASES: Record<string, string[]> = {
  name: ["nome", "name", "nom", "raison sociale", "empresa"],
  third_type: ["tipo", "type"],
  email: ["email", "e-mail", "courriel"],
  phone: ["telefone", "phone", "tel", "telephone"],
  mobile: ["movel", "mobile", "celular", "portable"],
  website: ["site", "website", "web", "url"],
  business_sector: ["setor", "setor empresarial", "secteur", "sector"],
  siret: ["siret"],
  siren: ["siren"],
  legal_status: ["situacao juridica", "forma juridica", "statut juridique", "legal status"],
  reference: ["referencia", "reference", "ref"]
};

export const PERSON_ALIASES: Record<string, string[]> = {
  first_name: ["primeiro nome", "prenom", "first name", "nome"],
  last_name: ["sobrenome", "nome", "last name", "nom"],
  role: ["funcao", "cargo", "role", "fonction"],
  email: ["email", "e-mail", "courriel"],
  phone: ["telefone", "phone", "tel", "telephone"],
  mobile: ["movel", "mobile", "celular", "portable"]
};

// Casa cada cabeçalho do arquivo a um campo conhecido (ou null se não bate).
export function mapHeaders(headers: string[], aliases: Record<string, string[]>): (string | null)[] {
  const lookup = new Map<string, string>();
  for (const [field, names] of Object.entries(aliases)) {
    for (const n of names) lookup.set(norm(n), field);
  }
  const used = new Set<string>();
  return headers.map((h) => {
    const field = lookup.get(norm(h));
    // "nome" é alias de dois campos (name/last_name e first_name); evita colidir.
    if (field && !used.has(field)) {
      used.add(field);
      return field;
    }
    return null;
  });
}

const TYPE_MAP: Record<string, string> = {
  cliente: "client",
  client: "client",
  perspectiva: "prospect",
  prospect: "prospect",
  potencial: "prospect",
  fornecedor: "supplier",
  supplier: "supplier",
  fournisseur: "supplier"
};

export function normalizeThirdType(raw: string): string {
  return TYPE_MAP[norm(raw)] ?? "client";
}

// Converte o CSV em registros por campo conhecido. Descarta cabeçalho.
export function recordsFromCsv(text: string, aliases: Record<string, string[]>): Record<string, string>[] {
  const rows = parseCsv(text);
  if (rows.length < 2) return [];
  const fields = mapHeaders(rows[0], aliases);
  return rows.slice(1).map((cells) => {
    const rec: Record<string, string> = {};
    fields.forEach((f, i) => {
      if (f) rec[f] = (cells[i] ?? "").trim();
    });
    return rec;
  });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
