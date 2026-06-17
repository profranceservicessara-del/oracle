import type { ReactNode } from "react";

type BadgeProps = {
  children: ReactNode;
  tone?: "neutral" | "success" | "warning";
};

export function Badge({ children, tone = "neutral" }: BadgeProps) {
  const classes = {
    neutral: "bg-slate-100 text-slate-700 ring-1 ring-slate-200",
    success: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
    warning: "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
  };

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${classes[tone]}`}>
      {children}
    </span>
  );
}
