/**
 * Defaults to the relative `/api` path, which the Vite dev proxy (vite.config.ts)
 * forwards to localhost:8000 — the backend has no CORS headers configured, so a
 * direct cross-origin fetch from the dev server would be blocked by the browser.
 * Override for a build that talks to a different origin (e.g. production).
 */
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "/api";

export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(status: number, body: unknown, message?: string) {
    super(message ?? `Request failed (${status})`);
    this.status = status;
    this.body = body;
  }
}

/** Recursively hunts a DRF error body for the first usable message — field errors on nested
 * writable serializers (e.g. FacultySerializer's `person.contact_number`) come back as objects
 * nested under their own field name, not flat, so a single-level scan misses them. */
function firstErrorString(value: unknown, depth = 0): string | null {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = firstErrorString(item, depth + 1);
      if (found) return found;
    }
    return null;
  }
  if (value && typeof value === "object" && depth < 4) {
    for (const item of Object.values(value)) {
      const found = firstErrorString(item, depth + 1);
      if (found) return found;
    }
  }
  return null;
}

/** Pulls the most useful message out of a DRF error body: `detail`, first
 * field error (nested or flat), or a plain string body — falls back to the HTTP status. */
export function apiErrorMessage(err: unknown): string {
  if (!(err instanceof ApiError)) return err instanceof Error ? err.message : "Something went wrong.";
  const body = err.body;
  if (typeof body === "string" && body) return body;
  if (body && typeof body === "object") {
    const record = body as Record<string, unknown>;
    if (typeof record.detail === "string") return record.detail;
    const found = firstErrorString(record);
    if (found) return found;
  }
  return err.message;
}

/** Flattens a DRF validation error body into {"dotted.path": message} — for marking individual
 * form fields invalid instead of only showing one generic banner. Nested writable serializers
 * (e.g. FacultySerializer's `person.contact_number`) come back as objects nested under their own
 * field name, so the path grows a segment per level. `detail` is skipped — that's a non-field
 * error (auth, 404, unexpected 500), surfaced separately via apiErrorMessage instead. */
export function apiFieldErrors(err: unknown): Record<string, string> {
  const fields: Record<string, string> = {};
  if (!(err instanceof ApiError) || !err.body || typeof err.body !== "object") return fields;

  function walk(value: unknown, path: string) {
    if (Array.isArray(value)) {
      // Two different shapes travel as arrays: plain message lists (["This field is
      // required."]) for a normal field, and — for a many=True nested serializer like
      // qualification_set — one error object PER ROW ([{}, {"total_marks": [...]}]), which
      // needs to keep descending (with the row's index folded into the path) rather than
      // being treated as a leaf.
      if (value.every((v) => typeof v === "string")) {
        const message = value.filter((v) => typeof v === "string").join(" ");
        if (message) fields[path] = message;
        return;
      }
      value.forEach((item, index) => walk(item, `${path}.${index}`));
      return;
    }
    if (value && typeof value === "object") {
      for (const [key, child] of Object.entries(value)) walk(child, path ? `${path}.${key}` : key);
      return;
    }
    if (typeof value === "string" && path) fields[path] = value;
  }

  for (const [key, value] of Object.entries(err.body as Record<string, unknown>)) {
    if (key === "detail") continue;
    walk(value, key);
  }
  return fields;
}

/** Splits a DRF error into field-level messages (for marking inputs) plus a banner message —
 * the banner is null when every error mapped to a field, so the page doesn't show the same
 * message twice; falls back to the full apiErrorMessage banner when nothing was field-shaped
 * (network failure, 401/403/404, an unexpected 500). Shared by every form page so "which field
 * failed" is answered consistently everywhere instead of one page at a time. */
export function apiFormErrors(err: unknown): { banner: string | null; fields: Record<string, string> } {
  const fields = apiFieldErrors(err);
  if (Object.keys(fields).length > 0) return { banner: null, fields };
  return { banner: apiErrorMessage(err), fields: {} };
}

/** Re-indexes "<listPrefix>.<n>.<field>" keys from the *submitted* array's positions back to the
 * form's own row positions. create/update handlers drop fully-blank qualification rows before
 * submitting (see PersonFormFields callers), so if the UI has a blank row before a filled one,
 * the backend's row index n no longer lines up with the row the user actually sees at position n
 * — without this, an error on submitted row 1 could land under the wrong visible row. */
export function remapListFieldErrors(
  fields: Record<string, string>,
  listPrefix: string,
  submittedUiIndices: number[],
): Record<string, string> {
  const re = new RegExp(`^${listPrefix}\\.(\\d+)\\.(.+)$`);
  const remapped: Record<string, string> = {};
  for (const [key, value] of Object.entries(fields)) {
    const match = re.exec(key);
    if (match) {
      const uiIndex = submittedUiIndices[Number(match[1])];
      if (uiIndex !== undefined) {
        remapped[`${listPrefix}.${uiIndex}.${match[2]}`] = value;
        continue;
      }
    }
    remapped[key] = value;
  }
  return remapped;
}

/** Splits a flat {"dotted.path": message} map (from apiFieldErrors) by a "prefix." — used to
 * route a nested serializer's errors (e.g. every "person.*" key from FacultySerializer) to the
 * sub-component that owns those fields, keeping the rest for the page's own top-level fields. */
export function splitFieldErrors(
  fields: Record<string, string>,
  prefix: string,
): { matched: Record<string, string>; rest: Record<string, string> } {
  const matched: Record<string, string> = {};
  const rest: Record<string, string> = {};
  const p = `${prefix}.`;
  for (const [key, value] of Object.entries(fields)) {
    if (key.startsWith(p)) matched[key.slice(p.length)] = value;
    else rest[key] = value;
  }
  return { matched, rest };
}
