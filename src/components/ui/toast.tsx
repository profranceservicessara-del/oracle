"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

type ToastTone = "success" | "error" | "info";
type ToastAction = { label: string; onClick: () => void };
type ToastOptions = { action?: ToastAction; durationMs?: number };
type ToastMessage = {
  id: number;
  message: string;
  tone: ToastTone;
  action?: ToastAction;
};

type ToastContextValue = {
  showToast: (message: string, tone?: ToastTone, options?: ToastOptions) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<ToastMessage[]>([]);

  const dismiss = useCallback((id: number) => {
    setMessages((current) => current.filter((item) => item.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, tone: ToastTone = "info", options?: ToastOptions) => {
      const id = Date.now() + Math.floor(Math.random() * 1000);
      setMessages((current) => [...current, { id, message, tone, action: options?.action }]);
      window.setTimeout(() => {
        setMessages((current) => current.filter((item) => item.id !== id));
      }, options?.durationMs ?? (options?.action ? 6000 : 3500));
    },
    []
  );

  const value = useMemo(() => ({ showToast }), [showToast]);

  const toneClasses: Record<ToastTone, string> = {
    success: "border-l-emerald-500",
    error: "border-l-red-500",
    info: "border-l-slate-400"
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="fixed bottom-4 right-4 z-[100] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2"
        role="status"
      >
        {messages.map((item) => (
          <div
            className={`flex items-center justify-between gap-3 rounded-2xl border border-l-4 border-black/5 bg-white px-4 py-3 text-sm text-ink shadow-lg ${toneClasses[item.tone]}`}
            key={item.id}
          >
            <span className="min-w-0">{item.message}</span>
            {item.action ? (
              <button
                className="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-brand transition hover:bg-slate-100"
                onClick={() => {
                  item.action?.onClick();
                  dismiss(item.id);
                }}
                type="button"
              >
                {item.action.label}
              </button>
            ) : null}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast deve ser usado dentro de ToastProvider.");
  }

  return context;
}
