import type { Metadata } from "next";
import { Playfair_Display } from "next/font/google";
import "./globals.css";

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-playfair",
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
    <html className={playfair.variable} lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
