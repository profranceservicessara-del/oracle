import type { InputHTMLAttributes } from "react";

export function Input({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`h-11 w-full rounded-2xl border border-line bg-white px-3 text-base text-ink outline-none transition placeholder:text-slate-400 focus:border-brand focus:ring-2 focus:ring-[#bcd0ee] ${className}`}
      {...props}
    />
  );
}
