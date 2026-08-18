import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { DashboardShell } from "../components/layout/DashboardShell";
import type { RailNavItem } from "../components/layout/Rail";
import { IconScroll, IconHourglass, IconInbox, IconBars, IconBook, IconBuilding, IconCalendar, IconClipboard, IconGraduationCap, IconLayers, IconGrid, IconPeople, IconPerson, IconUserCheck } from "../components/icons/Icons";
import { Panel } from "../components/ui/Panel";
import { Table, type Column } from "../components/ui/Table";
import { FilterBar } from "../components/ui/FilterBar";
import { Tag } from "../components/ui/Tag";
import { Avatar } from "../components/ui/Avatar";
import { STUDENT_STATUSES, mockStudentDirectory, selectStudentListRows } from "../data/studentDirectory";
import { PROGRAMS } from "../data/academicStructure";
import { mockAdminDashboardResponse } from "../data/adminDashboard";
import { mockCurrentSession } from "../data/session";
import type { StudentListRow } from "../types/dashboard";
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

const columns: Column<StudentListRow>[] = [
  {
    key: "avatar",
    header: "",
    render: (row) => <Avatar src={row.image} name={row.name} />,
  },
  { key: "studentId", header: "Student ID", render: (row) => row.studentId },
  {
    key: "name",
    header: "Full name",
    render: (row) => (
      <Link to={row.detailHref} className={styles.nameLink}>
        {row.name}
      </Link>
    ),
  },
  { key: "program", header: "Program", render: (row) => row.program },
  { key: "class", header: "Class", render: (row) => row.studentClass },
  { key: "status", header: "Status", render: (row) => <Tag tone={row.status.tone}>{row.status.label}</Tag> },
  { key: "email", header: "Email", render: (row) => row.email },
];

export function StudentListPage() {
  const admin = mockAdminDashboardResponse.admin;
  const avatarInitials = `${admin.first_name[0]}${admin.last_name[0]}`.toUpperCase();
  const [search, setSearch] = useState("");
  const [program, setProgram] = useState("");
  const [status, setStatus] = useState("");

  const rows = useMemo(() => {
    return selectStudentListRows(mockStudentDirectory).filter((row) => {
      if (program && row.program !== program) return false;
      if (status && row.status.label !== status) return false;
      if (search) {
        const needle = search.toLowerCase();
        if (!row.name.toLowerCase().includes(needle) && !row.email.toLowerCase().includes(needle)) return false;
      }
      return true;
    });
  }, [search, program, status]);

  return (
    <DashboardShell
      railItems={RAIL_ITEMS}
      activeRailId="students"
      homeHref="/admin/dashboard"
      avatarInitials={avatarInitials}
      pageTitle="Student directory"
      sessionLabel={mockCurrentSession}
      subtitle={admin.institutional_email}
      profileHref="/admin/profile"
    >
      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by name or email…"
        selects={[
          {
            id: "program",
            value: program,
            onChange: setProgram,
            placeholder: "All programs",
            options: PROGRAMS.map((p) => ({ value: p.program_id, label: p.program_name })),
          },
          {
            id: "status",
            value: status,
            onChange: setStatus,
            placeholder: "All statuses",
            options: STUDENT_STATUSES.map((s) => ({ value: s, label: s })),
          },
        ]}
        addHref="/admin/students/new"
        addLabel="+ New student"
        secondaryHref="/admin/bulk?type=student"
        secondaryLabel="Bulk import"
      />

      <Panel title="Students" hint={`${rows.length} of ${mockStudentDirectory.length}`}>
        {rows.length > 0 ? (
          <Table columns={columns} rows={rows} rowKey={(row) => row.studentId} />
        ) : (
          <p className={styles.empty}>No students match these filters.</p>
        )}
      </Panel>
    </DashboardShell>
  );
}
