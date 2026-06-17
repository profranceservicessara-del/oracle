import { LegalPage } from "@/components/legal/legal-page";

export default function PolitiqueConfidentialitePage() {
  return (
    <LegalPage title="Politique de confidentialité">
      <section>
        <h2 className="text-lg font-semibold">Responsable du traitement</h2>
        <p>[A COMPLETER: identité, adresse et email du responsable du traitement]</p>
      </section>
      <section>
        <h2 className="text-lg font-semibold">Données collectées</h2>
        <p>
          Données de compte, profil fiscal, clients, catalogue, documents, lignes, paiements,
          achats, chemins de PDF privés et journaux d&apos;audit nécessaires au fonctionnement du service.
        </p>
      </section>
      <section>
        <h2 className="text-lg font-semibold">Finalités</h2>
        <p>
          Gestion de facturation, génération de documents légaux, livres comptables, rappels
          déclaratifs et sécurité applicative.
        </p>
      </section>
      <section>
        <h2 className="text-lg font-semibold">Conservation</h2>
        <p>
          Les documents fiscaux émis sont conservés pendant la durée légale applicable.
          Les données de contact sont anonymisées immédiatement lors d&apos;une suppression de compte.
        </p>
      </section>
      <section>
        <h2 className="text-lg font-semibold">Droits RGPD</h2>
        <p>
          L&apos;utilisateur peut exporter ses données et demander la suppression de son compte depuis
          l&apos;espace Paramètres &gt; Données.
        </p>
      </section>
    </LegalPage>
  );
}
