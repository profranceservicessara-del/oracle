import chromium from "@sparticuz/chromium";
import { fiscalConfig } from "@/config/fiscal";
import {
  calculateDocumentTotals,
  type EditorLine,
  tvaFranchiseMention
} from "@/lib/document-calculations";
import {
  categoryLabels,
  clientTypeLabels,
  documentTypeLabels,
  type Client,
  type Document,
  type DocumentLine,
  type PaymentMethod,
  type Profile
} from "@/lib/types";

const MOYEN_FR: Record<PaymentMethod, string> = {
  virement: "Virement bancaire",
  cheque: "Chèque",
  especes: "Espèces",
  cb: "Carte bancaire",
  stripe: "Paiement en ligne",
  autre: "Autre"
};

type SupabaseServerClient = {
  from: (table: string) => any;
  storage: {
    from: (bucket: string) => any;
  };
};

const euroFormatter = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR"
});

function escapeHtml(value: string | number | null | undefined) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "À compléter";
  }

  return new Intl.DateTimeFormat("fr-FR").format(new Date(`${value}T00:00:00`));
}

function toEditorLine(line: DocumentLine): EditorLine {
  return {
    id: line.id,
    designation: line.designation,
    description: line.description ?? "",
    quantite: line.quantite,
    prix_unitaire_ht: line.prix_unitaire_ht,
    taux_tva: line.taux_tva,
    categorie: line.categorie
  };
}

function fullClientName(client: Client | null) {
  if (!client) {
    return "Client à compléter";
  }

  return client.type === "professionnel" ? client.raison_sociale : client.nom;
}

function sellerName(profile: Profile | null) {
  return [profile?.prenom, profile?.nome].filter(Boolean).join(" ") || "Profil vendeur à compléter";
}

