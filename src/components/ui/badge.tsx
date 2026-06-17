import type { ReactNode } from "react";

type BadgeProps = {
  children: ReactNode;
  tone?: "neutral" | "success" | "warning";
};

export function Badge({ children, tone = "neutral" }: BadgeProps) {
  const classes = {
    neutral: "bg-slate-100 text-slate-700",
    success: "bg-teal-50 text-teal-700",
    warning: "bg-amber-50 text-amber-700"
  };

  return (
    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${classes[tone]}`}>
      {children}
    </span>
  );
}
