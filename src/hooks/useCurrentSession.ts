import { useEffect, useState } from "react";
import { apiGet, cached } from "../lib/auth";
import type { CurrentAcademicSession, CurrentAcademicSessionStatus } from "../types/api";
import type { StatusTone } from "../types/dashboard";

const CURRENT_SESSION_STATUS_TONE: Record<CurrentAcademicSessionStatus, StatusTone> = {
  Initiated: "warning",
  Available: "info",
  Active: "good",
};

export interface CurrentSessionPill {
  label: string;
  tone: StatusTone;
  status: CurrentAcademicSessionStatus;
  activationDeadline: string | null;
  availabilityDeadline: string | null;
  closingDeadline: string | null;
}

/**
 * GET /api/sessions/current/ is public/AllowAny (no token needed — works pre-login on LoginPage
 * too) and identical no matter which page or role asks, so it's cached() like the other small
 * reference lists. The endpoint returns a single session object or `null` (at most one session is
 * ever live at a time — see CurrentAcademicSession's doc comment). Returns the display label, the
 * same status→tone mapping the rest of the app uses for a session (Tag pills on
 * AllocationBulkPage/SessionListPage/SessionDetailPage), and the three deadlines the TopBar's
 * countdown stepper needs — or null while loading, on error, or when no session is currently live.
 */
export function useCurrentSessionPill(): CurrentSessionPill | null {
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

  if (!session) return null;
  return {
    label: `${session.period} ${session.year}`,
    tone: CURRENT_SESSION_STATUS_TONE[session.status],
    status: session.status,
    activationDeadline: session.activation_deadline,
    availabilityDeadline: session.availability_deadline,
    closingDeadline: session.closing_deadline,
  };
}
