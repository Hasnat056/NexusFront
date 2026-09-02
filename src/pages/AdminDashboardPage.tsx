import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAdminPageConfig } from "../components/layout/AdminShellContext";
import { StatTile } from "../components/ui/StatTile";
import { Panel } from "../components/ui/Panel";
import { Table, type Column } from "../components/ui/Table";
import { NotificationsPanel } from "../components/ui/NotificationsPanel";
import { EnrollmentTrendChart } from "../components/charts/EnrollmentTrendChart";
import { PieChart } from "../components/charts/PieChart";
import {
  selectDepartmentRows,
  selectEnrollmentStatusSlices,
  selectEnrollmentTrend,
  selectStatMetrics,
} from "../data/adminDashboard";
import { useNotifications } from "../hooks/useNotifications";
import type { DepartmentRow } from "../types/dashboard";
import type { AdminDashboardResponse } from "../types/api";
import { apiGet } from "../lib/auth";
import { ApiError, apiErrorMessage } from "../lib/api";
import formStyles from "../components/ui/Form.module.css";
import listStyles from "./FacultyListPage.module.css";
import styles from "./AdminDashboardPage.module.css";

const departmentColumns: Column<DepartmentRow>[] = [
  {
    key: "departmentId",
    header: "Department",
    render: (row) => (
      <Link to={`/admin/departments/${row.departmentId}`} className={listStyles.nameLink}>
        {row.departmentId}
      </Link>
    ),
  },
  { key: "students", header: "Students", align: "right", render: (row) => row.studentCount },
  { key: "faculty", header: "Faculty", align: "right", render: (row) => row.facultyCount },
  { key: "programs", header: "Programs", align: "right", render: (row) => row.programCount },
];

export function AdminDashboardPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<AdminDashboardResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const notifications = useNotifications();

  useEffect(() => {
    let cancelled = false;
    apiGet<AdminDashboardResponse>("/admin/dashboard/")
      .then((res) => {
        if (!cancelled) setData(res);
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

  const sidePanel = useMemo(
    () => (
      <NotificationsPanel
        items={notifications.items}
        unreadCount={notifications.unreadCount}
        open={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        onOpen={() => setNotificationsOpen(true)}
        onMarkRead={notifications.markRead}
        onMarkAllRead={notifications.markAllRead}
        onDismiss={notifications.dismiss}
      />
    ),
    [notifications, notificationsOpen],
  );

  useAdminPageConfig("Admin dashboard", sidePanel);

  return (
    <>
      {error && <div className={formStyles.errorBanner}>{error}</div>}
      {!error && !data && <p className={styles.contentLoading}>Loading dashboard…</p>}
      {!error && data && (
        <>
          <div className={styles.statGrid}>
            {selectStatMetrics(data).map((metric) => (
              <StatTile key={metric.id} {...metric} />
            ))}
          </div>

          <Panel title="Departments" hint={`${selectDepartmentRows(data).length} departments`}>
            <Table columns={departmentColumns} rows={selectDepartmentRows(data)} rowKey={(row) => row.departmentId} />
          </Panel>

          <div className={styles.chartsRow}>
            <Panel title="Enrollment trend" hint="By year">
              <EnrollmentTrendChart
                data={selectEnrollmentTrend(data)}
                formatValue={(v) => v.toLocaleString("en-US")}
                axisLabels={selectEnrollmentTrend(data).map((point, i) => ({ atIndex: i, label: point.label }))}
              />
            </Panel>

            <Panel title="Enrollments by status" hint={`${data.enrollment_total.toLocaleString("en-US")} total`}>
              <PieChart
                data={selectEnrollmentStatusSlices(data)}
                formatValue={(v) => v.toLocaleString("en-US")}
                emptyMessage="No enrollment data yet."
              />
            </Panel>
          </div>
        </>
      )}
    </>
  );
}
