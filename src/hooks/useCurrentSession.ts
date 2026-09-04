import { useEffect, useState } from "react";
import { apiGet, cached } from "../lib/auth";
import type { CurrentAcademicSession } from "../types/api";

/**
 * GET /api/sessions/current/ is public/AllowAny (no token needed — works pre-login on LoginPage
 * too) and identical no matter which page or role asks, so it's cached() like the other small
 * reference lists. The endpoint returns a single session object or `null` (at most one session is
 * ever live at a time — see CurrentAcademicSession's doc comment). Returns the display label for
 * that session, or null while loading, on error, or when no session is currently live at all.
 */
export function useCurrentSessionLabel(): string | null {
  const [session, setSession] = useState<CurrentAcademicSession | null>(null);

  useEffect(() => {
    let cancelled = false;
    cached("session:current", () => apiGet<CurrentAcademicSession | null>("/sessions/current/"))
      .then((res) => {
        if (!cancelled) setSession(res);
      })
      .catch(() => {
        if (!cancelled) setSession(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return session ? `${session.period} ${session.year}` : null;
}
