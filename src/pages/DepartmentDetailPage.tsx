import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { DashboardShell } from "../components/layout/DashboardShell";
import type { RailNavItem } from "../components/layout/Rail";
import { IconScroll, IconHourglass, IconInbox, IconBars, IconBook, IconBuilding, IconCalendar, IconClipboard, IconGraduationCap, IconLayers, IconGrid, IconPeople, IconPerson, IconUserCheck } from "../components/icons/Icons";
import { Breadcrumbs } from "../components/ui/Breadcrumbs";
import { Panel } from "../components/ui/Panel";
import { Tag } from "../components/ui/Tag";
import { Table, type Column } from "../components/ui/Table";
import { StatStrip } from "../components/ui/StatStrip";
import { Avatar } from "../components/ui/Avatar";
import {
  getActiveHodChangeRequest,
  getDepartmentById,
  hodOptions,
  requestHodChange,
  selectDepartmentDetailStats,
  setDepartmentHod,
} from "../data/departmentDirectory";
import { getFacultyByDepartment, getFacultyById, type MockFacultyRecord } from "../data/facultyDirectory";
import { getProgramsByDepartment } from "../data/programDirectory";
import { markChangeRequestApplied, markChangeRequestDeclined } from "../data/changeRequests";
import { mockAdminDashboardResponse } from "../data/adminDashboard";
import { mockCurrentSession } from "../data/session";
import type { AdminProgram } from "../types/api";
import formStyles from "../components/ui/Form.module.css";
import detailStyles from "./PersonDetailPage.module.css";
import listStyles from "./FacultyListPage.module.css";
import styles from "./DepartmentDetailPage.module.css";

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

const programColumns: Column<AdminProgram>[] = [
  { key: "program_id", header: "Program ID", render: (p) => p.program_id },
  {
    key: "name",
    header: "Name",
    render: (p) => (
      <Link to={`/admin/programs/${p.program_id}`} className={listStyles.nameLink}>
        {p.program_name}
      </Link>
    ),
  },
  { key: "semesters", header: "Semesters", render: (p) => p.total_semesters },
];

