import {
  calculateDocumentTotals,
  calculateLineHt,
  tvaFranchiseMention,
  type EditorLine
} from "@/lib/document-calculations";
import { fiscalConfig } from "@/config/fiscal";
import {
  categoryLabels,
  clientTypeLabels,
  documentTypeLabels,
  type Client,
  type DocumentType,
  type PaymentMethod,
  type Profile,
  type VatRegime
} from "@/lib/types";

// Rótulos em francês para o documento (voltado ao cliente francês).
const MOYEN_FR: Record<PaymentMethod, string> = {
  virement: "Virement bancaire",
  cheque: "Chèque",
  especes: "Espèces",
  cb: "Carte bancaire",
  stripe: "Paiement en ligne",
  autre: "Autre"
};

type DocumentPreviewProps = {
  acomptePct?: number | null;
  client: Client | null;
  conditionsPaiement: string;
  dateEcheance: string;
  dateEmission: string;
  datePrestation: string;
  documentType: DocumentType;
  lines: EditorLine[];
  moyensPaiement?: PaymentMethod[];
  notesBasPage: string;
  profile: Profile | null;
  regimeTva: VatRegime;
  validiteJours: number | null;
};

const euroFormatter = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR"
});

function formatDate(value: string) {
  if (!value) {
    return "À compléter";
  }

  return new Intl.DateTimeFormat("fr-FR").format(new Date(`${value}T00:00:00`));
}

function clientName(client: Client | null) {
  if (!client) {
    return "Client à sélectionner";
  }

  return client.type === "professionnel" ? client.raison_sociale : client.nom;
}

export function DocumentPreview({
  acomptePct,
  client,
  conditionsPaiement,
  dateEcheance,
  dateEmission,
  datePrestation,
  documentType,
  lines,
  moyensPaiement,
  notesBasPage,
  profile,
  regimeTva,
  validiteJours
}: DocumentPreviewProps) {
  const totals = calculateDocumentTotals(lines, regimeTva);
  const isProfessionalClient = client?.type === "professionnel";

  return (
    <section className="rounded-lg border border-line bg-white p-6 shadow-sm">
      <div className="mb-8 flex flex-col gap-6 border-b border-line pb-6 sm:flex-row sm:justify-between">
        <div>
          <p className="text-sm uppercase tracking-wide text-muted">{documentTypeLabels[documentType]}</p>
          <h2 className="mt-2 text-3xl font-semibold text-ink">
            {documentTypeLabels[documentType]} brouillon
          </h2>
          <p className="mt-2 text-sm text-muted">Numéro: attribué à l&apos;émission</p>
          <p className="text-sm text-muted">Date d&apos;émission: {formatDate(dateEmission)}</p>
        </div>
        <div className="text-sm leading-6 text-ink sm:text-right">
          <p className="font-semibold">{profile?.prenom} {profile?.nome || "Profil vendeur"}</p>
          <p>Entrepreneur Individuel</p>
          <p>{profile?.adresse_rue || "Adresse à compléter"}</p>
          <p>
            {[profile?.adresse_cp, profile?.adresse_ville].filter(Boolean).join(" ") ||
              "Code postal et ville à compléter"}
          </p>
          <p>SIRET: {profile?.siret || "À compléter"}</p>
          <p>APE: {profile?.code_ape || "À compléter"}</p>
        </div>
      </div>

      <div className="mb-8 grid gap-6 sm:grid-cols-2">
        <div className="rounded-md border border-line p-4">
          <p className="mb-2 text-xs font-semibold uppercase text-muted">Client</p>
          <p className="font-semibold">{clientName(client)}</p>
          {client ? (
            <>
              <p className="text-sm text-muted">{clientTypeLabels[client.type]}</p>
              <p className="mt-2 text-sm">{client.adresse_rue || "Adresse à compléter"}</p>
              <p className="text-sm">
                {[client.adresse_cp, client.adresse_ville].filter(Boolean).join(" ") ||
                  "Code postal et ville à compléter"}
              </p>
              {client.type === "professionnel" ? (
                <p className="text-sm">SIREN: {client.siren || "À compléter"}</p>
              ) : null}
            </>
          ) : null}
        </div>
        <div className="rounded-md border border-line p-4 text-sm leading-6">
          <p>Date de vente/prestation: {formatDate(datePrestation)}</p>
          {documentType !== "devis" ? (
            <p>Date d&apos;échéance: {formatDate(dateEcheance)}</p>
          ) : (
            <p>Durée de validité: {validiteJours ?? 30} jours</p>
          )}
          <p>
            Taux des pénalités de retard:{" "}
            {profile?.taux_penalites_retard ??
              fiscalConfig.legalDocumentValues.defaultLatePenaltyRate}
            %
          </p>
          {isProfessionalClient ? (
            <p>
              Indemnité forfaitaire pour frais de recouvrement:{" "}
              {fiscalConfig.legalDocumentValues.professionalRecoveryFee} €
            </p>
          ) : null}
          <p>Escompte pour paiement anticipé: néant</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase text-muted">
              <th className="py-3 pr-3">Désignation</th>
              <th className="py-3 pr-3">Catégorie</th>
              <th className="py-3 pr-3 text-right">Qté</th>
              <th className="py-3 pr-3 text-right">PU HT</th>
              {regimeTva === "assujetti" ? <th className="py-3 pr-3 text-right">TVA</th> : null}
              <th className="py-3 text-right">Total HT</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line) => (
              <tr className="border-b border-line" key={line.id}>
                <td className="py-3 pr-3">
                  <p className="font-medium">{line.designation || "Ligne à compléter"}</p>
                  {line.description ? <p className="mt-1 text-muted">{line.description}</p> : null}
                </td>
                <td className="py-3 pr-3">{categoryLabels[line.categorie]}</td>
                <td className="py-3 pr-3 text-right">{line.quantite}</td>
                <td className="py-3 pr-3 text-right">{euroFormatter.format(line.prix_unitaire_ht)}</td>
                {regimeTva === "assujetti" ? (
                  <td className="py-3 pr-3 text-right">{line.taux_tva}%</td>
                ) : null}
                <td className="py-3 text-right">{euroFormatter.format(calculateLineHt(line))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 flex justify-end">
        <div className="w-full max-w-sm space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Total HT</span>
            <strong>{euroFormatter.format(totals.totalHt)}</strong>
          </div>
          <div className="flex justify-between">
            <span>Total TVA</span>
            <strong>{euroFormatter.format(totals.totalTva)}</strong>
          </div>
          <div className="flex justify-between border-t border-line pt-2 text-base">
            <span>Total TTC</span>
            <strong>{euroFormatter.format(totals.totalTtc)}</strong>
          </div>
        </div>
      </div>

      <div className="mt-8 space-y-2 border-t border-line pt-4 text-sm text-muted">
        <p>
          {regimeTva === "franchise"
            ? tvaFranchiseMention
            : "TVA applicable selon les taux indiqués par ligne."}
        </p>
        <p>Conditions de paiement: {conditionsPaiement || "Paiement à réception de facture."}</p>
        {moyensPaiement && moyensPaiement.length > 0 ? (
          <p>Moyens de paiement acceptés: {moyensPaiement.map((method) => MOYEN_FR[method]).join(", ")}.</p>
        ) : null}
        {acomptePct ? (
          <p>Acompte de {acomptePct}% demandé à la commande{totals.totalTtc > 0 ? ` (${euroFormatter.format((totals.totalTtc * acomptePct) / 100)})` : ""}.</p>
        ) : null}
        {notesBasPage ? <p>{notesBasPage}</p> : null}
      </div>
    </section>
  );
}
