import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { DashboardShell } from "../components/layout/DashboardShell";
import { FACULTY_RAIL_ITEMS } from "../components/layout/facultyRailItems";
import { Panel } from "../components/ui/Panel";
import { Table, type Column } from "../components/ui/Table";
import { FilterBar } from "../components/ui/FilterBar";
import { Tag } from "../components/ui/Tag";
import { CHANGE_REQUEST_STATUS_LABEL, CHANGE_REQUEST_STATUS_TONE, formatRelativeTime } from "../data/changeRequests";
import { extractIdFromUrl, facultyRequestHeadline } from "../data/facultyRequests";
import { apiGet, apiGetAllPages } from "../lib/auth";
import { ApiError, apiErrorMessage } from "../lib/api";
import type { ChangeRequestStatus, FacultyChangeRequest, FacultyDashboardResponse } from "../types/api";
import formStyles from "../components/ui/Form.module.css";
import styles from "./FacultyListPage.module.css";

const STATUS_OPTIONS: ChangeRequestStatus[] = ["pending", "confirmed", "applied", "declined", "expired"];

interface Row {
  key: string;
  headline: string;
  status: ChangeRequestStatus;
  relativeTime: string;
}

export function FacultyRequestListPage() {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState<FacultyDashboardResponse | null>(null);
  const [requests, setRequests] = useState<FacultyChangeRequest[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      apiGet<FacultyDashboardResponse>("/faculty/dashboard/"),
      apiGetAllPages<FacultyChangeRequest>("/faculty/requests/"),
    ])
      .then(([dashboardRes, requestsRes]) => {
        if (cancelled) return;
        setDashboard(dashboardRes);
        setRequests(requestsRes);
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

  const rows: Row[] = useMemo(() => {
    return (requests ?? []).map((r) => ({
      key: extractIdFromUrl(r.urls),
      headline: facultyRequestHeadline(r),
      status: r.status,
      relativeTime: formatRelativeTime(r.requested_at),
    }));
  }, [requests]);

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      if (status && row.status !== status) return false;
      if (search && !row.headline.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [rows, status, search]);

  const columns: Column<Row>[] = [
    {
      key: "headline",
      header: "Request",
      render: (row) => (
        <Link to={`/faculty/requests/${row.key}`} className={styles.nameLink}>
          {row.headline}
        </Link>
      ),
    },
    { key: "status", header: "Status", render: (row) => <Tag tone={CHANGE_REQUEST_STATUS_TONE[row.status]}>{CHANGE_REQUEST_STATUS_LABEL[row.status]}</Tag> },
    { key: "time", header: "Requested", render: (row) => row.relativeTime },
  ];

  const avatarInitials = dashboard ? `${dashboard.faculty.first_name[0]}${dashboard.faculty.last_name[0]}`.toUpperCase() : "—";

  if (error) {
    return (
      <DashboardShell railItems={FACULTY_RAIL_ITEMS} activeRailId="requests" homeHref="/faculty/dashboard" profileHref="/faculty/profile" avatarInitials={avatarInitials} pageTitle="Requests" subtitle="">
        <div className={formStyles.errorBanner}>{error}</div>
      </DashboardShell>
    );
  }

  if (!dashboard) {
    return (
      <DashboardShell railItems={FACULTY_RAIL_ITEMS} activeRailId="requests" homeHref="/faculty/dashboard" profileHref="/faculty/profile" avatarInitials={avatarInitials} pageTitle="Requests" subtitle="">
        <p className={styles.empty}>Loading requests…</p>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell
      railItems={FACULTY_RAIL_ITEMS}
      activeRailId="requests"
      homeHref="/faculty/dashboard"
      profileHref="/faculty/profile"
      avatarInitials={avatarInitials}
      avatarSrc={dashboard.faculty.image}
      pageTitle="Requests"
      subtitle={dashboard.faculty.institutional_email}
    >
      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by request…"
        selects={[
          {
            id: "status",
            value: status,
            onChange: setStatus,
            placeholder: "All statuses",
            options: STATUS_OPTIONS.map((s) => ({ value: s, label: CHANGE_REQUEST_STATUS_LABEL[s] })),
          },
        ]}
      />

      <Panel title="My requests" hint={requests ? `${filteredRows.length} of ${requests.length}` : undefined}>
        {requests && filteredRows.length > 0 && <Table columns={columns} rows={filteredRows} rowKey={(row) => row.key} />}
        {requests && filteredRows.length === 0 && <p className={styles.empty}>No requests match these filters.</p>}
      </Panel>
    </DashboardShell>
  );
}
