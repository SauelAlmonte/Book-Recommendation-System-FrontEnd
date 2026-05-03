/**
 * Normalizes caught values into a safe, human-facing message without leaking internals.
 */
export function getErrorMessage(error: unknown, fallback = "Something went wrong."): string {
  if (error instanceof DOMException && error.name === "AbortError") {
    return "The request timed out or was canceled. Try again—in production the API can take over a minute after idle.";
  }
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }
  if (typeof error === "string" && error.trim().length > 0) {
    return error;
  }
  return fallback;
}
