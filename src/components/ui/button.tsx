import type { ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary";
};

export function Button({ className = "", variant = "primary", ...props }: ButtonProps) {
  const variantClasses =
    variant === "primary"
      ? "bg-brand text-white shadow-sm ring-1 ring-[#002D72]/20 hover:bg-[#003a94] active:bg-[#001F4D] focus-visible:outline-brand"
      : "bg-white text-ink shadow-sm ring-1 ring-black/5 hover:bg-slate-50 active:bg-slate-100 focus-visible:outline-brand";

  return (
    <button
      className={`inline-flex h-11 items-center justify-center gap-2 rounded-2xl px-4 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${variantClasses} ${className}`}
      {...props}
    />
  );
}
