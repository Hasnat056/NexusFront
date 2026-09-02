import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ApiError, apiErrorMessage } from "../lib/api";
import { apiGet, cached } from "../lib/auth";
import type { AdminSelfProfile } from "../types/api";

/**
 * The signed-in admin's own identity (for the top bar) — fetched once per
 * session via `cached()` and shared across every admin page, instead of each
 * page re-fetching it on every navigation.
 */
export function useAdminIdentity() {
  const navigate = useNavigate();
  const [admin, setAdmin] = useState<AdminSelfProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    cached("admin:profile", () => apiGet<AdminSelfProfile>("/admin/profile/"))
      .then((res) => {
        if (!cancelled) setAdmin(res);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          navigate("/login", { replace: true });
          return;
        }
        setError(apiErrorMessage(err));
      });
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  const avatarInitials = admin ? `${admin.person.first_name[0]}${admin.person.last_name[0]}`.toUpperCase() : "";
  const avatarSrc = admin?.person.image ?? null;
  const subtitle = admin?.person.institutional_email ?? "";

  return { admin, avatarInitials, avatarSrc, subtitle, error };
}
