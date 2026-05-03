"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "motion/react";
import { type FormEventHandler, type ReactElement, useEffect, useId, useMemo, useState } from "react";

import { BookCard } from "@/components/recommendations/BookCard";
import { RECOMMENDATION_TONES } from "@/constants/recommendations";
import { cn } from "@/lib/cn";
import { fetchHealth, fetchReady, fetchRecommendations, getBookApiBaseUrl, type ApiResult } from "@/lib/book-api";
import type { Book } from "@/types/book";

type HealthResult = ApiResult<{ status: "ok" }>;
type ReadyResult = ApiResult<{ status: "ready" }>;

type SearchState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; books: Book[] }
  | { status: "empty" }
  | { status: "error"; message: string };

function friendlyProbeLine(health: HealthResult | null, ready: ReadyResult | null): string {
  if (health === null || ready === null) {
    return "Checking…";
  }
  const healthPart = health.ok ? "Health Good" : "Health unavailable";
  const readyPart = ready.ok ? "Catalog: Ready" : "Catalog: not ready";
  return `${healthPart} * ${readyPart}`;
}

function probeDetailsForScreenReader(health: HealthResult | null, ready: ReadyResult | null): string | undefined {
  if (health === null || ready === null) {
    return undefined;
  }
  if (health.ok && ready.ok) {
    return undefined;
  }
  const parts: string[] = [];
  if (!health.ok) {
    const detail = health.error.message.trim().length > 0 ? `: ${health.error.message}` : "";
    parts.push(
      `Health error${health.error.status ? ` HTTP ${String(health.error.status)}` : ""}${detail}`,
    );
  }
  if (!ready.ok) {
    parts.push(
      `Catalog error${ready.error.status ? ` HTTP ${String(ready.error.status)}` : ""}: ${ready.error.message}`,
    );
  }
  return parts.join(". ");
}

function normalizeCategoryInput(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return "All";
  }

  // Backend validates an exact category token; normalize common free-text input.
  return trimmed
    .toLowerCase()
    .split(/\s+/)
    .map((word) => `${word.slice(0, 1).toUpperCase()}${word.slice(1)}`)
    .join(" ");
}

