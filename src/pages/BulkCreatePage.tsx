import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { DashboardShell } from "../components/layout/DashboardShell";
import type { RailNavItem } from "../components/layout/Rail";
import { Breadcrumbs } from "../components/ui/Breadcrumbs";
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
import { csvColumns, csvTemplate, runBulkImport, type BulkCreateResult, type BulkTargetType } from "../data/bulkImport";
import { mockAdminDashboardResponse } from "../data/adminDashboard";
import { mockCurrentSession } from "../data/session";
import formStyles from "../components/ui/Form.module.css";
import detailStyles from "./PersonDetailPage.module.css";
import styles from "./PersonCreatePage.module.css";

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

function downloadText(filename: string, text: string) {
  const blob = new Blob([text], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function BulkCreatePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const type: BulkTargetType = searchParams.get("type") === "student" ? "student" : "faculty";
  const admin = mockAdminDashboardResponse.admin;
  const avatarInitials = `${admin.first_name[0]}${admin.last_name[0]}`.toUpperCase();

  const [fileName, setFileName] = useState<string | null>(null);
  const [csvText, setCsvText] = useState<string | null>(null);
  const [result, setResult] = useState<BulkCreateResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  function setType(next: BulkTargetType) {
    setSearchParams({ type: next });
    setFileName(null);
    setCsvText(null);
    setResult(null);
    setError(null);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setResult(null);
    setError(null);
    if (!file) {
      setFileName(null);
      setCsvText(null);
      return;
    }
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setError("Only .csv files are reliably supported — the real endpoint's .xlsx handling has a content-type check bug that rejects real .xlsx uploads.");
      setFileName(null);
      setCsvText(null);
      return;
    }
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => setCsvText(String(reader.result ?? ""));
    reader.readAsText(file);
  }

  function handleImport() {
    if (!csvText) return;
    setResult(runBulkImport(type, csvText));
  }

  return (
    <DashboardShell
      railItems={RAIL_ITEMS}
      activeRailId={type === "faculty" ? "faculty" : "students"}
      homeHref="/admin/dashboard"
      avatarInitials={avatarInitials}
      pageTitle={type === "faculty" ? "Bulk import — Faculty" : "Bulk import — Students"}
      sessionLabel={mockCurrentSession}
      subtitle={admin.institutional_email}
      profileHref="/admin/profile"
    >
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/admin/dashboard" },
          type === "faculty" ? { label: "Faculty", href: "/admin/faculty" } : { label: "Students", href: "/admin/students" },
          { label: "Bulk import" },
        ]}
      />

      <div className={styles.card}>
        <h1 className={styles.headline}>Bulk import — {type === "faculty" ? "Faculty" : "Students"}</h1>
        <p className={styles.subhead}>
          Mirrors POST /api/admin/bulk/?type={type} (AdminModule/views.py::BulkCreateAPIView) — one
          endpoint handles both roles via this query param, distinguishing a{" "}
          <code>multipart/form-data</code> upload with a single <code>file</code> field. It's
          synchronous (no Celery task to poll) and returns row_count/insert_count/error_row_count
          plus a per-row error list, even when some or all rows fail — same shape reproduced below.
        </p>

        <div className={formStyles.actions}>
          <button type="button" className={formStyles.secondaryButton} onClick={() => setType("faculty")} disabled={type === "faculty"}>
            Faculty
          </button>
          <button type="button" className={formStyles.secondaryButton} onClick={() => setType("student")} disabled={type === "student"}>
            Students
          </button>
        </div>

        <div className={formStyles.row}>
          <div className={formStyles.field}>
            <label>&nbsp;</label>
            <button
              type="button"
              className={formStyles.secondaryButton}
              onClick={() => downloadText(`${type}_bulk_template.csv`, csvTemplate(type))}
            >
              Download CSV template
            </button>
            <span className={formStyles.hint}>
              Mirrors GET /api/admin/bulk/?type={type} — headers only, {csvColumns(type).length} columns.
              Qualifications flatten to degree_title_1..5 / institution_1..5 / etc; leave a slot's
              columns blank to skip it.
            </span>
          </div>
        </div>

        <div className={formStyles.row}>
          <div className={formStyles.field}>
            <label htmlFor="csvFile">CSV file</label>
            <input id="csvFile" type="file" accept=".csv" onChange={handleFileChange} />
            {fileName && <span className={formStyles.hint}>{fileName}</span>}
          </div>
          <div className={formStyles.field}>
            <label>&nbsp;</label>
            <button type="button" className={formStyles.primaryButton} onClick={handleImport} disabled={!csvText}>
              Import
            </button>
          </div>
        </div>

        {error && <div className={formStyles.errorBanner}>{error}</div>}

        {result && (
          <>
            <div className={formStyles.banner}>
              {result.row_count} row{result.row_count === 1 ? "" : "s"} read — {result.insert_count} created,{" "}
              {result.error_row_count} failed.
            </div>
            {result.errors.length > 0 && (
              <div className={detailStyles.editCard}>
                <h3 className={formStyles.sectionTitle}>Row errors</h3>
                {result.errors.map((rowError, index) => (
                  <div className={formStyles.qualRow} key={index}>
                    <strong>
                      {rowError.data_entry.first_name || rowError.data_entry.institutional_email || `Row ${index + 1}`}
                    </strong>
                    <ul>
                      {Object.entries(rowError.errors).map(([field, messages]) => (
                        <li key={field}>
                          <code>{field}</code>: {messages.join(" ")}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </DashboardShell>
  );
}