export function DepartmentDetailPage() {
  const { departmentId } = useParams<{ departmentId: string }>();
  const department = departmentId ? getDepartmentById(departmentId) : undefined;
  const admin = mockAdminDashboardResponse.admin;
  const avatarInitials = `${admin.first_name[0]}${admin.last_name[0]}`.toUpperCase();

  const [hod, setHod] = useState(() => department?.HOD ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [, setTick] = useState(0);

  if (!department) {
    return (
      <DashboardShell
        railItems={RAIL_ITEMS}
        activeRailId="departments"
        homeHref="/admin/dashboard"
        avatarInitials={avatarInitials}
        pageTitle="Department"
        sessionLabel={mockCurrentSession}
        subtitle={admin.institutional_email}
        profileHref="/admin/profile"
      >
        <Breadcrumbs
          items={[
            { label: "Dashboard", href: "/admin/dashboard" },
            { label: "Departments", href: "/admin/departments" },
            { label: departmentId ?? "Not found" },
          ]}
        />
        <p className={detailStyles.notFound}>Department {departmentId} was not found.</p>
      </DashboardShell>
    );
  }

  const facultyOptions = hodOptions();
  const currentHod = department.HOD ? getFacultyById(department.HOD) : undefined;
  const stats = selectDepartmentDetailStats(department.department_id);
  const programs = getProgramsByDepartment(department.department_id);
  const departmentFaculty = getFacultyByDepartment(department.department_id);
  const pendingHodRequest = getActiveHodChangeRequest(department.department_id);
  const pendingHodName = pendingHodRequest?.new_hod
    ? (facultyOptions.find((f) => f.value === pendingHodRequest.new_hod)?.label ?? pendingHodRequest.new_hod)
    : null;

  function handleSubmitHodChange(e: React.FormEvent) {
    e.preventDefault();
    const result = requestHodChange(department!.department_id, hod || null);
    setMessage(result.message);
    setTick((t) => t + 1);
  }

  function handleApplyHod() {
    if (!pendingHodRequest) return;
    setDepartmentHod(department!.department_id, pendingHodRequest.new_hod);
    markChangeRequestApplied(pendingHodRequest.id);
    setMessage("HOD change applied.");
    setTick((t) => t + 1);
  }

  function handleDeclineHod() {
    if (!pendingHodRequest) return;
    markChangeRequestDeclined(pendingHodRequest.id);
    setMessage("HOD change declined.");
    setTick((t) => t + 1);
  }

  const facultyColumns: Column<MockFacultyRecord>[] = [
    { key: "id", header: "Employee ID", render: (f) => f.person.person_id },
    {
      key: "name",
      header: "Name",
      render: (f) => (
        <Link to={`/admin/faculty/${f.person.person_id}`} className={listStyles.nameLink}>
          {f.person.first_name} {f.person.last_name}
        </Link>
      ),
    },
    { key: "designation", header: "Designation", render: (f) => f.designation },
    {
      key: "role",
      header: "",
      render: (f) => (f.person.person_id === department.HOD ? <Tag tone="good">HOD</Tag> : null),
    },
  ];

  return (
    <DashboardShell
      railItems={RAIL_ITEMS}
      activeRailId="departments"
      homeHref="/admin/dashboard"
      avatarInitials={avatarInitials}
      pageTitle="Department"
      sessionLabel={mockCurrentSession}
      subtitle={admin.institutional_email}
      profileHref="/admin/profile"
    >
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/admin/dashboard" },
          { label: "Departments", href: "/admin/departments" },
          { label: department.department_name },
        ]}
      />

      {message && <div className={formStyles.banner}>{message}</div>}

      <div className={detailStyles.profileCard}>
        <div className={detailStyles.profileMain}>
          <h1 className={detailStyles.name}>{department.department_name}</h1>
          <p className={detailStyles.subline}>
            {department.department_id} · Inaugurated {department.department_inauguration_date ?? "—"}
          </p>
        </div>
        <StatStrip items={stats} />
      </div>

      <Panel title="Head of department">
        <div className={styles.hodRow}>
          <Avatar
            src={currentHod?.person.image ?? null}
            name={currentHod ? `${currentHod.person.first_name} ${currentHod.person.last_name}` : "?"}
            size={44}
          />
          <div className={styles.hodInfo}>
            <div className={styles.hodRole}>Current HOD</div>
            <div className={styles.hodName}>
              {currentHod ? `${currentHod.person.first_name} ${currentHod.person.last_name}` : "Unassigned"}
            </div>
            {currentHod && (
              <div className={styles.hodSub}>
                {currentHod.person.person_id} · {currentHod.designation}
              </div>
            )}
          </div>
          <form className={styles.hodEditRow} onSubmit={handleSubmitHodChange}>
            <select className={styles.hodSelect} value={hod} onChange={(e) => setHod(e.target.value)}>
              <option value="">Unassigned</option>
              {facultyOptions.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
            <button type="submit" className={formStyles.primaryButton}>
              Submit change
            </button>
          </form>
        </div>

        {pendingHodRequest && (
          <div className={styles.pillReview}>
            <Tag tone="warning">{`HOD change ${pendingHodRequest.status}`}</Tag>
            <span className={styles.pillWho}>
              {currentHod ? currentHod.person.first_name : "Unassigned"} → {pendingHodName}
            </span>
            <span className={styles.pillDivider} />
            <button type="button" className={`${styles.pillBtn} ${styles.apply}`} onClick={handleApplyHod}>
              Apply
            </button>
            <button type="button" className={`${styles.pillBtn} ${styles.decline}`} onClick={handleDeclineHod}>
              Decline
            </button>
          </div>
        )}
      </Panel>

      <Panel title="Programs" hint={`${programs.length} offered`}>
        {programs.length > 0 ? (
          <Table columns={programColumns} rows={programs} rowKey={(p) => p.program_id} />
        ) : (
          <p className={detailStyles.empty}>No programs in this department yet.</p>
        )}
      </Panel>

      <Panel title="Faculty" hint={`${departmentFaculty.length} members`}>
        {departmentFaculty.length > 0 ? (
          <Table columns={facultyColumns} rows={departmentFaculty} rowKey={(f) => f.person.person_id} />
        ) : (
          <p className={detailStyles.empty}>No faculty in this department yet.</p>
        )}
      </Panel>
    </DashboardShell>
  );
}
