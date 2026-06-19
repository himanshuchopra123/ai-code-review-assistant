import Link from "next/link";
import { Card } from "@/components/card";
import { StepIndicator } from "@/components/step-indicator";
import { GitHubIcon } from "@/components/icons";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 bg-zinc-50 px-4 py-16 dark:bg-zinc-950">
      <Card>
        <div className="flex flex-col items-center gap-6 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-2xl">
            🤖
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              AI Code-Review Assistant
            </h1>
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
              Catches bugs, security issues, and risky changes — with inline
              comments on every pull request, before it merges.
            </p>
          </div>
          <Link
            href="/repos"
            className="flex w-full items-center justify-center gap-2 rounded-full bg-zinc-900 px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            <GitHubIcon />
            Sign in with GitHub
          </Link>
          <p className="text-xs text-zinc-400">
            You&apos;ll be asked to install the GitHub App and choose
            repositories.
          </p>
        </div>
      </Card>
      <StepIndicator current={1} />
    </div>
  );
}
