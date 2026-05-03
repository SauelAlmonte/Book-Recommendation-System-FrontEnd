import { z } from "zod";

import { getErrorMessage } from "@/lib/errors";
import { booksResponseSchema, type Book } from "@/types/book";

const DEFAULT_RECOMMENDATIONS_TIMEOUT_MS = 120_000;

/** Host cold starts (e.g. Render free tier) often exceed 30–60s; keep probes patient. */
const DEFAULT_HEALTH_TIMEOUT_MS = 120_000;
const DEFAULT_READY_TIMEOUT_MS = 120_000;

const healthResponseSchema = z.object({
  status: z.literal("ok"),
});

const readyResponseSchema = z.object({
  status: z.literal("ready"),
});

const fastApiErrorSchema = z.object({
  detail: z.union([z.string(), z.array(z.unknown())]),
});

export type ApiError = { message: string; status?: number };

export type ApiSuccess<T> = { ok: true; data: T };
export type ApiFailure = { ok: false; error: ApiError };
export type ApiResult<T> = ApiSuccess<T> | ApiFailure;

export type FetchRecommendationsInput = {
  query: string;
  category?: string;
  tone?: string;
  limit?: number;
};

export function getBookApiBaseUrl(): string | null {
  try {
    const raw = process.env.NEXT_PUBLIC_BOOK_API_URL;
    if (raw === undefined || raw === null) {
      return null;
    }
    const trimmed = String(raw).trim();
    if (trimmed.length === 0) {
      return null;
    }
    return trimmed.replace(/\/+$/, "");
  } catch {
    return null;
  }
}

function createTimeoutSignal(ms: number): { signal: AbortSignal; clear: () => void } {
  const controller = new AbortController();
  const id = setTimeout(() => {
    controller.abort(new DOMException("The operation timed out.", "AbortError"));
  }, ms);

  const clear = () => {
    clearTimeout(id);
  };

  return { signal: controller.signal, clear };
}

function mergeSignals(a: AbortSignal, b: AbortSignal): AbortSignal {
  try {
    if (typeof AbortSignal.any === "function") {
      return AbortSignal.any([a, b]);
    }
  } catch {
    // fall through
  }

  const merged = new AbortController();

  const forward = (): void => {
    if (!merged.signal.aborted) {
      merged.abort();
    }
  };

  if (a.aborted || b.aborted) {
    forward();
    return merged.signal;
  }

  a.addEventListener("abort", forward, { once: true });
  b.addEventListener("abort", forward, { once: true });
  return merged.signal;
}

function formatFastApiDetail(detail: unknown): string {
  if (typeof detail === "string") {
    return detail;
  }

  try {
    return JSON.stringify(detail);
  } catch {
    return "Validation error from the API.";
  }
}

function parseProblemBody(text: string): string | undefined {
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return undefined;
  }

  try {
    const json: unknown = JSON.parse(trimmed) as unknown;
    const parsed = fastApiErrorSchema.safeParse(json);
    if (!parsed.success) {
      return undefined;
    }

    return formatFastApiDetail(parsed.data.detail);
  } catch {
    return undefined;
  }
}

async function parseHttpError(res: Response): Promise<string> {
  let text = "";
  try {
    text = await res.text();
  } catch {
    return `Request failed (HTTP ${String(res.status)}).`;
  }

  const fromDetail = parseProblemBody(text);
  if (fromDetail !== undefined) {
    return fromDetail;
  }

  return text.trim().length > 0 ? text : `Request failed (HTTP ${String(res.status)}).`;
}

