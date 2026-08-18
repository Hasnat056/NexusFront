import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { DashboardShell } from "../components/layout/DashboardShell";
import type { RailNavItem } from "../components/layout/Rail";
import {
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
  IconScroll,
  IconUserCheck,
} from "../components/icons/Icons";
import { Panel } from "../components/ui/Panel";
import { Table, type Column } from "../components/ui/Table";
import { FilterBar } from "../components/ui/FilterBar";
import { selectAllSemesters } from "../data/semesterDirectory";
import { mockStudentDirectory } from "../data/studentDirectory";
import { mockTranscripts, selectTranscriptListRows } from "../data/transcriptDirectory";
import { mockAdminDashboardResponse } from "../data/adminDashboard";
import { mockCurrentSession } from "../data/session";
import type { TranscriptListRow } from "../types/dashboard";
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

const columns: Column<TranscriptListRow>[] = [
  {
    key: "student",
    header: "Student",
    render: (row) => (
      <Link to={row.studentHref} className={styles.nameLink}>
        {row.studentName}
      </Link>
    ),
  },
  {
    key: "semester",
    header: "Semester",
    render: (row) => (
      <Link to={row.semesterHref} className={styles.nameLink}>
        {row.semesterLabel}
      </Link>
    ),
  },
  { key: "credits", header: "Total credits", render: (row) => row.totalCredits },
  { key: "gpa", header: "Semester GPA", render: (row) => row.semesterGpa.toFixed(2) },
];

export function TranscriptListPage() {
  const admin = mockAdminDashboardResponse.admin;
  const avatarInitials = `${admin.first_name[0]}${admin.last_name[0]}`.toUpperCase();
  const [search, setSearch] = useState("");
  const [student, setStudent] = useState("");
  const [semesterId, setSemesterId] = useState("");

  const semesters = useMemo(() => selectAllSemesters(), []);

  const rows = useMemo(() => {
    return selectTranscriptListRows(mockTranscripts).filter((row) => {
      if (student && row.student !== student) return false;
      if (semesterId && String(row.semesterId) !== semesterId) return false;
      if (search && !row.studentName.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [search, student, semesterId]);

  return (
    <DashboardShell
      railItems={RAIL_ITEMS}
      activeRailId="transcripts"
      homeHref="/admin/dashboard"
      avatarInitials={avatarInitials}
      pageTitle="Transcripts"
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
            id: "student",
            value: student,
            onChange: setStudent,
            placeholder: "All students",
            options: mockStudentDirectory.map((s) => ({
              value: s.person.person_id,
              label: `${s.person.first_name} ${s.person.last_name}`,
            })),
          },
          {
            id: "semester",
            value: semesterId,
            onChange: setSemesterId,
            placeholder: "All semesters",
            options: semesters.map((s) => ({
              value: String(s.semesterId),
              label: `${s.classLabel} · Semester ${s.semesterNo}`,
            })),
          },
        ]}
      />
      <p className={formStyles.hint}>
        Mirrors GET /api/admin/transcripts/ (TranscriptListAPIView) — student and semester filter
        the real endpoint directly (filterset_fields); search matches its search_fields (student's
        person_id/first/last name). There's no create form here — generate transcripts for a whole
        semester from that semester's own page (data/transcriptDirectory.ts::generateTranscripts,
        mirroring the real POST /api/admin/semesters/&lt;id&gt;/transcripts-create/), and no way to
        edit or delete an individual one — the real API has no route for either.
      </p>

      <Panel title="Transcripts" hint={`${rows.length} of ${mockTranscripts.length}`}>
        {rows.length > 0 ? (
          <Table columns={columns} rows={rows} rowKey={(row) => `${row.student}-${row.semesterId}`} />
        ) : (
          <p className={styles.empty}>No transcripts match these filters.</p>
        )}
      </Panel>
    </DashboardShell>
  );
}
