import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { DashboardShell } from "../components/layout/DashboardShell";
import type { RailNavItem } from "../components/layout/Rail";
import { IconBook, IconGrid, IconPerson } from "../components/icons/Icons";
import { Breadcrumbs } from "../components/ui/Breadcrumbs";
import { Tag } from "../components/ui/Tag";
import { CHANGE_REQUEST_STATUS_LABEL, CHANGE_REQUEST_STATUS_TONE } from "../data/changeRequests";
import { facultyRequestHeadline, getFacultyRequestByKey, markRequestApplied } from "../data/facultyRequests";
import { applyResultCalculation, countUngradedForAllocation } from "../data/facultyAllocationDetail";
import { mockFacultyDashboardResponse } from "../data/facultyDashboard";
import formStyles from "../components/ui/Form.module.css";
import styles from "./ChangeRequestDetailPage.module.css";

const RAIL_ITEMS: RailNavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: IconGrid, href: "/faculty/dashboard" },
  { id: "allocations", label: "Allocations", icon: IconBook, href: "/faculty/allocations" },
  { id: "profile", label: "Profile", icon: IconPerson, href: "/faculty/profile" },
];

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

export function FacultyRequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [, setTick] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const dashboard = mockFacultyDashboardResponse;
  const avatarInitials = `${dashboard.faculty.first_name[0]}${dashboard.faculty.last_name[0]}`.toUpperCase();

  const request = id ? getFacultyRequestByKey(id) : undefined;

  if (!request) {
    return (
      <DashboardShell
        railItems={RAIL_ITEMS}
        activeRailId="dashboard"
        homeHref="/faculty/dashboard"
        avatarInitials={avatarInitials}
        pageTitle="Request"
        subtitle={dashboard.faculty.institutional_email}
      >
        <Breadcrumbs items={[{ label: "Dashboard", href: "/faculty/dashboard" }, { label: id ?? "Not found" }]} />
        <p className={styles.notFound}>Request {id} was not found.</p>
      </DashboardShell>
    );
  }

  const applicable = request.status === "confirmed" && request.target_allocation !== null;

  function handleApply() {
    if (request!.target_allocation === null) return;
    const ungraded = countUngradedForAllocation(request!.target_allocation);
    if (ungraded > 0) {
      setError(`${ungraded} assessment mark(s) are still ungraded — grade every student before applying result calculation.`);
      setMessage(null);
      return;
    }
    const result = applyResultCalculation(request!.target_allocation);
    if (typeof result === "string") {
      setError(result);
      setMessage(null);
      return;
    }
    markRequestApplied(request!.urls);
    setError(null);
    setMessage("Results calculated — allocation marked Completed.");
    setTick((t) => t + 1);
  }

  return (
    <DashboardShell
      railItems={RAIL_ITEMS}
      activeRailId="dashboard"
      homeHref="/faculty/dashboard"
      avatarInitials={avatarInitials}
      pageTitle="Request"
      subtitle={dashboard.faculty.institutional_email}
    >
      <Breadcrumbs items={[{ label: "Dashboard", href: "/faculty/dashboard" }, { label: facultyRequestHeadline(request) }]} />

      <div className={styles.card}>
        <div className={styles.head}>
          <h1 className={styles.headline}>{facultyRequestHeadline(request)}</h1>
          <Tag tone={CHANGE_REQUEST_STATUS_TONE[request.status]}>{CHANGE_REQUEST_STATUS_LABEL[request.status]}</Tag>
        </div>

        {message && <div className={formStyles.banner}>{message}</div>}
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
            <button type="button" className={formStyles.primaryButton} onClick={handleApply}>
              Apply
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
