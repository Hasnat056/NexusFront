import { API_BASE_URL, ApiError } from "./api";

export const ROLES = ["Admin", "Faculty", "Student"] as const;
export type Role = (typeof ROLES)[number];

const ROLE_SLUG: Record<Role, string> = {
  Admin: "admin",
  Faculty: "faculty",
  Student: "student",
};

const ACCESS_TOKEN_KEY = "nexus_access_token";
const REFRESH_TOKEN_KEY = "nexus_refresh_token";
const ROLE_KEY = "nexus_role";

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getStoredRole(): Role | null {
  const role = localStorage.getItem(ROLE_KEY);
  return role && (ROLES as readonly string[]).includes(role) ? (role as Role) : null;
}

export function isAuthenticated(): boolean {
  return getAccessToken() !== null && getStoredRole() !== null;
}

function setSession(access: string, refresh: string, role: Role) {
  localStorage.setItem(ACCESS_TOKEN_KEY, access);
  localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
  localStorage.setItem(ROLE_KEY, role);
}

export function clearSession() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(ROLE_KEY);
  requestCache.clear();
}

/**
 * POST /api/token/ returns only {access, refresh} — no user id, name, or role.
 * There's also no "current user" endpoint on the backend, so the role picked
 * on the login form is confirmed by calling that role's own /profile/ route:
 * 200 means the account is actually in that role's group, 403 means the
 * credentials were fine but belong to a different role.
 */
export async function login(username: string, password: string, role: Role): Promise<void> {
  let tokenRes: Response;
  try {
    tokenRes = await fetch(`${API_BASE_URL}/token/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
  } catch {
    throw new ApiError(0, null, "Couldn't reach the server. Is the backend running?");
  }

  if (!tokenRes.ok) {
    if (tokenRes.status === 401) throw new ApiError(401, null, "Incorrect username or password.");
    const body = await tokenRes.json().catch(() => null);
    throw new ApiError(tokenRes.status, body);
  }
  const tokens = (await tokenRes.json()) as { access: string; refresh: string };

  let profileRes: Response;
  try {
    profileRes = await fetch(`${API_BASE_URL}/${ROLE_SLUG[role]}/profile/`, {
      headers: { Authorization: `Bearer ${tokens.access}` },
    });
  } catch {
    throw new ApiError(0, null, "Signed in, but couldn't confirm your role. Is the backend running?");
  }

  if (profileRes.status === 403) {
    throw new ApiError(403, null, `This account isn't registered as ${role}. Try a different role.`);
  }
  if (!profileRes.ok) {
    const body = await profileRes.json().catch(() => null);
    throw new ApiError(profileRes.status, body, "Signed in, but couldn't confirm your role.");
  }

  setSession(tokens.access, tokens.refresh, role);
}

export function logout() {
  clearSession();
}

interface AuthedFetchOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
}

async function authedFetch(url: string, options: AuthedFetchOptions = {}): Promise<Response> {
  const token = getAccessToken();
  const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
  let body: BodyInit | undefined;
  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(options.body);
  }

  let res: Response;
  try {
    res = await fetch(url, { method: options.method ?? "GET", headers, body });
  } catch {
    throw new ApiError(0, null, "Couldn't reach the server. Is the backend running?");
  }

  if (res.status === 401) {
    clearSession();
    throw new ApiError(401, null, "Your session expired. Please sign in again.");
  }
  if (!res.ok) {
    const errBody = await res.json().catch(() => null);
    throw new ApiError(res.status, errBody);
  }
  return res;
}

/**
 * Authenticated GET against the API. Access tokens last 60 minutes and there's
 * no refresh wired up yet, so a 401 here just means "session expired" — the
 * session is cleared and the caller is expected to redirect to /login.
 */
export async function apiGet<T>(path: string): Promise<T> {
  const res = await authedFetch(`${API_BASE_URL}${path}`);
  return res.json() as Promise<T>;
}

/** Authenticated POST/PUT/PATCH/DELETE with a JSON body. DELETE (and any 204) resolves to
 * undefined — there's nothing to parse. */
export async function apiMutate<T>(
  path: string,
  method: "POST" | "PUT" | "PATCH" | "DELETE",
  body?: unknown,
): Promise<T> {
  const res = await authedFetch(`${API_BASE_URL}${path}`, { method, body });
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

/** Authenticated multipart/form-data POST/PATCH — for endpoints that need a file upload
 * (Person.image). DRF's multipart parser supports dotted nested keys for writable nested
 * serializers (e.g. "person.first_name", "person.address.country") but NOT indexed nested
 * lists ("person.qualification_set[0].x" silently fails) — send list fields as JSON instead. */
export async function apiMutateForm<T>(path: string, method: "POST" | "PUT" | "PATCH", form: FormData): Promise<T> {
  const token = getAccessToken();
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });
  } catch {
    throw new ApiError(0, null, "Couldn't reach the server. Is the backend running?");
  }
  if (res.status === 401) {
    clearSession();
    throw new ApiError(401, null, "Your session expired. Please sign in again.");
  }
  if (!res.ok) {
    const errBody = await res.json().catch(() => null);
    throw new ApiError(res.status, errBody);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

/** Authenticated GET for a non-JSON response (e.g. the bulk-import CSV template, served as a
 * real file download with a Content-Disposition header) — returns the raw Blob instead of
 * parsing it as JSON. */
export async function apiGetBlob(path: string): Promise<Blob> {
  const res = await authedFetch(`${API_BASE_URL}${path}`);
  return res.blob();
}

interface PageResponse<T> {
  next: string | null;
  results: T[];
}

/**
 * Follows `next` until exhausted. Only for small, bounded reference lists
 * (e.g. populating a filter dropdown) — real paginated resources (like the
 * faculty directory) should stay paginated rather than being fetched whole.
 */
export async function apiGetAllPages<T>(path: string): Promise<T[]> {
  let res = await apiGet<PageResponse<T>>(path);
  const all = [...res.results];
  while (res.next) {
    const page = await authedFetch(res.next);
    res = (await page.json()) as PageResponse<T>;
    all.push(...res.results);
  }
  return all;
}

const requestCache = new Map<string, Promise<unknown>>();

/**
 * Memoizes a fetch by key for the lifetime of the session — for data that's
 * identical no matter which page asks for it (the signed-in user's own
 * identity, small reference lists like departments/programs). Every wired-up
 * page was independently re-fetching these on every navigation, which is why
 * navigating felt jerky: the shell was gated behind a fetch that had almost
 * always already happened. Cleared on logout via clearSession().
 */
export function cached<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  const hit = requestCache.get(key);
  if (hit) return hit as Promise<T>;
  const promise = fetcher().catch((err: unknown) => {
    requestCache.delete(key);
    throw err;
  });
  requestCache.set(key, promise);
  return promise;
}

/** Drop a cached() entry — call after a mutation that changes what that key's
 * fetcher would return (e.g. creating/deleting a program invalidates
 * "admin:programs"), so the next page that asks for it fetches fresh instead
 * of replaying stale data for the rest of the session. */
export function invalidateCache(key: string) {
  requestCache.delete(key);
}

