import { useState } from "react";
import { DashboardShell } from "../components/layout/DashboardShell";
import type { RailNavItem } from "../components/layout/Rail";
import { IconScroll, IconHourglass, IconInbox, IconBars, IconBook, IconBuilding, IconCalendar, IconClipboard, IconGraduationCap, IconLayers, IconGrid, IconPeople, IconPerson, IconUserCheck } from "../components/icons/Icons";
import { StatTile } from "../components/ui/StatTile";
import { Panel } from "../components/ui/Panel";
import { Table, type Column } from "../components/ui/Table";
import { ChangeRequestsPanel } from "../components/ui/ChangeRequestsPanel";
import { EnrollmentTrendChart } from "../components/charts/EnrollmentTrendChart";
import { PieChart } from "../components/charts/PieChart";
import {
  mockAdminDashboardResponse,
  selectDepartmentRows,
  selectEnrollmentStatusSlices,
  selectEnrollmentTrend,
  selectStatMetrics,
} from "../data/adminDashboard";
import { mockChangeRequests, selectChangeRequestListItems } from "../data/changeRequests";
import { mockCurrentSession } from "../data/session";
import type { DepartmentRow } from "../types/dashboard";
import { Link } from "react-router-dom";
import listStyles from "./FacultyListPage.module.css";
import styles from "./AdminDashboardPage.module.css";

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
  const data = mockAdminDashboardResponse;
  const statMetrics = selectStatMetrics(data);
  const departmentRows = selectDepartmentRows(data);
  const enrollmentTrend = selectEnrollmentTrend(data);
  const enrollmentStatusSlices = selectEnrollmentStatusSlices(data);
  const changeRequestItems = selectChangeRequestListItems(
    mockChangeRequests.filter((cr) => cr.status === "pending" || cr.status === "confirmed"),
  );
  const avatarInitials = `${data.admin.first_name[0]}${data.admin.last_name[0]}`.toUpperCase();
  const [changeRequestsOpen, setChangeRequestsOpen] = useState(true);

  return (
    <DashboardShell
      railItems={RAIL_ITEMS}
      activeRailId="dashboard"
      homeHref="/admin/dashboard"
      avatarInitials={avatarInitials}
      pageTitle="Admin dashboard"
      sessionLabel={mockCurrentSession}
      subtitle={data.admin.institutional_email}
      profileHref="/admin/profile"
      sidePanel={
        <ChangeRequestsPanel
          items={changeRequestItems}
          open={changeRequestsOpen}
          onClose={() => setChangeRequestsOpen(false)}
          onOpen={() => setChangeRequestsOpen(true)}
        />
      }
    >
      <div className={styles.statGrid}>
        {statMetrics.map((metric) => (
          <StatTile key={metric.id} {...metric} />
        ))}
      </div>

      <Panel title="Departments" hint={`${departmentRows.length} departments`}>
        <Table columns={departmentColumns} rows={departmentRows} rowKey={(row) => row.departmentId} />
      </Panel>

      <div className={styles.chartsRow}>
        <Panel title="Enrollment trend" hint="By year">
          <EnrollmentTrendChart
            data={enrollmentTrend}
            formatValue={(v) => v.toLocaleString("en-US")}
            axisLabels={enrollmentTrend.map((point, i) => ({ atIndex: i, label: point.label }))}
          />
        </Panel>

        <Panel title="Enrollments by status" hint={`${data.enrollment_total.toLocaleString("en-US")} total`}>
          <PieChart data={enrollmentStatusSlices} formatValue={(v) => v.toLocaleString("en-US")} />
        </Panel>
      </div>
    </DashboardShell>
  );
}
