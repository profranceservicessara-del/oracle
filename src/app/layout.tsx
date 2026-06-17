import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ProFacture",
  description: "Faturação para auto-entrepreneurs lusófonos na França"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
