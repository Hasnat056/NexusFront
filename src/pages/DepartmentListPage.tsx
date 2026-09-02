import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAdminPageConfig } from "../components/layout/AdminShellContext";
import { Panel } from "../components/ui/Panel";
import { Table, type Column } from "../components/ui/Table";
import { StatTile } from "../components/ui/StatTile";
import { PieChart } from "../components/charts/PieChart";
import { apiGet, apiGetAllPages, cached } from "../lib/auth";
import { ApiError, apiErrorMessage } from "../lib/api";
import type { AdminDashboardResponse, AdminDepartment, AdminFacultyListItem } from "../types/api";
import type { CategorySlice, StatMetric } from "../types/dashboard";
import formStyles from "../components/ui/Form.module.css";
import styles from "./FacultyListPage.module.css";
import dashboardStyles from "./AdminDashboardPage.module.css";
import listStyles from "./DepartmentListPage.module.css";

interface DepartmentRow {
  departmentId: string;
  departmentName: string;
  inaugurationDate: string | null;
  hodName: string;
  detailHref: string;
}

// Okabe-Ito palette — colorblind-safe categorical colors — assigned by index since the
// real department set isn't a fixed known list the way the old mock's was.
const CATEGORY_PALETTE = ["#0072B2", "#E69F00", "#009E73", "#D55E00", "#56B4E9", "#CC79A7", "#F0E442", "#999999"];

const columns: Column<DepartmentRow>[] = [
  { key: "departmentId", header: "Department ID", render: (row) => row.departmentId },
  {
    key: "name",
    header: "Name",
    render: (row) => (
      <Link to={row.detailHref} className={styles.nameLink}>
        {row.departmentName}
      </Link>
    ),
  },
  { key: "inaugurated", header: "Inaugurated", render: (row) => row.inaugurationDate ?? "—" },
  { key: "hod", header: "Head of department", render: (row) => row.hodName },
];

export function DepartmentListPage() {
  useAdminPageConfig("Departments");
  const navigate = useNavigate();
  const [departments, setDepartments] = useState<AdminDepartment[] | null>(null);
  const [dashboard, setDashboard] = useState<AdminDashboardResponse | null>(null);
  const [facultyById, setFacultyById] = useState<Map<string, string>>(new Map());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      cached("admin:departments", () => apiGetAllPages<AdminDepartment>("/admin/departments/")),
      apiGet<AdminDashboardResponse>("/admin/dashboard/"),
      cached("admin:all-faculty", () => apiGetAllPages<AdminFacultyListItem>("/admin/faculty/")),
    ])
      .then(([departmentsRes, dashboardRes, facultyRes]) => {
        if (cancelled) return;
        setDepartments(departmentsRes);
        setDashboard(dashboardRes);
        setFacultyById(new Map(facultyRes.map((f) => [f.person.person_id, `${f.person.first_name} ${f.person.last_name}`])));
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

  if (error) {
    return <div className={formStyles.errorBanner}>{error}</div>;
  }

  if (!departments || !dashboard) {
    return <p className={styles.empty}>Loading departments…</p>;
  }

  const rows: DepartmentRow[] = departments.map((d) => ({
    departmentId: d.department_id,
    departmentName: d.department_name,
    inaugurationDate: d.department_inauguration_date,
    hodName: d.HOD ? (facultyById.get(d.HOD) ?? d.HOD) : "Unassigned",
    detailHref: `/admin/departments/${d.department_id}`,
  }));

  const withHod = departments.filter((d) => d.HOD).length;
  const totalFaculty = dashboard.departments_data.reduce((sum, d) => sum + d.faculty_count, 0);
  const totalStudents = dashboard.departments_data.reduce((sum, d) => sum + d.student_count, 0);
  const statMetrics: StatMetric[] = [
    { id: "departments", label: "Departments", value: departments.length.toLocaleString("en-US") },
    { id: "hod-assigned", label: "HOD assigned", value: `${withHod} of ${departments.length}` },
    { id: "faculty", label: "Faculty", value: totalFaculty.toLocaleString("en-US") },
    { id: "students", label: "Students", value: totalStudents.toLocaleString("en-US") },
  ];

  const studentSlices: CategorySlice[] = dashboard.departments_data.map((d, i) => ({
    id: d.department_id,
    label: d.department_id,
    value: d.student_count,
    color: CATEGORY_PALETTE[i % CATEGORY_PALETTE.length],
  }));
  const facultySlices: CategorySlice[] = dashboard.departments_data.map((d, i) => ({
    id: d.department_id,
    label: d.department_id,
    value: d.faculty_count,
    color: CATEGORY_PALETTE[i % CATEGORY_PALETTE.length],
  }));

  return (
    <>
      <div className={dashboardStyles.statGrid}>
        {statMetrics.map((metric) => (
          <StatTile key={metric.id} {...metric} />
        ))}
      </div>

      <div className={listStyles.pieRow}>
        <Panel title="Students by department" hint="From the dashboard's own per-department counts">
          <PieChart data={studentSlices} formatValue={(v) => v.toLocaleString("en-US")} emptyMessage="No students yet." />
        </Panel>
        <Panel title="Faculty by department" hint="Same per-department counts">
          <PieChart data={facultySlices} formatValue={(v) => v.toLocaleString("en-US")} emptyMessage="No faculty yet." />
        </Panel>
      </div>

      <Panel title="Departments" hint={`${rows.length} departments`}>
        <Table columns={columns} rows={rows} rowKey={(row) => row.departmentId} />
      </Panel>
    </>
  );
}
