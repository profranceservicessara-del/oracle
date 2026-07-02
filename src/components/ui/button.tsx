import type { ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary";
};

export function Button({ className = "", variant = "primary", ...props }: ButtonProps) {
  // 3D depth: inset top highlight + layered drop shadow. Hover lifts (translate
  // up + bigger shadow), press sinks (translate down + shadow collapses).
  const variantClasses =
    variant === "primary"
      ? "bg-brand text-white ring-1 ring-inset ring-white/10 " +
        "shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_2px_4px_rgba(0,20,58,0.35),0_9px_18px_-7px_rgba(0,45,114,0.55)] " +
        "hover:-translate-y-px hover:bg-[#003a94] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_5px_9px_rgba(0,20,58,0.35),0_14px_24px_-7px_rgba(0,45,114,0.6)] " +
        "active:translate-y-px active:bg-[#001F4D] active:shadow-[inset_0_1px_2px_rgba(0,10,40,0.4)] " +
        "focus-visible:outline-brand"
      : "bg-white text-ink ring-1 ring-black/[0.06] " +
        "shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_2px_4px_rgba(2,10,40,0.06),0_9px_16px_-8px_rgba(2,10,40,0.2)] " +
        "hover:-translate-y-px hover:bg-slate-50 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_5px_9px_rgba(2,10,40,0.08),0_14px_22px_-8px_rgba(2,10,40,0.24)] " +
        "active:translate-y-px active:bg-slate-100 active:shadow-[inset_0_1px_2px_rgba(2,10,40,0.12)] " +
        "focus-visible:outline-brand";

  return (
    <button
      className={`inline-flex h-11 items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold transition-all duration-150 will-change-transform focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60 disabled:translate-y-0 disabled:shadow-none ${variantClasses} ${className}`}
      {...props}
    />
  );
}
