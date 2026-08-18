/**
 * There's no backend behind these mock data modules — every "write" (grading a mark, marking
 * attendance, creating a request) just mutates a plain JS array/object in memory. That's fine for
 * navigating between pages (React Router doesn't reload the module), but a hard page refresh
 * re-evaluates every module from its seed data and silently discards all progress. This persists
 * the mutable stores to localStorage so a refresh resumes from wherever the user left off, instead
 * of snapping back to the seed data.
 */
// Bump the version segment whenever seed data changes shape/content in a way that should win over
// whatever's already sitting in a browser's localStorage — otherwise loadPersisted below would
// keep preferring stale persisted data over the new seed forever.
const PREFIX = "nexus-mock:v3:";

export function loadPersisted<T>(key: string, seed: T): T {
  if (typeof window === "undefined") return seed;
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    return raw ? (JSON.parse(raw) as T) : seed;
  } catch {
    return seed;
  }
}

export function persist(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // storage full/unavailable — in-memory state for the rest of this session still works
  }
}
