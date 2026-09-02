import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ApiError, apiErrorMessage } from "../lib/api";
import { apiGet, apiMutate } from "../lib/auth";
import type { Notification, PaginatedResponse } from "../types/api";

export function useNotifications() {
  const navigate = useNavigate();
  const [items, setItems] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      apiGet<PaginatedResponse<Notification>>("/notifications/"),
      apiGet<{ unread_count: number }>("/notifications/unread-count/"),
    ])
      .then(([listRes, countRes]) => {
        if (cancelled) return;
        setItems(listRes.results);
        setUnreadCount(countRes.unread_count);
        setLoaded(true);
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
  }, [navigate, refreshKey]);

  // useCallback: these must NOT be new functions every render, or the returned
  // object below can never be stable no matter what useMemo does around it.
  const markRead = useCallback(
    async (id: number) => {
      const target = items.find((n) => n.id === id);
      if (!target || target.read_at) return;
      const readAt = new Date().toISOString();
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read_at: readAt } : n)));
      setUnreadCount((prev) => Math.max(0, prev - 1));
      try {
        await apiMutate(`/notifications/${id}/read/`, "PATCH");
      } catch {
        // Best-effort — the optimistic update stays; a future refresh reconciles if this failed.
      }
    },
    [items],
  );

  const markAllRead = useCallback(async () => {
    if (unreadCount === 0) return;
    const readAt = new Date().toISOString();
    setItems((prev) => prev.map((n) => (n.read_at ? n : { ...n, read_at: readAt })));
    setUnreadCount(0);
    try {
      await apiMutate("/notifications/mark-all-read/", "PATCH");
    } catch (err) {
      setError(apiErrorMessage(err));
      setRefreshKey((k) => k + 1);
    }
  }, [unreadCount]);

  const dismiss = useCallback(
    async (id: number) => {
      const target = items.find((n) => n.id === id);
      const wasUnread = !!target && !target.read_at;
      setItems((prev) => prev.filter((n) => n.id !== id));
      if (wasUnread) setUnreadCount((prev) => Math.max(0, prev - 1));
      try {
        await apiMutate(`/notifications/${id}/read/`, "PATCH");
      } catch {
        // Best-effort — it's already gone from view; a future refresh reconciles if this failed.
      }
    },
    [items],
  );

  // useMemo: the actual fix for the AdminDashboardPage loop. Without this,
  // even with the callbacks above stabilized, `items`/`unreadCount`/etc. still
  // get packed into a brand-new object literal every render, and that new
  // reference is what breaks AdminDashboardPage's sidePanel useMemo, which is
  // what breaks useAdminPageConfig's effect, which is the actual infinite loop.
  return useMemo(
    () => ({ items, unreadCount, loaded, error, markRead, markAllRead, dismiss }),
    [items, unreadCount, loaded, error, markRead, markAllRead, dismiss],
  );
}