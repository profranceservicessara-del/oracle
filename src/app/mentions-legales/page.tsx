import { LegalPage } from "@/components/legal/legal-page";

export default function MentionsLegalesPage() {
  return (
    <LegalPage title="Mentions légales">
      <section>
        <h2 className="text-lg font-semibold">Éditeur du site</h2>
        <p>Raison sociale: [A COMPLETER]</p>
        <p>Adresse: [A COMPLETER]</p>
        <p>SIRET: [A COMPLETER]</p>
        <p>Directeur de la publication: [A COMPLETER]</p>
        <p>Email de contact: [A COMPLETER]</p>
      </section>
      <section>
        <h2 className="text-lg font-semibold">Hébergement</h2>
        <p>Hébergeur: Vercel Inc. [A COMPLETER avec adresse exacte]</p>
        <p>Base de données et stockage: Supabase, région UE [A COMPLETER]</p>
      </section>
      <section>
        <h2 className="text-lg font-semibold">Propriété intellectuelle</h2>
        <p>
          Les contenus, textes, interfaces et éléments graphiques du service sont protégés.
          Toute reproduction non autorisée est interdite.
        </p>
      </section>
    </LegalPage>
  );
}
