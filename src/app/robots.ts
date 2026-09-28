import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site-url";

// A área logada não deve aparecer em buscadores. Cada rota do grupo (app) também
// sai com noindex no layout; aqui bloqueamos o rastreio dos prefixos.
const PRIVATE_PREFIXES = [
  "/academia",
  "/admin",
  "/analise",
  "/api/",
  "/assistente",
  "/auth/",
  "/banco",
  "/catalogo",
  "/catalogo-pro",
  "/clientes",
  "/compras",
  "/comprovantes",
  "/configuracoes",
  "/conselheiro",
  "/contatos",
  "/crm",
  "/dashboard",
  "/declaracoes",
  "/diario",
  "/documentos",
  "/documents",
  "/facturation",
  "/financeiro",
  "/livre-de-recettes",
  "/modelos-contrato",
  "/offres",
  "/projetos",
  "/registre-des-achats",
  "/tarefas",
  "/tempo",
  "/urssaf",
  "/vencimentos"
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: PRIVATE_PREFIXES }],
    sitemap: `${siteUrl()}/sitemap.xml`
  };
}