function renderDocumentHtml({
  client,
  document,
  factureOrigine,
  lines,
  logoSignedUrl,
  profile
}: {
  client: Client | null;
  document: Document;
  factureOrigine: Document | null;
  lines: DocumentLine[];
  logoSignedUrl: string | null;
  profile: Profile | null;
}) {
  const editorLines = lines.map(toEditorLine);
  const regimeTva = profile?.regime_tva ?? "franchise";
  const totals = calculateDocumentTotals(editorLines, regimeTva);
  const color = profile?.couleur_principale || "#0f766e";
  const isProfessionalClient = client?.type === "professionnel";
  const title = documentTypeLabels[document.type];
  const originalReference =
    document.type === "avoir" && factureOrigine?.numero
      ? `<p class="notice">Avoir sur facture ${escapeHtml(factureOrigine.numero)}</p>`
      : "";

  const rows = editorLines
    .map((line) => {
      const lineHt = line.quantite * line.prix_unitaire_ht;
      const lineTva = lineHt * (line.taux_tva / 100);
      return `
        <tr>
          <td>
            <strong>${escapeHtml(line.designation)}</strong>
            ${line.description ? `<p>${escapeHtml(line.description)}</p>` : ""}
          </td>
          <td>${escapeHtml(categoryLabels[line.categorie])}</td>
          <td class="right">${escapeHtml(line.quantite)}</td>
          <td class="right">${escapeHtml(euroFormatter.format(line.prix_unitaire_ht))}</td>
          ${regimeTva === "assujetti" ? `<td class="right">${escapeHtml(line.taux_tva)}%</td>` : ""}
          ${regimeTva === "assujetti" ? `<td class="right">${escapeHtml(euroFormatter.format(lineTva))}</td>` : ""}
          <td class="right">${escapeHtml(euroFormatter.format(lineHt))}</td>
        </tr>
      `;
    })
    .join("");

  return `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <style>
      @page { margin: 28px; size: A4; }
      body { color: #172033; font-family: Arial, sans-serif; font-size: 12px; line-height: 1.45; }
      .header { border-bottom: 3px solid ${escapeHtml(color)}; display: flex; justify-content: space-between; gap: 32px; padding-bottom: 22px; }
      .logo { max-height: 70px; max-width: 150px; object-fit: contain; }
      h1 { color: ${escapeHtml(color)}; font-size: 30px; margin: 0 0 8px; text-transform: uppercase; }
      h2 { font-size: 13px; letter-spacing: .03em; margin: 0 0 8px; text-transform: uppercase; }
      .muted { color: #667085; }
      .block { border: 1px solid #d8dee8; border-radius: 6px; padding: 14px; }
      .grid { display: grid; gap: 16px; grid-template-columns: 1fr 1fr; margin: 22px 0; }
      table { border-collapse: collapse; margin-top: 18px; width: 100%; }
      th { background: #f4f6f8; border-bottom: 1px solid #d8dee8; color: #667085; font-size: 10px; padding: 9px; text-align: left; text-transform: uppercase; }
      td { border-bottom: 1px solid #d8dee8; padding: 10px 9px; vertical-align: top; }
      td p { color: #667085; margin: 3px 0 0; }
      .right { text-align: right; }
      .totals { margin-left: auto; margin-top: 22px; width: 280px; }
      .totals div { display: flex; justify-content: space-between; padding: 5px 0; }
      .totals .grand { border-top: 2px solid #172033; font-size: 15px; font-weight: 700; margin-top: 4px; padding-top: 8px; }
      .legal { border-top: 1px solid #d8dee8; color: #475467; margin-top: 28px; padding-top: 14px; }
      .notice { background: #f0fdfa; border: 1px solid #99f6e4; border-radius: 6px; color: #115e59; padding: 10px 12px; }
    </style>
  </head>
  <body>
    <section class="header">
      <div>
        <h1>${escapeHtml(title)}</h1>
        <p><strong>Numéro:</strong> ${escapeHtml(document.numero)}</p>
        <p><strong>Date d'émission:</strong> ${escapeHtml(formatDate(document.date_emission))}</p>
        ${originalReference}
      </div>
      <div class="right">
        ${logoSignedUrl ? `<img alt="Logo" class="logo" src="${escapeHtml(logoSignedUrl)}" />` : ""}
        <p><strong>${escapeHtml(sellerName(profile))}</strong></p>
        <p>Entrepreneur Individuel</p>
        <p>${escapeHtml(profile?.adresse_rue || "Adresse à compléter")}</p>
        <p>${escapeHtml([profile?.adresse_cp, profile?.adresse_ville].filter(Boolean).join(" ") || "Code postal et ville à compléter")}</p>
        <p>SIRET: ${escapeHtml(profile?.siret || "À compléter")}</p>
        <p>Code APE: ${escapeHtml(profile?.code_ape || "À compléter")}</p>
      </div>
    </section>

    <section class="grid">
      <div class="block">
        <h2>Client</h2>
        <p><strong>${escapeHtml(fullClientName(client))}</strong></p>
        ${client ? `<p>${escapeHtml(clientTypeLabels[client.type])}</p>` : ""}
        <p>${escapeHtml(client?.adresse_rue || "Adresse à compléter")}</p>
        <p>${escapeHtml([client?.adresse_cp, client?.adresse_ville].filter(Boolean).join(" ") || "Code postal et ville à compléter")}</p>
        ${client?.type === "professionnel" ? `<p>SIREN: ${escapeHtml(client.siren || "À compléter")}</p>` : ""}
      </div>
      <div class="block">
        <h2>Mentions</h2>
        <p>Date de vente/prestation: ${escapeHtml(formatDate(document.date_prestation))}</p>
        ${
          document.type === "devis"
            ? `<p>Durée de validité: ${escapeHtml(document.validite_jours ?? 30)} jours</p>`
            : `<p>Date d'échéance du paiement: ${escapeHtml(formatDate(document.date_echeance))}</p>`
        }
        <p>Taux des pénalités de retard: ${escapeHtml(profile?.taux_penalites_retard ?? fiscalConfig.legalDocumentValues.defaultLatePenaltyRate)}%</p>
        ${
          isProfessionalClient
            ? `<p>Indemnité forfaitaire pour frais de recouvrement: ${escapeHtml(fiscalConfig.legalDocumentValues.professionalRecoveryFee)} €</p>`
            : ""
        }
        <p>Escompte pour paiement anticipé: néant</p>
      </div>
    </section>

    <table>
      <thead>
        <tr>
          <th>Désignation détaillée</th>
          <th>Catégorie</th>
          <th class="right">Quantité</th>
          <th class="right">Prix unitaire HT</th>
          ${regimeTva === "assujetti" ? '<th class="right">Taux TVA</th><th class="right">TVA</th>' : ""}
          <th class="right">Montant HT</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>

    <section class="totals">
      <div><span>Total HT</span><strong>${escapeHtml(euroFormatter.format(totals.totalHt))}</strong></div>
      <div><span>Total TVA</span><strong>${escapeHtml(euroFormatter.format(totals.totalTva))}</strong></div>
      <div class="grand"><span>Total TTC</span><span>${escapeHtml(euroFormatter.format(totals.totalTtc))}</span></div>
    </section>

    <section class="legal">
      <p>${escapeHtml(regimeTva === "franchise" ? tvaFranchiseMention : "TVA applicable selon les taux indiqués par ligne.")}</p>
      <p>Conditions de paiement: ${escapeHtml(document.conditions_paiement || "Paiement à réception de facture.")}</p>
      ${document.moyens_paiement && document.moyens_paiement.length > 0 ? `<p>Moyens de paiement acceptés: ${escapeHtml(document.moyens_paiement.map((method) => MOYEN_FR[method as PaymentMethod] ?? method).join(", "))}.</p>` : ""}
      ${document.acompte_pct ? `<p>Acompte de ${escapeHtml(document.acompte_pct)}% demandé à la commande${totals.totalTtc > 0 ? ` (${escapeHtml(euroFormatter.format((totals.totalTtc * Number(document.acompte_pct)) / 100))})` : ""}.</p>` : ""}
      ${document.notes_bas_page ? `<p>${escapeHtml(document.notes_bas_page)}</p>` : ""}
    </section>
  </body>
