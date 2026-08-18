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
import { mockAllocations, selectAllocationListRows } from "../data/allocationDirectory";
import { mockAdminDashboardResponse } from "../data/adminDashboard";
import { mockCurrentSession } from "../data/session";
import type { AllocationListRow } from "../types/dashboard";
import type { CourseAllocationStatus } from "../types/api";
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

const STATUS_OPTIONS: CourseAllocationStatus[] = ["Inactive", "Ongoing", "Completed", "Cancelled"];

const columns: Column<AllocationListRow>[] = [
  {
    key: "faculty",
    header: "Faculty",
    render: (row) => (
      <Link to={`/admin/faculty/${row.faculty}`} className={styles.nameLink}>
        {row.faculty}
      </Link>
    ),
  },
  {
    key: "course",
    header: "Course",
    render: (row) => (
      <Link to={`/admin/courses/${row.course}`} className={styles.nameLink}>
        {row.course}
      </Link>
    ),
  },
  { key: "semester", header: "Semester", render: (row) => row.semesterLabel },
  { key: "session", header: "Session", render: (row) => row.session },
  { key: "status", header: "Status", render: (row) => <Tag tone={row.status.tone}>{row.status.label}</Tag> },
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

export function AllocationListPage() {
  const admin = mockAdminDashboardResponse.admin;
  const avatarInitials = `${admin.first_name[0]}${admin.last_name[0]}`.toUpperCase();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");

  const rows = useMemo(() => {
    return selectAllocationListRows(mockAllocations).filter((row) => {
      if (status && row.status.label !== status) return false;
      if (search) {
        const needle = search.toLowerCase();
        if (!row.faculty.toLowerCase().includes(needle) && !row.course.toLowerCase().includes(needle)) return false;
      }
      return true;
    });
  }, [search, status]);

  return (
    <DashboardShell
      railItems={RAIL_ITEMS}
      activeRailId="allocations"
      homeHref="/admin/dashboard"
      avatarInitials={avatarInitials}
      pageTitle="Allocations"
      sessionLabel={mockCurrentSession}
      subtitle={admin.institutional_email}
      profileHref="/admin/profile"
    >
      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by faculty or course…"
        selects={[
          {
            id: "status",
            value: status,
            onChange: setStatus,
            placeholder: "All statuses",
            options: STATUS_OPTIONS.map((s) => ({ value: s, label: s })),
          },
        ]}
        addHref="/admin/allocations/new"
        addLabel="+ New allocation"
      />

      <Panel title="Allocations" hint={`${rows.length} of ${mockAllocations.length}`}>
        {rows.length > 0 ? (
          <Table columns={columns} rows={rows} rowKey={(row) => String(row.allocationId)} />
        ) : (
          <p className={styles.empty}>No allocations match these filters.</p>
        )}
      </Panel>
    </DashboardShell>
  );
}
