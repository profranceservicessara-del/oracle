import type { TextareaHTMLAttributes } from "react";

export function Textarea({ className = "", ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={`min-h-24 w-full rounded-2xl border border-line bg-white px-3 py-2 text-base text-ink outline-none transition placeholder:text-slate-400 focus:border-brand focus:ring-2 focus:ring-[#bcd0ee] ${className}`}
      {...props}
    />
  );
}
