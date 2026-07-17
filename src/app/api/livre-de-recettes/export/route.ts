import { NextRequest, NextResponse } from "next/server";
import { categoryLabel, periodOptions, sumCategoryTotals } from "@/lib/accounting";
import { csvResponse, fetchRevenueBookRows } from "@/lib/accounting-data";
import { renderHtmlToPdf } from "@/lib/pdf";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const euroFormatter = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR"
});

function escapeHtml(value: string | number) {
  return String(value)
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
  const year = Number(searchParams.get("year") ?? new Date().getFullYear());
  const periodicite = searchParams.get("periodicite") === "mensal" ? "mensal" : "trimestral";
  const period = searchParams.get("period") ?? "1";
  const selectedPeriod =
    periodOptions(year, periodicite).find((option) => option.value === period) ??
    periodOptions(year, periodicite)[0];

  // Livro = derivadas de faturas + entradas MANUAIS (registro precisa bater
  // com o que a tela mostra).
  const [derived, manualRes] = await Promise.all([
    fetchRevenueBookRows(supabase, { end: selectedPeriod.end, start: selectedPeriod.start }),
    supabase
      .from("manual_receipts")
      .select("id, client_name, reference, date_encaissement, categorie, moyen, montant")
      .gte("date_encaissement", selectedPeriod.start)
      .lte("date_encaissement", selectedPeriod.end)
  ]);
  const manualRows = ((manualRes.data ?? []) as Array<{
    id: string;
    client_name: string | null;
    reference: string | null;
    date_encaissement: string;
    categorie: "vente" | "service_bic" | "service_bnc";
    moyen: string;
    montant: number;
  }>).map((m) => ({
    id: `manual-${m.id}`,
    date: m.date_encaissement,
    documentId: "",
    numero: m.reference ?? "Manuel",
    clientName: m.client_name ?? "—",
    category: m.categorie,
    montant: Number(m.montant) || 0,
    moyen: m.moyen
  }));
  const rows = [...derived, ...manualRows].sort((a, b) => a.date.localeCompare(b.date));
  const totals = sumCategoryTotals(rows);
  const format = searchParams.get("format") ?? "csv";

  if (format === "csv") {
    return csvResponse(`livre-de-recettes-${year}-${period}.csv`, [
      ["date", "facture", "client", "nature", "montant", "moyen_de_paiement"],
      ...rows.map((row) => [
        row.date,
        row.numero,
        row.clientName,
        categoryLabel(row.category),
        String(row.montant),
        row.moyen
      ])
    ]);
  }

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
      .totals { display: grid; gap: 8px; grid-template-columns: repeat(3, 1fr); margin-top: 18px; }
      .box { border: 1px solid #d8dee4; border-radius: 6px; padding: 10px; }
    </style>
  </head>
  <body>
    <h1>Livre de recettes</h1>
    <p>Période: ${escapeHtml(selectedPeriod.label)} ${escapeHtml(year)}</p>
    <section class="totals">
      <div class="box">Vente<br><strong>${escapeHtml(euroFormatter.format(totals.vente))}</strong></div>
      <div class="box">Service BIC<br><strong>${escapeHtml(euroFormatter.format(totals.service_bic))}</strong></div>
      <div class="box">Service BNC<br><strong>${escapeHtml(euroFormatter.format(totals.service_bnc))}</strong></div>
    </section>
    <table>
      <thead>
        <tr><th>Date</th><th>Facture</th><th>Client</th><th>Nature</th><th class="right">Montant</th><th>Moyen de paiement</th></tr>
      </thead>
      <tbody>
        ${rows
          .map(
            (row) =>
              `<tr><td>${escapeHtml(row.date)}</td><td>${escapeHtml(row.numero)}</td><td>${escapeHtml(row.clientName)}</td><td>${escapeHtml(categoryLabel(row.category))}</td><td class="right">${escapeHtml(euroFormatter.format(row.montant))}</td><td>${escapeHtml(row.moyen)}</td></tr>`
          )
          .join("")}
      </tbody>
    </table>
  </body>
</html>`;

  const pdf = await renderHtmlToPdf(html);
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Disposition": `attachment; filename="livre-de-recettes-${year}-${period}.pdf"`,
      "Content-Type": "application/pdf"
    }
  });
}
