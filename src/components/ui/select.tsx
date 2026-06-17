import type { SelectHTMLAttributes } from "react";

export function Select({ className = "", ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={`h-11 w-full rounded-2xl border border-line bg-white px-3 text-base text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-[#bcd0ee] ${className}`}
      {...props}
    />
  );
}
