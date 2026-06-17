import { LegalPage } from "@/components/legal/legal-page";

export default function CguCgvPage() {
  return (
    <LegalPage title="CGU / CGV">
      <section>
        <h2 className="text-lg font-semibold">Objet</h2>
        <p>
          ProFacture est un service SaaS de facturation et de suivi administratif pour
          micro-entrepreneurs. [A COMPLETER]
        </p>
      </section>
      <section>
        <h2 className="text-lg font-semibold">Compte utilisateur</h2>
        <p>
          L&apos;utilisateur est responsable de l&apos;exactitude des informations saisies et de la
          confidentialité de ses accès.
        </p>
      </section>
      <section>
        <h2 className="text-lg font-semibold">Limites du service</h2>
        <p>
          Les estimations et alertes sont informatives et ne constituent pas un conseil fiscal,
          juridique ou comptable personnalisé.
        </p>
      </section>
      <section>
        <h2 className="text-lg font-semibold">Prix et paiement</h2>
        <p>[A COMPLETER: offre, prix, modalités de paiement et résiliation]</p>
      </section>
      <section>
        <h2 className="text-lg font-semibold">Support</h2>
        <p>[A COMPLETER: email de support et délais indicatifs]</p>
      </section>
    </LegalPage>
  );
}
