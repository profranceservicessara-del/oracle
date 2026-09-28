// URL pública do app, sem barra final. Vem do env quando configurado; senão da
// URL de produção que a Vercel injeta (sem protocolo); senão localhost.
// Usada em metadataBase, sitemap e robots, para nada apontar para localhost em produção.
export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");

  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercel) return `https://${vercel}`;

  return "http://localhost:3000";
}
