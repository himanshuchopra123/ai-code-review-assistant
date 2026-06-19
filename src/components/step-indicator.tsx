const STEPS = ["Sign in", "Select repos", "Done"];

export function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {STEPS.map((step, i) => {
        const stepNumber = i + 1;
        const isActive = stepNumber === current;
        const isComplete = stepNumber < current;
        return (
          <div key={step} className="flex items-center gap-2">
            <div
              className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                isActive || isComplete
                  ? "bg-indigo-600 text-white"
                  : "bg-zinc-200 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
              }`}
            >
              {stepNumber}
            </div>
            <span
              className={
                isActive
                  ? "font-medium text-zinc-900 dark:text-zinc-100"
                  : "text-zinc-400 dark:text-zinc-500"
              }
            >
              {step}
            </span>
            {stepNumber < STEPS.length && (
              <span className="text-zinc-300 dark:text-zinc-700">—</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
