import { Link } from "react-router-dom";
import { DashboardShell } from "../components/layout/DashboardShell";
import type { RailNavItem } from "../components/layout/Rail";
import { IconScroll, IconHourglass, IconInbox, IconBars, IconBook, IconBuilding, IconCalendar, IconClipboard, IconGraduationCap, IconLayers, IconGrid, IconPeople, IconPerson, IconUserCheck } from "../components/icons/Icons";
import { Panel } from "../components/ui/Panel";
import { Table, type Column } from "../components/ui/Table";
import { StatTile } from "../components/ui/StatTile";
import { PieChart } from "../components/charts/PieChart";
import {
  mockDepartments,
  selectDepartmentFacultySlices,
  selectDepartmentListRows,
  selectDepartmentStatMetrics,
  selectDepartmentStudentSlices,
} from "../data/departmentDirectory";
import { mockAdminDashboardResponse } from "../data/adminDashboard";
import { mockCurrentSession } from "../data/session";
import type { DepartmentListRow } from "../types/dashboard";
import styles from "./FacultyListPage.module.css";
import dashboardStyles from "./AdminDashboardPage.module.css";
import listStyles from "./DepartmentListPage.module.css";

const RAIL_ITEMS: RailNavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: IconGrid, href: "/admin/dashboard" },
  { id: "faculty", label: "Faculty", icon: IconPerson, href: "/admin/faculty" },
  { id: "students", label: "Students", icon: IconPeople, href: "/admin/students" },
  { id: "departments", label: "Departments", icon: IconBuilding, href: "/admin/departments" },
  { id: "programs", label: "Programs", icon: IconLayers, href: "/admin/programs" },
  { id: "courses", label: "Courses", icon: IconBook, href: "/admin/courses" },
  { id: "classes", label: "Classes", icon: IconGraduationCap, href: "/admin/classes" },
  { id: "allocations", label: "Allocations", icon: IconClipboard, href: "/admin/allocations" },
  { id: "enrollments", label: "Enrollments", icon: IconUserCheck, href: "/admin/enrollments" },
  { id: "sessions", label: "Sessions", icon: IconCalendar, href: "/admin/sessions" },
  { id: "semesters", label: "Semesters", icon: IconHourglass, href: "/admin/semesters" },
  { id: "transcripts", label: "Transcripts", icon: IconScroll, href: "/admin/transcripts" },
  { id: "requests", label: "Requests", icon: IconInbox, href: "/admin/requests" },
  { id: "reports", label: "Reports", icon: IconBars },
];

const columns: Column<DepartmentListRow>[] = [
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
  const admin = mockAdminDashboardResponse.admin;
  const avatarInitials = `${admin.first_name[0]}${admin.last_name[0]}`.toUpperCase();
  const rows = selectDepartmentListRows(mockDepartments);
  const statMetrics = selectDepartmentStatMetrics(mockDepartments);
  const studentSlices = selectDepartmentStudentSlices();
  const facultySlices = selectDepartmentFacultySlices();

  return (
    <DashboardShell
      railItems={RAIL_ITEMS}
      activeRailId="departments"
      homeHref="/admin/dashboard"
      avatarInitials={avatarInitials}
      pageTitle="Departments"
      sessionLabel={mockCurrentSession}
      subtitle={admin.institutional_email}
      profileHref="/admin/profile"
    >
      <div className={dashboardStyles.statGrid}>
        {statMetrics.map((metric) => (
          <StatTile key={metric.id} {...metric} />
        ))}
      </div>

      <div className={listStyles.pieRow}>
        <Panel title="Students by department" hint="From the dashboard's own per-department counts">
          <PieChart data={studentSlices} formatValue={(v) => v.toLocaleString("en-US")} />
        </Panel>
        <Panel title="Faculty by department" hint="Same per-department counts">
          <PieChart data={facultySlices} formatValue={(v) => v.toLocaleString("en-US")} />
        </Panel>
      </div>

      <Panel title="Departments" hint={`${rows.length} departments`}>
        <Table columns={columns} rows={rows} rowKey={(row) => row.departmentId} />
      </Panel>
    </DashboardShell>
  );
}
