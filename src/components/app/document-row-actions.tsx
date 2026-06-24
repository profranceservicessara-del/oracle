"use client";

import { useToast } from "@/components/ui/toast";

const iconButton =
  "inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-ink shadow-sm ring-1 ring-black/5 transition hover:bg-slate-50 active:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";
const secondaryButton =
  "inline-flex h-10 items-center justify-center gap-2 rounded-2xl bg-white px-4 text-sm font-semibold text-ink shadow-sm ring-1 ring-black/5 transition hover:bg-slate-50 active:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";

export function DocActions({ exporter }: { exporter?: boolean }) {
  const { showToast } = useToast();

  // TODO: Connect document download when backend support exists.
  // TODO: Connect document preview when backend support exists.
  // TODO: Connect accounting export when backend support exists.
  function soon() {
    showToast("Disponible prochainement.", "info");
  }

  if (exporter) {
    return (
      <button className={secondaryButton} onClick={soon} type="button">
        Exporter
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button aria-label="Télécharger" className={iconButton} onClick={soon} type="button">
        <svg fill="none" height="18" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="18">
          <path d="M12 3v12" />
          <path d="m7 12 5 5 5-5" />
          <path d="M5 21h14" />
        </svg>
      </button>
      <button className={secondaryButton} onClick={soon} type="button">
        Visualiser
      </button>
    </div>
  );
}
