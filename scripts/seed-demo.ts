import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { fiscalConfig } from "../src/config/fiscal";

type Env = Record<string, string>;

const demoEmail = "demo@profacture.local";
const demoPassword = "Demo-ProFacture-2026!";
const seedMarker = "DEMO_SEED";

function loadEnvFile(path: string): Env {
  if (!existsSync(path)) {
    return {};
  }

  return Object.fromEntries(
    readFileSync(path, "utf8")
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const [key, ...value] = line.split("=");
        return [key, value.join("=").replace(/^["']|["']$/g, "")];
      })
  );
}

const env = {
  ...loadEnvFile(resolve(process.cwd(), ".env.local")),
  ...process.env
};

function requiredEnv(name: string) {
  const value = env[name];
  if (!value) {
    throw new Error("Fill NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY.");
  }

  return value;
}

const supabaseUrl = requiredEnv("NEXT_PUBLIC_SUPABASE_URL");
const anonKey = requiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
const serviceRoleKey = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

function db(client: unknown): any {
  return client as any;
}

async function ensureDemoUser() {
  const { data: users, error } = await admin.auth.admin.listUsers();
  if (error) {
    throw error;
  }

  const existing = users.users.find((user) => user.email === demoEmail);
  if (existing) {
    await admin.auth.admin.updateUserById(existing.id, {
      email_confirm: true,
      password: demoPassword
    });
    return existing.id;
  }

  const { data, error: createError } = await admin.auth.admin.createUser({
    email: demoEmail,
    email_confirm: true,
    password: demoPassword,
    user_metadata: {
      nome: "Dupont",
      prenom: "Marie"
    }
  });

  if (createError || !data.user) {
    throw createError ?? new Error("Demo user was not created.");
  }

  return data.user.id;
}

async function authenticatedDemoClient() {
  const client = createClient(supabaseUrl, anonKey);
  const { error } = await client.auth.signInWithPassword({
    email: demoEmail,
    password: demoPassword
  });

  if (error) {
    throw error;
  }

  return client;
}

async function emitDocument(client: unknown, documentId: string) {
  const { error } = await db(client).rpc("emit_document", { doc_id: documentId });
  if (error) {
    throw error;
  }
}

async function createDraftDocument(
  client: unknown,
  userId: string,
  clientId: string,
  type: "devis" | "facture",
  total: number,
  statusAfterEmit?: "paid" | "sent"
) {
  const today = new Date().toISOString().slice(0, 10);
  const { data: document, error } = await db(client)
    .from("documents")
    .insert({
      client_id: clientId,
      conditions_paiement: "Paiement à réception de facture.",
      date_echeance: type === "facture" ? today : null,
      date_emission: today,
      date_prestation: today,
      mention_tva: "TVA non applicable, art. 293 B du CGI",
      notes_bas_page: seedMarker,
      status: "draft",
      total_ht: total,
      total_ttc: total,
      total_tva: 0,
      type,
      user_id: userId,
      validite_jours: type === "devis" ? 30 : null
    })
    .select("*")
    .single();

  if (error || !document) {
    throw error ?? new Error("Document was not created.");
  }

  const { error: lineError } = await db(client).from("document_lines").insert({
    categorie: total > 800 ? "vente" : "service_bic",
    designation: type === "devis" ? "Prestation estimée" : "Prestation réalisée",
    document_id: document.id,
    ordre: 1,
    prix_unitaire_ht: total,
    quantite: 1,
    taux_tva: 0,
    total_ligne_ht: total,
    user_id: userId
  });

  if (lineError) {
    throw lineError;
  }

  if (statusAfterEmit) {
    await emitDocument(client, document.id);
  }

  if (statusAfterEmit === "paid") {
    const { error: paymentError } = await db(client).from("payments").insert({
      date_encaissement: today,
      document_id: document.id,
      montant: total,
      moyen: "virement",
      reference: seedMarker,
      user_id: userId
    });

    if (paymentError) {
      throw paymentError;
    }
  }
}

async function main() {
  const userId = await ensureDemoUser();
  const client = await authenticatedDemoClient();

  const { data: existingDocs } = await db(client)
    .from("documents")
    .select("id")
    .eq("notes_bas_page", seedMarker)
    .limit(1);

  if (existingDocs?.length) {
    console.log("Demo data already exists. Nothing to do.");
    return;
  }

  await db(client).from("profiles").upsert({
    activite_principale: "service_bic",
    adresse_cp: "75010",
    adresse_rue: "12 rue du Faubourg Saint-Denis",
    adresse_ville: "Paris",
    code_ape: "7022Z",
    declaration_periodicite: "trimestral",
    id: userId,
    monthly_summary_email: true,
    nome: "Dupont",
    prenom: "Marie",
    regime_tva: "franchise",
    siret: "12345678900012",
    taux_penalites_retard: fiscalConfig.legalDocumentValues.defaultLatePenaltyRate
  });

  const clients = [
    { nom: "Alice Martin", type: "particulier" },
    { raison_sociale: "Atelier Lumière SAS", siren: "123456789", type: "professionnel" },
    { raison_sociale: "Boulangerie Victor SARL", siren: "987654321", type: "professionnel" }
  ];
  const { data: createdClients, error: clientsError } = await db(client)
    .from("clients")
    .insert(
      clients.map((item) => ({
        ...item,
        adresse_cp: "75011",
        adresse_rue: "8 avenue Parmentier",
        adresse_ville: "Paris",
        email: "client-demo@example.com",
        user_id: userId
      }))
    )
    .select("*");

  if (clientsError || !createdClients) {
    throw clientsError ?? new Error("Clients were not created.");
  }

  await db(client).from("catalog_items").insert(
    [
      ["Audit administratif", 450, "service_bic"],
      ["Création facture", 120, "service_bic"],
      ["Formation gestion", 700, "service_bnc"],
      ["Pack fournitures", 250, "vente"],
      ["Support mensuel", 300, "service_bic"]
    ].map(([designation, price, categorie]) => ({
      categorie,
      designation,
      prix_unitaire_ht: price,
      unite: "unité",
      user_id: userId
    }))
  );

  await createDraftDocument(client, userId, createdClients[0].id, "facture", 1200, "paid");
  await createDraftDocument(client, userId, createdClients[1].id, "facture", 900, "paid");
  await createDraftDocument(client, userId, createdClients[2].id, "facture", 650, "sent");
  await createDraftDocument(client, userId, createdClients[0].id, "facture", 500);
  await createDraftDocument(client, userId, createdClients[1].id, "devis", 780);

  await db(client).from("purchases").insert([
    {
      date_achat: new Date().toISOString().slice(0, 10),
      designation: "Abonnement logiciel",
      fournisseur: "SaaS Gestion",
      montant: 49,
      moyen: "cb",
      reference_piece: "DEMO-ACHAT-1",
      user_id: userId
    },
    {
      date_achat: new Date().toISOString().slice(0, 10),
      designation: "Papeterie",
      fournisseur: "Papeterie République",
      montant: 32,
      moyen: "cb",
      reference_piece: "DEMO-ACHAT-2",
      user_id: userId
    }
  ]);

  console.log(`Demo seed completed for ${demoEmail}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
