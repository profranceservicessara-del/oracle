import type { Metadata } from "next";
import { Lato, Playfair_Display } from "next/font/google";
import "./globals.css";

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-playfair",
  display: "swap"
});

// Fonte base do produto (efeito "papel soft"). Lato no Google Fonts oferece
// 400/700/900; 500 e 600 usados nas classes caem no peso mais próximo.
const lato = Lato({
  subsets: ["latin"],
  weight: ["400", "700", "900"],
  variable: "--font-lato",
  display: "swap"
});

export const metadata: Metadata = {
  title: "Oracle",
  description: "Faturação para auto-entrepreneurs lusófonos na França"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html className={`${playfair.variable} ${lato.variable}`} lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
