// Único arquivo autorizado para valores fiscais no código.
// VERIFIER 2026: valores sujeitos a alteração por lei de finanças.
// Fonte oficial a verificar antes do lançamento: urssaf.fr

export const fiscalConfig = {
  microEnterpriseThresholds: {
    vente: 188_700, // VERIFIER 2026 - Seuil micro vente, fonte oficial: urssaf.fr
    service: 77_700 // VERIFIER 2026 - Seuil micro service, fonte oficial: urssaf.fr
  },
  vatFranchiseThresholds: {
    vente: {
      base: 85_000, // VERIFIER 2026 - Franchise TVA vente, fonte oficial: urssaf.fr
      increased: 93_500 // VERIFIER 2026 - Franchise TVA vente majoré, fonte oficial: urssaf.fr
    },
    service: {
      base: 37_500, // VERIFIER 2026 - Franchise TVA service, fonte oficial: urssaf.fr
      increased: 41_250 // VERIFIER 2026 - Franchise TVA service majoré, fonte oficial: urssaf.fr
    }
  },
  urssafContributionRates: {
    vente: 0.123, // VERIFIER 2026 - Taxa URSSAF vente 12,3 %, fonte oficial: urssaf.fr
    serviceBic: 0.212, // VERIFIER 2026 - Taxa URSSAF service BIC 21,2 %, fonte oficial: urssaf.fr
    serviceBnc: 0.261 // VERIFIER 2026 - Taxa URSSAF BNC 26,1 %, fonte oficial: urssaf.fr
  },
  acre: {
    contributionMultiplier: 0.5 // VERIFIER 2026 - ACRE pode reduzir cotisations no período elegível, fonte oficial: urssaf.fr
  },
  versementLiberatoireRates: {
    vente: 0.01, // VERIFIER 2026 - Versement libératoire vente 1 %, fonte oficial: urssaf.fr
    serviceBic: 0.017, // VERIFIER 2026 - Versement libératoire service BIC 1,7 %, fonte oficial: urssaf.fr
    serviceBnc: 0.022 // VERIFIER 2026 - Versement libératoire BNC 2,2 %, fonte oficial: urssaf.fr
  },
  legalDocumentValues: {
    defaultVatRate: 20, // VERIFIER 2026 - Taux TVA par défaut à ajuster selon activité/prestation.
    defaultLatePenaltyRate: 10, // VERIFIER 2026 - Valeur par défaut projet, éditable dans le profil. Le défaut DB profiles.taux_penalites_retard miroir doit être mis à jour avec cette valeur.
    professionalRecoveryFee: 40 // VERIFIER 2026 - Indemnité forfaitaire B2B pour frais de recouvrement.
  },
  monitoring: {
    tvaInfoRatio: 0.7, // VERIFIER 2026 - Palier d'information interne pour suivi du seuil TVA.
    tvaWarningRatio: 0.9, // VERIFIER 2026 - Palier d'alerte interne pour suivi du seuil TVA.
    tvaCriticalRatio: 1 // VERIFIER 2026 - Seuil atteint.
  }
} as const;
