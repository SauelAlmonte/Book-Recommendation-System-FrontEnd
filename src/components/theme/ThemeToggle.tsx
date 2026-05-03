"use client";

import { useTheme } from "next-themes";
import { useSyncExternalStore, type ReactElement } from "react";

import { cn } from "@/lib/cn";

type ThemeMode = "light" | "dark" | "system";

const MODES: readonly { readonly id: ThemeMode; readonly label: string }[] = [
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },
  { id: "system", label: "System" },
] as const;

function subscribeToNothing(): () => void {
  return () => {};
}

function useHasMounted(): boolean {
  return useSyncExternalStore(subscribeToNothing, () => true, () => false);
}

function isThemeMode(value: string | undefined): value is ThemeMode {
  return value === "light" || value === "dark" || value === "system";
}

export function ThemeToggle(): ReactElement {
  const { theme, setTheme } = useTheme();
  const hasMounted = useHasMounted();

  const current: ThemeMode = isThemeMode(theme) ? theme : "system";

  if (!hasMounted) {
    return (
      <div
        className="inline-flex rounded-lg border border-stone-200 bg-card p-1 dark:border-stone-800"
        aria-busy="true"
        aria-label="Theme loading"
      >
        <div className="flex gap-1">
          {MODES.map((mode) => (
            <div
              key={mode.id}
              className="h-8 min-h-8 min-w-14 rounded-md bg-stone-100 dark:bg-stone-900"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <fieldset className="inline-flex rounded-lg border border-stone-200 bg-card p-1 dark:border-stone-800">
      <legend className="sr-only">Choose color theme</legend>
      <div className="flex gap-1">
        {MODES.map((mode) => {
          const selected = current === mode.id;

          return (
            <button
              key={mode.id}
              type="button"
              aria-pressed={selected}
              onClick={() => {
                setTheme(mode.id);
              }}
              className={cn(
                "inline-flex min-h-8 min-w-14 cursor-pointer items-center justify-center rounded-md px-2.5 py-1 text-xs font-semibold transition-colors",
                "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                selected
                  ? "bg-accent text-stone-950 shadow-sm hover:bg-accent/85 hover:shadow-md dark:hover:bg-accent/85"
                  : "text-foreground hover:bg-stone-100 hover:shadow-sm dark:hover:bg-stone-900 dark:hover:shadow-black/30",
              )}
            >
              {mode.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
