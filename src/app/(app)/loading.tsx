export default function Loading() {
  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <div className="h-40 animate-pulse rounded-2xl bg-slate-100 ring-1 ring-black/5" />
      <div className="grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((index) => (
          <div className="h-24 animate-pulse rounded-2xl bg-slate-100 ring-1 ring-black/5" key={index} />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-2xl bg-slate-100 ring-1 ring-black/5" />
    </main>
  );
}
