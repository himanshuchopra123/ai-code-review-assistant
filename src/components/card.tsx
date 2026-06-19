export function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      {children}
    </div>
  );
}
