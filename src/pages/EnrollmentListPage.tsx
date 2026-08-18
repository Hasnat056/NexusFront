import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { DashboardShell } from "../components/layout/DashboardShell";
import type { RailNavItem } from "../components/layout/Rail";
import {
  IconScroll,
  IconHourglass,
  IconInbox,
  IconBars,
  IconBook,
  IconBuilding,
  IconCalendar,
  IconClipboard,
  IconGraduationCap,
  IconLayers,
  IconGrid,
  IconPeople,
  IconPerson,
  IconUserCheck,
} from "../components/icons/Icons";
import { Panel } from "../components/ui/Panel";
import { Table, type Column } from "../components/ui/Table";
import { FilterBar } from "../components/ui/FilterBar";
import { Tag } from "../components/ui/Tag";
import { mockEnrollments, selectEnrollmentListRows } from "../data/enrollmentDirectory";
import { mockAdminDashboardResponse } from "../data/adminDashboard";
import { mockCurrentSession } from "../data/session";
import type { EnrollmentListRow } from "../types/dashboard";
import type { EnrollmentStatus } from "../types/api";
import styles from "./FacultyListPage.module.css";

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

const STATUS_OPTIONS: EnrollmentStatus[] = ["Inactive", "Active", "Completed", "Dropped"];

const columns: Column<EnrollmentListRow>[] = [
  {
    key: "student",
    header: "Student",
    render: (row) => (
      <Link to={`/admin/students/${row.student}`} className={styles.nameLink}>
        {row.studentName}
      </Link>
    ),
  },
  { key: "allocation", header: "Allocation", render: (row) => row.allocationLabel },
  { key: "date", header: "Enrolled", render: (row) => row.enrollmentDate },
  { key: "status", header: "Status", render: (row) => <Tag tone={row.status.tone}>{row.status.label}</Tag> },
  { key: "gpa", header: "GPA", render: (row) => row.courseGpa ?? "—" },
  {
    key: "detail",
    header: "",
    render: (row) => (
      <Link to={row.detailHref} className={styles.nameLink}>
        View
      </Link>
    ),
  },
];

export function EnrollmentListPage() {
  const admin = mockAdminDashboardResponse.admin;
  const avatarInitials = `${admin.first_name[0]}${admin.last_name[0]}`.toUpperCase();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");

  const rows = useMemo(() => {
    return selectEnrollmentListRows(mockEnrollments).filter((row) => {
      if (status && row.status.label !== status) return false;
      if (search && !row.studentName.toLowerCase().includes(search.toLowerCase()) && !row.student.toLowerCase().includes(search.toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [search, status]);

  return (
    <DashboardShell
      railItems={RAIL_ITEMS}
      activeRailId="enrollments"
      homeHref="/admin/dashboard"
      avatarInitials={avatarInitials}
      pageTitle="Enrollments"
      sessionLabel={mockCurrentSession}
      subtitle={admin.institutional_email}
      profileHref="/admin/profile"
    >
      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by student…"
        selects={[
          {
            id: "status",
            value: status,
            onChange: setStatus,
            placeholder: "All statuses",
            options: STATUS_OPTIONS.map((s) => ({ value: s, label: s })),
          },
        ]}
        addHref="/admin/enrollments/new"
        addLabel="+ New enrollment"
      />

      <Panel title="Enrollments" hint={`${rows.length} of ${mockEnrollments.length}`}>
        {rows.length > 0 ? (
          <Table columns={columns} rows={rows} rowKey={(row) => String(row.enrollmentId)} />
        ) : (
          <p className={styles.empty}>No enrollments match these filters.</p>
        )}
      </Panel>
    </DashboardShell>
  );
}
