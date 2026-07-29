/**
 * Helpers for the post-auth "send me back where I was" redirect (`?next=`).
 *
 * We read the param from `window.location` rather than `useSearchParams` on
 * purpose: in Next 16 a statically-prerendered client page that calls
 * `useSearchParams` without a `<Suspense>` boundary fails the production build.
 * These helpers only ever run client-side (effects / submit handlers), so
 * `window` is always defined.
 */

/**
 * Accept a redirect target only if it's a safe internal path. Rejects external
 * URLs and protocol-relative (`//host`) targets so `?next=` can't be used as an
 * open redirect.
 */
export function sanitizeNextPath(raw: string | null | undefined): string | null {
  if (!raw) return null;
  if (!raw.startsWith("/") || raw.startsWith("//")) return null;
  return raw;
}

/** The sanitized `?next=` target from the current URL, or `null`. Client-only. */
export function readNextPath(): string | null {
  if (typeof window === "undefined") return null;
  return sanitizeNextPath(new URLSearchParams(window.location.search).get("next"));
}

/** The path+query the app should return to after login — the current location. */
export function currentReturnTarget(): string {
  if (typeof window === "undefined") return "/dashboard";
  return window.location.pathname + window.location.search;
}
