import { useEffect, useState } from "react";
import { apiGet, cached } from "../lib/auth";
import type { CurrentAcademicSession } from "../types/api";

/**
 * GET /api/sessions/current/ is public/AllowAny (no token needed — works pre-login on LoginPage
 * too) and identical no matter which page or role asks, so it's cached() like the other small
 * reference lists. Returns the display label for the highest-priority live session (backend
 * already orders Active > Available > Initiated, so `[0]` is the one to show), or null while
 * loading, on error, or when no session is currently live at all.
 */
export function useCurrentSessionLabel(): string | null {
  const [sessions, setSessions] = useState<CurrentAcademicSession[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    cached("session:current", () => apiGet<CurrentAcademicSession[]>("/sessions/current/"))
      .then((res) => {
        if (!cancelled) setSessions(res);
      })
      .catch(() => {
        if (!cancelled) setSessions([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const current = sessions?.[0];
  return current ? `${current.period} ${current.year}` : null;
}
