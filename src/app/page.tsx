import { RecommendationExplorer } from "@/components/recommendations/RecommendationExplorer";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

export default function HomePage() {
  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b border-stone-200 bg-card/80 px-fluid-page-x py-fluid-stack backdrop-blur-sm dark:border-stone-800">
        <div className="mx-auto flex max-w-[min(72rem,94vw)] flex-col gap-fluid-stack sm:flex-row sm:items-end sm:justify-between sm:gap-6">
          <div className="min-w-0 flex-1">
            <h1 className="font-semibold tracking-tight text-fluid-title text-foreground leading-[var(--fluid-leading-tight)]">
              Book recommendation
            </h1>
            <h2 className="mt-1 font-medium tracking-wide text-accent text-fluid-kicker uppercase">
              Find your next read
            </h2>
          </div>
          <div className="w-full sm:w-auto">
            <ThemeToggle />
          </div>
        </div>
      </header>
      <main className="flex flex-1 flex-col px-fluid-page-x py-fluid-page-y">
        <div className="mx-auto w-full max-w-[min(72rem,94vw)] flex-1">
          <RecommendationExplorer />
        </div>
      </main>
    </div>
  );
}
