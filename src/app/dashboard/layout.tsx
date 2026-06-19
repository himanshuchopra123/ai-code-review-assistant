import Link from "next/link";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-full bg-zinc-50 dark:bg-zinc-950">
      <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/90 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-900/90">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-sm">
              🤖
            </span>
            <span className="text-sm font-semibold tracking-tight">
              AI Code-Review
            </span>
          </Link>
          <nav className="flex items-center gap-5 text-sm">
            <Link
              href="/dashboard"
              className="text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              Dashboard
            </Link>
            <Link
              href="/repos"
              className="text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              Repos
            </Link>
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
              HJ
            </div>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
