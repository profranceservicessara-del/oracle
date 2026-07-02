import Link from "next/link";
import type { ReactNode } from "react";

export function LegalPage({ children, title }: { children: ReactNode; title: string }) {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <Link className="text-sm font-semibold text-brand" href="/">
        Oracle
      </Link>
      <h1 className="mt-4 text-3xl font-semibold text-ink">{title}</h1>
      <div className="mt-8 space-y-6 rounded-lg border border-line bg-white p-6 text-sm leading-6 text-ink shadow-sm">
        {children}
        <section className="rounded-md border border-amber-200 bg-amber-50 p-4 text-amber-900">
          <p className="font-semibold">Cookies</p>
          <p>
            Aucun traceur analytics n&apos;est détecté dans le code à ce stade. Aucun bandeau cookie
            n&apos;est donc affiché. À compléter si un outil de mesure d&apos;audience est ajouté.
          </p>
        </section>
      </div>
    </main>
  );
}
