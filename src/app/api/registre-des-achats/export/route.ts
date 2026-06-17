import { NextRequest, NextResponse } from "next/server";
import { csvResponse } from "@/lib/accounting-data";
import { renderHtmlToPdf } from "@/lib/pdf";
import { createClient } from "@/lib/supabase/server";
import type { Purchase } from "@/lib/types";

export const runtime = "nodejs";

const euroFormatter = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR"
});

function escapeHtml(value: string | number | null | undefined) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export async function GET(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const year = searchParams.get("year") ?? String(new Date().getFullYear());
  const month = searchParams.get("month") ?? "todos";
  const start = `${year}-${month === "todos" ? "01" : month}-01`;
  const endDate =
    month === "todos"
      ? new Date(Number(year), 12, 0)
      : new Date(Number(year), Number(month), 0);
  const end = endDate.toISOString().slice(0, 10);

  const { data } = await supabase
    .from("purchases")
    .select("*")
    .gte("date_achat", start)
    .lte("date_achat", end)
    .order("date_achat", { ascending: true });

  const purchases = (data ?? []) as Purchase[];
  const format = searchParams.get("format") ?? "csv";

  if (format === "csv") {
    return csvResponse(`registre-des-achats-${year}-${month}.csv`, [
      ["date", "fournisseur", "designation", "montant", "moyen", "reference_piece"],
      ...purchases.map((purchase) => [
        purchase.date_achat,
        purchase.fournisseur,
        purchase.designation,
        String(purchase.montant),
        purchase.moyen ?? "",
        purchase.reference_piece ?? ""
      ])
    ]);
  }

  const total = purchases.reduce((sum, purchase) => sum + Number(purchase.montant), 0);
  const html = `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <style>
      body { color: #172026; font-family: Arial, sans-serif; font-size: 12px; padding: 32px; }
      h1 { color: #0f766e; font-size: 24px; margin: 0 0 8px; }
      table { border-collapse: collapse; margin-top: 18px; width: 100%; }
      th, td { border-bottom: 1px solid #d8dee4; padding: 8px; text-align: left; }
      th { background: #f3f6f8; font-size: 10px; text-transform: uppercase; }
      .right { text-align: right; }
    </style>
  </head>
  <body>
    <h1>Registre des achats</h1>
    <p>Période: ${escapeHtml(year)} ${month === "todos" ? "" : escapeHtml(month)}</p>
    <p>Total: <strong>${escapeHtml(euroFormatter.format(total))}</strong></p>
    <table>
      <thead>
        <tr><th>Date</th><th>Fournisseur</th><th>Désignation</th><th class="right">Montant</th><th>Moyen</th><th>Référence</th></tr>
      </thead>
      <tbody>
        ${purchases
          .map(
            (purchase) =>
              `<tr><td>${escapeHtml(purchase.date_achat)}</td><td>${escapeHtml(purchase.fournisseur)}</td><td>${escapeHtml(purchase.designation)}</td><td class="right">${escapeHtml(euroFormatter.format(Number(purchase.montant)))}</td><td>${escapeHtml(purchase.moyen)}</td><td>${escapeHtml(purchase.reference_piece)}</td></tr>`
          )
          .join("")}
      </tbody>
    </table>
  </body>
</html>`;

  const pdf = await renderHtmlToPdf(html);
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Disposition": `attachment; filename="registre-des-achats-${year}-${month}.pdf"`,
      "Content-Type": "application/pdf"
    }
  });
}