export async function fetchHealth(options?: {
  signal?: AbortSignal;
  timeoutMs?: number;
}): Promise<ApiResult<z.infer<typeof healthResponseSchema>>> {
  const base = getBookApiBaseUrl();
  if (!base) {
    return {
      ok: false,
      error: { message: "Set NEXT_PUBLIC_BOOK_API_URL to your API base URL (see docs/BOOK_API_INTEGRATION.md)." },
    };
  }

  const timeoutMs = options?.timeoutMs ?? DEFAULT_HEALTH_TIMEOUT_MS;
  const { signal: timeoutSignal, clear } = createTimeoutSignal(timeoutMs);
  const merged = options?.signal ? mergeSignals(options.signal, timeoutSignal) : timeoutSignal;

  try {
    const res = await fetch(`${base}/health`, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: merged,
    });

    if (!res.ok) {
      const message = await parseHttpError(res);
      return { ok: false, error: { message, status: res.status } };
    }

    let json: unknown;
    try {
      json = (await res.json()) as unknown;
    } catch {
      return { ok: false, error: { message: "Could not parse JSON from GET /health.", status: res.status } };
    }

    const parsed = healthResponseSchema.safeParse(json);
    if (!parsed.success) {
      return { ok: false, error: { message: "Unexpected GET /health response shape.", status: res.status } };
    }

    return { ok: true, data: parsed.data };
  } catch (error: unknown) {
    return {
      ok: false,
      error: { message: getErrorMessage(error, "GET /health failed.") },
    };
  } finally {
    clear();
  }
}

export async function fetchReady(options?: {
  signal?: AbortSignal;
  timeoutMs?: number;
}): Promise<ApiResult<z.infer<typeof readyResponseSchema>>> {
  const base = getBookApiBaseUrl();
  if (!base) {
    return {
      ok: false,
      error: { message: "Set NEXT_PUBLIC_BOOK_API_URL to your API base URL (see docs/BOOK_API_INTEGRATION.md)." },
    };
  }

  const timeoutMs = options?.timeoutMs ?? DEFAULT_READY_TIMEOUT_MS;
  const { signal: timeoutSignal, clear } = createTimeoutSignal(timeoutMs);
  const merged = options?.signal ? mergeSignals(options.signal, timeoutSignal) : timeoutSignal;

  try {
    const res = await fetch(`${base}/ready`, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: merged,
    });

    if (!res.ok) {
      const message = await parseHttpError(res);
      return { ok: false, error: { message, status: res.status } };
    }

    let json: unknown;
    try {
      json = (await res.json()) as unknown;
    } catch {
      return { ok: false, error: { message: "Could not parse JSON from GET /ready.", status: res.status } };
    }

    const parsed = readyResponseSchema.safeParse(json);
    if (!parsed.success) {
      return { ok: false, error: { message: "Unexpected GET /ready response shape.", status: res.status } };
    }

    return { ok: true, data: parsed.data };
  } catch (error: unknown) {
    return {
      ok: false,
      error: { message: getErrorMessage(error, "GET /ready failed.") },
    };
  } finally {
    clear();
  }
}

export async function fetchRecommendations(
  input: FetchRecommendationsInput,
  options?: { signal?: AbortSignal; timeoutMs?: number },
): Promise<ApiResult<Book[]>> {
  const base = getBookApiBaseUrl();
  if (!base) {
    return {
      ok: false,
      error: { message: "Set NEXT_PUBLIC_BOOK_API_URL to your API base URL (see docs/BOOK_API_INTEGRATION.md)." },
    };
  }

  const timeoutMs = options?.timeoutMs ?? DEFAULT_RECOMMENDATIONS_TIMEOUT_MS;
  const { signal: timeoutSignal, clear } = createTimeoutSignal(timeoutMs);
  const merged = options?.signal ? mergeSignals(options.signal, timeoutSignal) : timeoutSignal;

  const body = {
    query: input.query,
    category: input.category ?? "All",
    tone: input.tone ?? "All",
    limit: input.limit ?? 16,
  };

  try {
    const res = await fetch(`${base}/v1/recommendations`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
      signal: merged,
    });

    if (!res.ok) {
      const message = await parseHttpError(res);
      return { ok: false, error: { message, status: res.status } };
    }

    let json: unknown;
    try {
      json = (await res.json()) as unknown;
    } catch {
      return {
        ok: false,
        error: { message: "Could not parse JSON from POST /v1/recommendations.", status: res.status },
      };
    }

    const parsed = booksResponseSchema.safeParse(json);
    if (!parsed.success) {
      return {
        ok: false,
        error: { message: "Unexpected book list shape from the API.", status: res.status },
      };
    }

    return { ok: true, data: parsed.data };
  } catch (error: unknown) {
    return {
      ok: false,
      error: { message: getErrorMessage(error, "POST /v1/recommendations failed.") },
    };
  } finally {
    clear();
  }
}
