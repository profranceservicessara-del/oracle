import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site-url";

// Só as páginas públicas. A área logada fica de fora de propósito.
const PUBLIC_ROUTES: Array<{ path: string; priority: number }> = [
  { path: "", priority: 1 },
  { path: "/planos", priority: 0.9 },
  { path: "/gestao-completa", priority: 0.7 },
  { path: "/cadastro", priority: 0.6 },
  { path: "/login", priority: 0.4 },
  { path: "/cgu-cgv", priority: 0.3 },
  { path: "/mentions-legales", priority: 0.3 },
  { path: "/politique-de-confidentialite", priority: 0.3 }
];

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  return PUBLIC_ROUTES.map((route) => ({ url: `${base}${route.path}`, priority: route.priority }));
}