</html>`;
}

export async function renderHtmlToPdf(html: string) {
  const { chromium: playwrightChromium } = await import("playwright-core");
  // Produção (serverless/Linux): usa o Chromium do @sparticuz. Desenvolvimento
  // local (Mac/Windows): o binário do @sparticuz não roda, então usa o Chrome do
  // sistema (ou PDF_CHROMIUM_PATH). O caminho serverless permanece inalterado.
  const serverless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.AWS_EXECUTION_ENV);
  const browser = await playwrightChromium.launch(
    serverless
      ? { args: chromium.args, executablePath: await chromium.executablePath(), headless: true }
      : process.env.PDF_CHROMIUM_PATH
        ? { executablePath: process.env.PDF_CHROMIUM_PATH, headless: true }
        : { channel: "chrome", headless: true }
  );

  try {
    const page = await browser.newPage();
    await page.setViewportSize({ height: 1123, width: 794 });
    await page.setContent(html, { waitUntil: "networkidle" });
    return await page.pdf({ format: "A4", printBackground: true });
  } finally {
    await browser.close();
  }
}

export async function generateAndStorePdf(supabase: SupabaseServerClient, documentId: string) {
  const { data: document, error: documentError } = await supabase
    .from("documents")
    .select("*")
    .eq("id", documentId)
    .single();

  if (documentError || !document) {
    throw new Error("Document introuvable");
  }

  const typedDocument = document as Document;

  if (!typedDocument.numero) {
    throw new Error("Le document doit être numéroté avant la génération du PDF");
  }

  const [{ data: lines }, { data: profile }, { data: client }, { data: factureOrigine }] =
    await Promise.all([
      supabase
        .from("document_lines")
        .select("*")
        .eq("document_id", typedDocument.id)
        .order("ordre", { ascending: true }),
      supabase.from("profiles").select("*").eq("id", typedDocument.user_id).single(),
      typedDocument.client_id
        ? supabase.from("clients").select("*").eq("id", typedDocument.client_id).single()
        : Promise.resolve({ data: null }),
      typedDocument.facture_origine_id
        ? supabase.from("documents").select("*").eq("id", typedDocument.facture_origine_id).single()
        : Promise.resolve({ data: null })
    ]);

  const typedProfile = profile as Profile | null;
  let logoSignedUrl: string | null = null;

  if (typedProfile?.logo_url) {
    const { data } = await supabase.storage.from("logos").createSignedUrl(typedProfile.logo_url, 900);
    logoSignedUrl = data?.signedUrl ?? null;
  }

  const html = renderDocumentHtml({
    client: client as Client | null,
    document: typedDocument,
    factureOrigine: factureOrigine as Document | null,
    lines: (lines ?? []) as DocumentLine[],
    logoSignedUrl,
    profile: typedProfile
  });

  const pdf = await renderHtmlToPdf(html);
  const path = `${typedDocument.user_id}/${typedDocument.numero}.pdf`;
  const { error: uploadError } = await supabase.storage.from("documents").upload(path, pdf, {
    contentType: "application/pdf",
    upsert: true
  });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const { error: updateError } = await supabase
    .from("documents")
    .update({ pdf_path: path })
    .eq("id", typedDocument.id);

  if (updateError) {
    throw new Error(updateError.message);
  }

  return { path };
}
