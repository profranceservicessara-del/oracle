"use client";

import type { ReactNode } from "react";
import { Button } from "./button";

type FormModalProps = {
  children: ReactNode;
  description?: string;
  isOpen: boolean;
  onClose: () => void;
  title: string;
};

export function FormModal({ children, description, isOpen, onClose, title }: FormModalProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 py-8">
      <section className="max-h-full w-full max-w-2xl overflow-y-auto rounded-lg border border-line bg-white p-6 shadow-xl">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-ink">{title}</h2>
            {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
          </div>
          <Button onClick={onClose} type="button" variant="secondary">
            Fechar
          </Button>
        </div>
        {children}
      </section>
    </div>
  );
}