export function RecommendationExplorer(): ReactElement {
  const reduceMotion = Boolean(useReducedMotion());

  const queryFieldId = useId();
  const categoryFieldId = useId();
  const toneFieldId = useId();
  const limitFieldId = useId();
  const queryErrorId = useId();
  const resultsStatusId = useId();

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [tone, setTone] = useState<string>("All");
  const [limitInput, setLimitInput] = useState("16");

  const [queryError, setQueryError] = useState<string | null>(null);

  const [healthResult, setHealthResult] = useState<HealthResult | null>(null);
  const [readyResult, setReadyResult] = useState<ReadyResult | null>(null);
  const [healthRefreshing, setHealthRefreshing] = useState(false);
  const [readyRefreshing, setReadyRefreshing] = useState(false);
  const [search, setSearch] = useState<SearchState>({ status: "idle" });
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    void (async () => {
      const [health, ready] = await Promise.all([
        fetchHealth({ signal: controller.signal }),
        fetchReady({ signal: controller.signal }),
      ]);

      if (controller.signal.aborted) {
        return;
      }

      setHealthResult(health);
      setReadyResult(ready);
    })();

    return () => {
      controller.abort();
    };
  }, []);

  const probeLine = friendlyProbeLine(healthResult, readyResult);
  const probeSrDetails = probeDetailsForScreenReader(healthResult, readyResult);
  const probeIsHealthy = healthResult?.ok === true && readyResult?.ok === true;
  const probeHasFailure =
    (healthResult !== null && !healthResult.ok) || (readyResult !== null && !readyResult.ok);

  const apiUrlMissing = useMemo(() => getBookApiBaseUrl() === null, []);

  const onSubmit: FormEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault();

    const trimmed = query.trim();
    if (trimmed.length === 0) {
      setQueryError("Enter a description of what you want to read.");
      setSearch({ status: "idle" });
      return;
    }

    setQueryError(null);
    setSearch({ status: "loading" });

    void (async () => {
      try {
        const normalizedCategory = normalizeCategoryInput(category);

        const result = await fetchRecommendations({
          query: trimmed,
          category: normalizedCategory,
          tone,
          limit: limitInput.trim().length > 0 ? Number.parseInt(limitInput, 10) : 16,
        });

        const invalidCategory =
          !result.ok &&
          result.error.status === 422 &&
          result.error.message.toLowerCase().includes("invalid category");

        const finalResult =
          invalidCategory && normalizedCategory !== "All"
            ? await fetchRecommendations({
                query: trimmed,
                category: "All",
                tone,
                limit: limitInput.trim().length > 0 ? Number.parseInt(limitInput, 10) : 16,
              })
            : result;

        if (!finalResult.ok) {
          setSearch({
            status: "error",
            message: finalResult.error.status
              ? `${finalResult.error.message} (HTTP ${String(finalResult.error.status)})`
              : finalResult.error.message,
          });
          return;
        }

        if (finalResult.data.length === 0) {
          setSearch({ status: "empty" });
          return;
        }

        setSearch({ status: "success", books: finalResult.data });
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Search failed.";
        setSearch({ status: "error", message });
      }
    })();
  };

  const isLoading = search.status === "loading";
  const modalImageReady =
    selectedBook !== null &&
    (selectedBook.thumbnail_url.startsWith("http://") || selectedBook.thumbnail_url.startsWith("https://"));

  return (
    <div className="flex flex-col gap-fluid-section">
      {apiUrlMissing ? (
        <div
          role="alert"
          className="rounded-[var(--fluid-radius-card)] border border-danger/40 bg-danger/10 px-fluid-card py-fluid-stack text-fluid-sm leading-relaxed text-foreground dark:bg-danger/15"
        >
          <p className="font-semibold text-danger">Book API URL is not configured</p>
          <p className="mt-1 text-foreground/90">
            Create a <code className="rounded bg-stone-200 px-1 py-0.5 text-xs dark:bg-stone-800">.env.local</code>{" "}
            file in the project root (see <code className="rounded bg-stone-200 px-1 py-0.5 text-xs dark:bg-stone-800">.env.example</code>
            ), set <code className="rounded bg-stone-200 px-1 py-0.5 text-xs dark:bg-stone-800">NEXT_PUBLIC_BOOK_API_URL</code> to your API
            origin only (no trailing path), then{" "}
            <strong className="font-semibold">restart</strong> <code className="rounded bg-stone-200 px-1 py-0.5 text-xs dark:bg-stone-800">npm run dev</code>.
            Next.js only reads new env vars after a restart.
          </p>
        </div>
      ) : null}

      <section
        aria-label="API status"
        className="rounded-[var(--fluid-radius-card)] border border-stone-200 bg-card p-fluid-card text-fluid-sm text-foreground shadow-sm dark:border-stone-800"
      >
        <div className="flex flex-col gap-fluid-stack md:flex-row md:items-center md:justify-between">
          <p
            className={cn(
              "self-center rounded-full px-3 py-1 text-center text-fluid-sm font-medium md:self-auto",
              probeIsHealthy
                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200"
                : probeHasFailure
                  ? "bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-200"
                  : "bg-stone-100 text-muted dark:bg-stone-800/70",
            )}
          >
            <span className="sr-only">API status: </span>
            {probeLine}
            {probeSrDetails ? <span className="sr-only"> {probeSrDetails}</span> : null}
          </p>
          <div className="flex flex-wrap justify-center gap-2 md:justify-end">
            <button
              type="button"
              aria-busy={healthRefreshing}
              disabled={healthRefreshing}
              className={cn(
                "inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-lg border border-stone-300 bg-background px-3 text-fluid-sm font-medium text-foreground",
                "transition-colors transition-shadow hover:border-stone-500 hover:bg-stone-100 hover:shadow-sm",
                "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                "disabled:cursor-not-allowed disabled:hover:border-stone-300 disabled:hover:bg-transparent disabled:hover:shadow-none dark:border-stone-700 dark:hover:border-stone-500 dark:hover:bg-stone-900 dark:disabled:hover:border-stone-700 dark:disabled:hover:bg-transparent",
              )}
              onClick={() => {
                setHealthRefreshing(true);
                void fetchHealth()
                  .then(setHealthResult)
                  .finally(() => {
                    setHealthRefreshing(false);
                  });
              }}
            >
              {healthRefreshing ? "Checking health…" : "Check health"}
            </button>
            <button
              type="button"
              aria-busy={readyRefreshing}
              disabled={readyRefreshing}
              className={cn(
                "inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-lg border border-stone-300 bg-background px-3 text-fluid-sm font-medium text-foreground",
                "transition-colors transition-shadow hover:border-stone-500 hover:bg-stone-100 hover:shadow-sm",
                "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                "disabled:cursor-not-allowed disabled:hover:border-stone-300 disabled:hover:bg-transparent disabled:hover:shadow-none dark:border-stone-700 dark:hover:border-stone-500 dark:hover:bg-stone-900 dark:disabled:hover:border-stone-700 dark:disabled:hover:bg-transparent",
              )}
              onClick={() => {
                setReadyRefreshing(true);
                void fetchReady()
                  .then(setReadyResult)
                  .finally(() => {
                    setReadyRefreshing(false);
                  });
              }}
            >
              {readyRefreshing ? "Checking catalog…" : "Check catalog"}
            </button>
          </div>
        </div>
      </section>

      <section aria-label="Search for recommendations">
        <form
          onSubmit={onSubmit}
          className="rounded-[var(--fluid-radius-card)] border border-stone-200 bg-card p-fluid-card shadow-sm dark:border-stone-800"
        >
          <div className="space-y-4 sm:space-y-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="flex flex-col gap-1.5">
                <label htmlFor={categoryFieldId} className="font-medium text-fluid-sm text-foreground">
                  Category
                </label>
                <p className="text-fluid-xs leading-relaxed text-muted">
                  Leave blank to search all categories.
                </p>
                <input
                  id={categoryFieldId}
                  name="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="min-h-11 w-full rounded-lg border border-stone-300 bg-background px-3 py-2 text-fluid-sm text-foreground shadow-sm transition-colors hover:border-stone-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent dark:border-stone-700 dark:hover:border-stone-500"
                  placeholder="Optional, for example: Fiction, History, Science"
                  autoComplete="off"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor={toneFieldId} className="font-medium text-fluid-sm text-foreground">
                  Tone
                </label>
                <p className="text-fluid-xs leading-relaxed text-muted">Tone nudges the mood of recommendations.</p>
                <div className="relative">
                  <select
                    id={toneFieldId}
                    name="tone"
                    value={tone}
                    onChange={(e) => setTone(e.target.value)}
                    className="min-h-11 w-full appearance-none cursor-pointer rounded-lg border border-stone-300 bg-background px-3 py-2 pr-12 text-fluid-sm text-foreground shadow-sm transition-colors hover:border-stone-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent dark:border-stone-700 dark:hover:border-stone-500"
                  >
                    {RECOMMENDATION_TONES.map((value) => (
                      <option key={value} value={value}>
                        {value === "All" ? "Any tone" : value}
                      </option>
                    ))}
                  </select>
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 20 20"
                    fill="none"
                    className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-foreground/85"
                  >
                    <path
                      d="M6 8l4 4 4-4"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </div>

              <div className="flex flex-col gap-1.5 sm:col-span-2 lg:col-span-1">
                <label htmlFor={limitFieldId} className="font-medium text-fluid-sm text-foreground">
                  Limit
                </label>
                <p className="text-fluid-xs leading-relaxed text-muted">(1–50)</p>
                <input
                  id={limitFieldId}
                  name="limit"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={50}
                  value={limitInput}
                  onChange={(e) => {
                    const nextValue = e.target.value;
                    if (nextValue.trim().length === 0) {
                      setLimitInput("");
                      return;
                    }
                    const next = Number.parseInt(nextValue, 10);
                    if (Number.isFinite(next)) {
                      setLimitInput(String(Math.min(50, Math.max(1, next))));
                    }
                  }}
                  placeholder="16"
                  className="min-h-11 w-full rounded-lg border border-stone-300 bg-background px-3 py-2 text-fluid-sm text-foreground shadow-sm transition-colors hover:border-stone-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent dark:border-stone-700 dark:hover:border-stone-500"
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor={queryFieldId} className="font-medium text-fluid-sm text-foreground">
                Search catalog <span className="text-danger">*</span>
              </label>
              <textarea
                id={queryFieldId}
                name="query"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  if (queryError) {
                    setQueryError(null);
                  }
                }}
                rows={3}
                className={cn(
                  "w-full rounded-lg border bg-background px-3 py-2 text-fluid-sm text-foreground shadow-sm",
                  "transition-colors hover:border-stone-500 dark:hover:border-stone-500",
                  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                  queryError
                    ? "border-danger hover:border-danger"
                    : "border-stone-300 dark:border-stone-700",
                )}
                aria-invalid={queryError ? true : undefined}
                aria-describedby={queryError ? queryErrorId : undefined}
                placeholder="Try: literary fiction about climate grief with a hopeful ending"
                autoComplete="off"
              />
              {queryError ? (
                <p id={queryErrorId} className="text-fluid-sm text-danger" role="alert">
                  {queryError}
                </p>
              ) : null}
            </div>
          </div>

          <div className="mt-3 flex justify-end">
            <button
              type="submit"
              className="inline-flex min-h-9 cursor-pointer items-center justify-center rounded-lg bg-accent px-4 py-1.5 text-fluid-xs font-semibold text-stone-950 shadow-sm transition-all enabled:hover:-translate-y-0.5 enabled:hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:enabled:hover:translate-y-0 motion-reduce:enabled:hover:shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent dark:text-stone-950"
              disabled={isLoading}
              aria-busy={isLoading}
            >
              {isLoading ? "Submitting…" : "Submit"}
            </button>
          </div>
        </form>
      </section>

      <section aria-labelledby="results-heading">
        <div className="flex items-baseline justify-between gap-fluid-stack">
          <h2 id="results-heading" className="font-semibold text-fluid-heading text-foreground">
            Results
          </h2>
          <p id={resultsStatusId} className="text-fluid-sm text-muted" aria-live="polite">
            {search.status === "loading"
              ? "Loading recommendations…"
              : search.status === "empty"
                ? "No books returned."
                : search.status === "error"
                  ? "Something went wrong."
                  : search.status === "success"
                    ? `${String(search.books.length)} books`
                    : ""}
          </p>
        </div>

        {search.status === "error" ? (
          <div
            className="mt-fluid-stack rounded-[var(--fluid-radius-card)] border border-danger/30 bg-danger/10 px-fluid-card py-fluid-stack text-fluid-sm text-foreground dark:bg-danger/20"
            role="alert"
          >
            {search.message}
          </div>
        ) : null}

        {search.status === "success" ? (
          <div className="mt-fluid-section grid auto-rows-fr grid-cols-1 gap-3 sm:gap-fluid-gap md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {search.books.map((book, index) => (
              <motion.div
                key={`${book.title}-${String(index)}`}
                className="h-full"
                layout={reduceMotion ? false : true}
                initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={
                  reduceMotion
                    ? { duration: 0 }
                    : {
                        duration: 0.22,
                        delay: Math.min(index, 12) * 0.015,
                      }
                }
              >
                <BookCard book={book} onClick={() => setSelectedBook(book)} />
              </motion.div>
            ))}
          </div>
        ) : null}
      </section>

      {selectedBook ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6"
          role="dialog"
          aria-modal="true"
          aria-label="Book details"
          onClick={() => setSelectedBook(null)}
        >
          <div
            className="w-full max-w-2xl overflow-hidden rounded-xl border border-stone-300 bg-card shadow-xl dark:border-stone-700"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-stone-200 px-4 py-3 dark:border-stone-800">
              <h3 className="text-fluid-md font-semibold text-foreground">Book details</h3>
              <button
                type="button"
                onClick={() => setSelectedBook(null)}
                className="inline-flex min-h-8 items-center justify-center rounded-md border border-stone-300 px-2 text-fluid-xs text-foreground hover:bg-stone-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent dark:border-stone-700 dark:hover:bg-stone-900"
              >
                Close
              </button>
            </div>
            <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-[minmax(11rem,15rem)_1fr]">
              <div className="relative h-[clamp(12rem,32vw,18rem)] w-full rounded-lg bg-stone-100 dark:bg-stone-900">
                {modalImageReady ? (
                  <Image
                    src={selectedBook.thumbnail_url}
                    alt={`Cover image for ${selectedBook.title}`}
                    fill
                    className="rounded-lg object-contain p-1"
                    sizes="(max-width: 767px) 100vw, 40vw"
                    unoptimized
                  />
                ) : (
                  <p className="flex h-full w-full items-center justify-center px-3 text-center text-xs text-muted">
                    Cover unavailable
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <h4 className="text-fluid-heading font-semibold leading-snug text-foreground">{selectedBook.title}</h4>
                <p className="text-fluid-sm text-muted">{selectedBook.authors}</p>
                {selectedBook.isbn13 !== null ? (
                  <p className="text-fluid-xs font-mono text-muted">ISBN-13: {String(selectedBook.isbn13)}</p>
                ) : null}
                <p className="text-fluid-sm leading-relaxed text-foreground/90">{selectedBook.description_preview}</p>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
