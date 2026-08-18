import { useMemo, useState } from "react";
import { DashboardShell } from "../components/layout/DashboardShell";
import type { RailNavItem } from "../components/layout/Rail";
import {
  IconScroll,
  IconHourglass,
  IconBars,
  IconBook,
  IconBuilding,
  IconCalendar,
  IconClipboard,
  IconGraduationCap,
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
import { Link } from "react-router-dom";
import {
  CHANGE_REQUEST_STATUS_TONE,
  CHANGE_TYPE_LABEL,
  mockChangeRequests,
  selectChangeRequestListItems,
} from "../data/changeRequests";
import { mockAdminDashboardResponse } from "../data/adminDashboard";
import { mockCurrentSession } from "../data/session";
import type { ChangeRequest } from "../types/api";
import type { ChangeRequestListItem } from "../data/changeRequests";
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

const STATUS_OPTIONS: ChangeRequest["status"][] = ["pending", "confirmed", "applied", "declined", "expired"];
const TYPE_OPTIONS: ChangeRequest["change_type"][] = ["hod_change", "faculty_delete", "student_delete", "result_calculation"];

const columns: Column<ChangeRequestListItem & { type: string; requestedBy: number; isFacultyRequested: boolean }>[] = [
  {
    key: "headline",
    header: "Request",
    render: (row) => (
      <Link to={row.detailHref} className={styles.nameLink}>
        {row.headline}
      </Link>
    ),
  },
  { key: "type", header: "Type", render: (row) => row.type },
  { key: "status", header: "Status", render: (row) => <Tag tone={CHANGE_REQUEST_STATUS_TONE[row.status]}>{row.status}</Tag> },
  {
    key: "requestedBy",
    header: "Requested by",
    render: (row) => (row.isFacultyRequested ? `Faculty #${row.requestedBy}` : `Admin #${row.requestedBy}`),
  },
  { key: "time", header: "Requested", render: (row) => row.relativeTime },
];

export function ChangeRequestListPage() {
  const admin = mockAdminDashboardResponse.admin;
  const avatarInitials = `${admin.first_name[0]}${admin.last_name[0]}`.toUpperCase();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");

  const rows = useMemo(() => {
    const filtered = mockChangeRequests.filter((cr) => {
      if (status && cr.status !== status) return false;
      if (type && cr.change_type !== type) return false;
      return true;
    });
    return selectChangeRequestListItems(filtered)
      .map((item, i) => ({
        ...item,
        type: CHANGE_TYPE_LABEL[filtered[i].change_type],
        requestedBy: filtered[i].requested_by,
        isFacultyRequested: filtered[i].change_type === "result_calculation",
      }))
      .filter((row) => !search || row.headline.toLowerCase().includes(search.toLowerCase()));
  }, [search, status, type]);

  return (
    <DashboardShell
      railItems={RAIL_ITEMS}
      activeRailId="requests"
      homeHref="/admin/dashboard"
      avatarInitials={avatarInitials}
      pageTitle="Change requests"
      sessionLabel={mockCurrentSession}
      subtitle={admin.institutional_email}
      profileHref="/admin/profile"
    >
      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by request…"
        selects={[
          {
            id: "status",
            value: status,
            onChange: setStatus,
            placeholder: "All statuses",
            options: STATUS_OPTIONS.map((s) => ({ value: s, label: s })),
          },
          {
            id: "type",
            value: type,
            onChange: setType,
            placeholder: "All types",
            options: TYPE_OPTIONS.map((t) => ({ value: t, label: CHANGE_TYPE_LABEL[t] })),
          },
        ]}
      />
      <p className={formStyles.hint}>
        Status and type filter GET /api/admin/requests/ directly (ChangeRequestListAPIView.filterset_fields);
        search is client-side only — the real endpoint has no search_fields configured.
      </p>

      <Panel title="Change requests" hint={`${rows.length} of ${mockChangeRequests.length}`}>
        {rows.length > 0 ? (
          <Table columns={columns} rows={rows} rowKey={(row) => String(row.id)} />
        ) : (
          <p className={styles.empty}>No change requests match these filters.</p>
        )}
      </Panel>
    </DashboardShell>
  );
}
