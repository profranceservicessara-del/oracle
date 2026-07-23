import type { MetadataRoute } from "next";

// Manifest PWA: permite instalar o Oracle como aplicativo. É ele que define o
// ícone na dock, na tela de início e na janela do app instalado.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Oracle — Sistema financeiro",
    short_name: "Oracle",
    description: "Gestão fiscal francesa em português: faturas, orçamentos, contabilidade e declarações.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#001030",
    theme_color: "#001030",
    lang: "pt-BR",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
    ]
  };
}
