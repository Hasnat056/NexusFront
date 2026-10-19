import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { DashboardShell } from "../components/layout/DashboardShell";
import { FACULTY_RAIL_ITEMS } from "../components/layout/facultyRailItems";
import { Breadcrumbs } from "../components/ui/Breadcrumbs";
import { Tag } from "../components/ui/Tag";
import { useToast } from "../components/ui/ToastContext";
import { CHANGE_REQUEST_STATUS_LABEL, CHANGE_REQUEST_STATUS_TONE } from "../data/changeRequests";
import { extractIdFromUrl, facultyRequestHeadline } from "../data/facultyRequests";
import { apiGet, apiGetAllPages, apiMutate } from "../lib/auth";
import { ApiError, apiErrorMessage } from "../lib/api";
import type { FacultyChangeRequest, FacultyDashboardResponse } from "../types/api";
import formStyles from "../components/ui/Form.module.css";
import styles from "./ChangeRequestDetailPage.module.css";

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

export function FacultyRequestDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { showToast } = useToast();

  const [dashboard, setDashboard] = useState<FacultyDashboardResponse | null>(null);
  const [request, setRequest] = useState<FacultyChangeRequest | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const [error, setError] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    let cancelled = false;
    // FacultyRequestsUpdateView only supports PUT/PATCH, no retrieve-by-id — the list
    // (GET /api/faculty/requests/) is the only way to fetch a single request's current state.
    Promise.all([
      apiGet<FacultyDashboardResponse>("/faculty/dashboard/"),
      apiGetAllPages<FacultyChangeRequest>("/faculty/requests/"),
    ])
      .then(([dashboardRes, requestsRes]) => {
        if (cancelled) return;
        setDashboard(dashboardRes);
        const found = requestsRes.find((r) => extractIdFromUrl(r.urls) === id);
        if (!found) {
          setNotFound(true);
          return;
        }
        setRequest(found);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          navigate("/login", { replace: true });
          return;
        }
        setLoadError(apiErrorMessage(err));
      });
    return () => {
      cancelled = true;
    };
  }, [navigate, id, refreshKey]);

  const avatarInitials = dashboard ? `${dashboard.faculty.first_name[0]}${dashboard.faculty.last_name[0]}`.toUpperCase() : "—";

  if (loadError) {
    return (
      <DashboardShell railItems={FACULTY_RAIL_ITEMS} activeRailId="requests" homeHref="/faculty/dashboard" profileHref="/faculty/profile" avatarInitials={avatarInitials} pageTitle="Request" subtitle="">
        <div className={formStyles.errorBanner}>{loadError}</div>
      </DashboardShell>
    );
  }

  if (notFound) {
    return (
      <DashboardShell
        railItems={FACULTY_RAIL_ITEMS}
        activeRailId="requests"
        homeHref="/faculty/dashboard"
        profileHref="/faculty/profile"
        avatarInitials={avatarInitials}
        pageTitle="Request"
        subtitle={dashboard?.faculty.institutional_email ?? ""}
      >
        <Breadcrumbs items={[{ label: "Dashboard", href: "/faculty/dashboard" }, { label: "Requests", href: "/faculty/requests" }, { label: id ?? "Not found" }]} />
        <p className={styles.notFound}>Request {id} was not found.</p>
      </DashboardShell>
    );
  }

  if (!dashboard || !request) {
    return (
      <DashboardShell railItems={FACULTY_RAIL_ITEMS} activeRailId="requests" homeHref="/faculty/dashboard" profileHref="/faculty/profile" avatarInitials={avatarInitials} pageTitle="Request" subtitle="">
        <p className={styles.notFound}>Loading request…</p>
      </DashboardShell>
    );
  }

  const applicable = request.status === "confirmed" && request.target_allocation !== null;

  async function handleApply() {
    setApplying(true);
    setError(null);
    try {
      await apiMutate<FacultyChangeRequest>(`/faculty/requests/${id}/`, "PUT", { status: "applied" });
      showToast("Results calculated. The allocation moves to Completed once the session closes.");
      setRefreshKey((k) => k + 1);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        navigate("/login", { replace: true });
        return;
      }
      setError(apiErrorMessage(err));
    } finally {
      setApplying(false);
    }
  }

  return (
    <DashboardShell
      railItems={FACULTY_RAIL_ITEMS}
      activeRailId="requests"
      homeHref="/faculty/dashboard"
      profileHref="/faculty/profile"
      avatarInitials={avatarInitials}
      avatarSrc={dashboard.faculty.image}
      pageTitle="Request"
      subtitle={dashboard.faculty.institutional_email}
    >
      <Breadcrumbs items={[{ label: "Dashboard", href: "/faculty/dashboard" }, { label: "Requests", href: "/faculty/requests" }, { label: facultyRequestHeadline(request) }]} />

      <div className={styles.card}>
        <div className={styles.head}>
          <h1 className={styles.headline}>{facultyRequestHeadline(request)}</h1>
          <Tag tone={CHANGE_REQUEST_STATUS_TONE[request.status]}>{CHANGE_REQUEST_STATUS_LABEL[request.status]}</Tag>
        </div>

        {error && <div className={formStyles.errorBanner}>{error}</div>}

        <dl className={styles.fields}>
          <dt>Type</dt>
          <dd>Result calculation</dd>
          {request.target_allocation !== null && (
            <>
              <dt>Allocation</dt>
              <dd>
                <Link to={`/faculty/allocations/${request.target_allocation}`}>#{request.target_allocation}</Link>
              </dd>
            </>
          )}
          <dt>Requested at</dt>
          <dd>{formatDateTime(request.requested_at)}</dd>
          <dt>Confirmed at</dt>
          <dd>{formatDateTime(request.confirmed_at)}</dd>
          <dt>Applied at</dt>
          <dd>{formatDateTime(request.applied_at)}</dd>
        </dl>

        {applicable && (
          <div className={formStyles.actions}>
            <button type="button" className={formStyles.primaryButton} onClick={handleApply} disabled={applying}>
              {applying ? "Applying…" : "Apply"}
            </button>
          </div>
        )}
        {request.status === "pending" && (
          <p className={formStyles.hint}>Waiting on admin confirmation before this can be applied.</p>
        )}
      </div>
    </DashboardShell>
  );
}
