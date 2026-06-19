import Link from "next/link";
import { Card } from "@/components/card";
import { StepIndicator } from "@/components/step-indicator";

export default async function SetupCompletePage({
  searchParams,
}: {
  searchParams: Promise<{ repos?: string }>;
}) {
  const { repos } = await searchParams;
  const repoList = repos ? repos.split(",").filter(Boolean) : [];

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 bg-zinc-50 px-4 py-16 dark:bg-zinc-950">
      <Card>
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-2xl dark:bg-green-900/40">
            ✅
          </div>
          <h1 className="text-lg font-semibold">You&apos;re all set</h1>

          {repoList.length > 0 ? (
            <div className="text-sm text-zinc-500 dark:text-zinc-400">
              <p>We&apos;ll review new pull requests on:</p>
              <ul className="mt-2 space-y-1 font-medium text-zinc-700 dark:text-zinc-300">
                {repoList.map((repo) => (
                  <li key={repo}>• {repo}</li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              No repositories enabled yet — you can turn reviews on anytime
              from the dashboard.
            </p>
          )}

          <p className="text-xs text-zinc-400">
            Open a pull request on one of these repos to see it in action.
          </p>

          <Link
            href="/dashboard"
            className="mt-2 w-full rounded-full bg-zinc-900 px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Go to Dashboard
          </Link>
        </div>
      </Card>
      <StepIndicator current={3} />
    </div>
  );
}
