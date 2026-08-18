import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { DashboardShell } from "../components/layout/DashboardShell";
import type { RailNavItem } from "../components/layout/Rail";
import {
  IconScroll,
  IconBars,
  IconBook,
  IconBuilding,
  IconCalendar,
  IconClipboard,
  IconGraduationCap,
  IconHourglass,
  IconInbox,
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
import { SEMESTER_STATUS_TONE, mockClasses } from "../data/classDirectory";
import { sessionLabelForSemester } from "../data/allocationDirectory";
import { selectAllSemesters, type AdminSemesterView } from "../data/semesterDirectory";
import { formatSessionDateTime } from "../data/sessionDirectory";
import { mockAdminDashboardResponse } from "../data/adminDashboard";
import { mockCurrentSession } from "../data/session";
import type { SemesterStatus } from "../types/api";
import formStyles from "../components/ui/Form.module.css";
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

const STATUS_OPTIONS: SemesterStatus[] = ["Inactive", "Active", "Completed"];

const columns: Column<AdminSemesterView>[] = [
  {
    key: "class",
    header: "Class",
    render: (row) => (
      <Link to={`/admin/classes/${row.classId}`} className={styles.nameLink}>
        {row.classLabel}
      </Link>
    ),
  },
  {
    key: "semester",
    header: "Semester",
    render: (row) => (
      <Link to={`/admin/semesters/${row.semesterId}`} className={styles.nameLink}>
        Semester {row.semesterNo}
      </Link>
    ),
  },
  { key: "session", header: "Session", render: (row) => sessionLabelForSemester(row.session) },
  { key: "status", header: "Status", render: (row) => <Tag tone={SEMESTER_STATUS_TONE[row.status]}>{row.status}</Tag> },
  { key: "activation", header: "Activation deadline", render: (row) => formatSessionDateTime(row.activation_deadline) },
  { key: "closing", header: "Closing deadline", render: (row) => formatSessionDateTime(row.closing_deadline) },
];

export function SemesterListPage() {
  const admin = mockAdminDashboardResponse.admin;
  const avatarInitials = `${admin.first_name[0]}${admin.last_name[0]}`.toUpperCase();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [classId, setClassId] = useState("");

  const allSemesters = useMemo(() => selectAllSemesters(), []);
  const rows = useMemo(() => {
    return allSemesters.filter((s) => {
      if (status && s.status !== status) return false;
      if (classId && String(s.classId) !== classId) return false;
      if (search && !s.classLabel.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [allSemesters, search, status, classId]);

  return (
    <DashboardShell
      railItems={RAIL_ITEMS}
      activeRailId="semesters"
      homeHref="/admin/dashboard"
      avatarInitials={avatarInitials}
      pageTitle="Semesters"
      sessionLabel={mockCurrentSession}
      subtitle={admin.institutional_email}
      profileHref="/admin/profile"
    >
      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by class…"
        selects={[
          {
            id: "status",
            value: status,
            onChange: setStatus,
            placeholder: "All statuses",
            options: STATUS_OPTIONS.map((s) => ({ value: s, label: s })),
          },
          {
            id: "class",
            value: classId,
            onChange: setClassId,
            placeholder: "All classes",
            options: mockClasses.map((c) => ({ value: String(c.class_id), label: `${c.program}-${c.batch_year}` })),
          },
        ]}
      />
      <p className={formStyles.hint}>
        Status and class filter GET /api/admin/semesters/ directly (SemesterListAPIView.filterset_fields
        includes associated_class); search is client-side only.
      </p>

      <Panel title="Semesters" hint={`${rows.length} of ${allSemesters.length}`}>
        {rows.length > 0 ? (
          <Table columns={columns} rows={rows} rowKey={(row) => String(row.semesterId)} />
        ) : (
          <p className={styles.empty}>No semesters match these filters.</p>
        )}
      </Panel>
    </DashboardShell>
  );
}
