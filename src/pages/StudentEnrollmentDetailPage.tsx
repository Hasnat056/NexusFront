import { useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { DashboardShell } from "../components/layout/DashboardShell";
import type { RailNavItem } from "../components/layout/Rail";
import { IconCalendar, IconGrid, IconPerson, IconScroll, IconTerminal, IconUserCheck } from "../components/icons/Icons";
import { Breadcrumbs } from "../components/ui/Breadcrumbs";
import { Panel } from "../components/ui/Panel";
import { Tag } from "../components/ui/Tag";
import { AssessmentCard } from "../components/ui/AssessmentCard";
import { AttendanceDots } from "../components/ui/AttendanceDots";
import type { StatusTone } from "../types/dashboard";
import type { EnrollmentStatus } from "../types/api";
import { getStudentEnrollmentById, groupAssessmentsByType, uploadAssessmentSubmission } from "../data/studentEnrollments";
import { attendancePercentageTone, getStudentAttendanceForEnrollment } from "../data/studentAttendance";
import { getReviewByEnrollmentId, saveReview } from "../data/studentReviews";
import { mockStudentDashboardResponse } from "../data/studentDashboard";
import formStyles from "../components/ui/Form.module.css";
import styles from "./PersonDetailPage.module.css";
import pageStyles from "./StudentEnrollmentDetailPage.module.css";

const RAIL_ITEMS: RailNavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: IconGrid, href: "/student/dashboard" },
  { id: "enrollments", label: "Enrollments", icon: IconUserCheck, href: "/student/enrollments" },
  { id: "transcript", label: "Transcript", icon: IconScroll, href: "/student/transcript" },
  { id: "attendance", label: "Attendance", icon: IconCalendar, href: "/student/attendance" },
  { id: "profile", label: "Profile", icon: IconPerson, href: "/student/profile" },
  { id: "scratchpad", label: "Scratchpad", icon: IconTerminal, href: "/student/scratchpad" },
];

const ENROLLMENT_STATUS_TONE: Record<EnrollmentStatus, StatusTone> = {
  Active: "good",
  Completed: "good",
  Inactive: "warning",
  Dropped: "critical",
};

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

export function StudentEnrollmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const enrollmentId = id ? Number(id) : NaN;
  const [, setTick] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pendingFiles, setPendingFiles] = useState<Record<number, File | null>>({});
  const initialReview = getReviewByEnrollmentId(enrollmentId);
  const [reviewText, setReviewText] = useState(initialReview?.review_text ?? "");
  const [reviewRating, setReviewRating] = useState(initialReview?.rating ?? 5);

  const dashboard = mockStudentDashboardResponse;
  const avatarInitials = `${dashboard.first_name[0]}${dashboard.last_name[0]}`.toUpperCase();

  const enrollment = getStudentEnrollmentById(enrollmentId);

  function refresh() {
    setTick((t) => t + 1);
  }

  if (!enrollment) {
    return (
      <DashboardShell
        railItems={RAIL_ITEMS}
        activeRailId="dashboard"
        homeHref="/student/dashboard"
        avatarInitials={avatarInitials}
        pageTitle="Enrollment"
        subtitle={dashboard.institutional_email}
      >
        <Breadcrumbs
          items={[
            { label: "Dashboard", href: "/student/dashboard" },
            { label: "Enrollments", href: "/student/enrollments" },
            { label: id ?? "Not found" },
          ]}
        />
        <p className={styles.notFound}>Enrollment {id} was not found.</p>
      </DashboardShell>
    );
  }

  const { allocation_details } = enrollment;
  const course = allocation_details.course_details;
  const faculty = "first_name" in allocation_details.faculty_details ? allocation_details.faculty_details : null;
  const review = getReviewByEnrollmentId(enrollmentId);
  const gradedCount = allocation_details.assessment_set.filter((a) => a.assessmentchecked_set?.obtained != null).length;
  const assessmentGroups = groupAssessmentsByType(allocation_details.assessment_set);
  const attendance = getStudentAttendanceForEnrollment(enrollmentId);

  function handleUpload(assessmentId: number) {
    const file = pendingFiles[assessmentId];
    if (!file) {
      setError("Choose a file first.");
      return;
    }
    const result = uploadAssessmentSubmission(enrollmentId, assessmentId, file);
    if (typeof result === "string") {
      setError(result);
      setMessage(null);
      return;
    }
    setError(null);
    setMessage("Submission uploaded.");
    setPendingFiles((prev) => ({ ...prev, [assessmentId]: null }));
    refresh();
  }

  function handleSaveReview(e: FormEvent) {
    e.preventDefault();
    if (!reviewText.trim()) {
      setError("Review text can't be empty.");
      return;
    }
    saveReview(enrollmentId, reviewText, reviewRating);
    setError(null);
    setMessage(review ? "Review updated." : "Review submitted.");
    refresh();
  }

  return (
    <DashboardShell
      railItems={RAIL_ITEMS}
      activeRailId="dashboard"
      homeHref="/student/dashboard"
      avatarInitials={avatarInitials}
      pageTitle={course?.course_name ?? course?.course_code ?? "Enrollment"}
      subtitle={`${allocation_details.session} · ${dashboard.institutional_email}`}
    >
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/student/dashboard" },
          { label: "Enrollments", href: "/student/enrollments" },
          { label: course?.course_name ?? course?.course_code ?? "Enrollment" },
        ]}
      />

      {message && <div className={formStyles.banner}>{message}</div>}
      {error && <div className={formStyles.errorBanner}>{error}</div>}

      <div className={styles.profileCard}>
        <div className={styles.profileMain}>
          <h1 className={styles.name}>{course?.course_name ?? "Untitled course"}</h1>
          <p className={styles.subline}>
            {course?.course_code ?? "—"} · {course ? `${course.credit_hours} credits` : "—"}
            {course?.lab ? " · Lab" : ""}
            {faculty ? ` · ${faculty.first_name} ${faculty.last_name}` : ""}
            {` · ${allocation_details.session}`}
          </p>
        </div>
        <Tag tone={ENROLLMENT_STATUS_TONE[enrollment.status]}>{enrollment.status}</Tag>
      </div>

      <Panel
        title="Attendance"
        headerExtra={attendance && <Tag tone={attendancePercentageTone(attendance.percentage)}>{`${attendance.percentage}%`}</Tag>}
      >
        {attendance && attendance.attendance_details.length > 0 ? (
          <div className={styles.panelBody}>
            <AttendanceDots attendance={attendance.attendance_details} />
            <Link to={`/student/attendance/${enrollmentId}`} className={formStyles.linkButton}>
              View full attendance →
            </Link>
          </div>
        ) : (
          <p className={styles.empty}>No lectures recorded yet.</p>
        )}
      </Panel>

      <Panel title="Assessments" hint={`${gradedCount}/${allocation_details.assessment_set.length} graded`}>
        {assessmentGroups.length > 0 ? (
          assessmentGroups.map((group) => {
            const groupGraded = group.items.filter((a) => a.assessmentchecked_set?.obtained != null).length;
            return (
              <div key={group.label} className={pageStyles.assessmentGroup}>
                <div className={pageStyles.groupHead}>
                  <h4 className={pageStyles.groupTitle}>{group.label}</h4>
                  <span className={pageStyles.groupHint}>{`${groupGraded}/${group.items.length} graded`}</span>
                </div>
                <div className={pageStyles.groupGrid}>
                  {group.items.map((a) => (
                    <AssessmentCard
                      key={a.assessment_id}
                      assessment={a}
                      enrollmentStatus={enrollment.status}
                      pendingFile={pendingFiles[a.assessment_id] ?? null}
                      onFileChange={(file) => setPendingFiles((prev) => ({ ...prev, [a.assessment_id]: file }))}
                      onUpload={() => handleUpload(a.assessment_id)}
                    />
                  ))}
                </div>
              </div>
            );
          })
        ) : (
          <p className={styles.empty}>No assessments yet.</p>
        )}
      </Panel>

      <Panel title="Your review">
        <form className={styles.panelBody} onSubmit={handleSaveReview}>
          <div className={formStyles.field}>
            <label htmlFor="rating">Rating</label>
            <select id="rating" value={reviewRating} onChange={(e) => setReviewRating(Number(e.target.value))}>
              {[5, 4, 3, 2, 1].map((n) => (
                <option key={n} value={n}>
                  {n} / 5
                </option>
              ))}
            </select>
          </div>
          <div className={formStyles.field}>
            <label htmlFor="review_text">Review</label>
            <textarea
              id="review_text"
              rows={3}
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder="How was this course?"
            />
          </div>
          {review && <span className={formStyles.hint}>Last updated {formatDateTime(review.timestamp)}.</span>}
          <div className={formStyles.actions}>
            <button type="submit" className={formStyles.primaryButton}>
              {review ? "Update review" : "Submit review"}
            </button>
          </div>
        </form>
      </Panel>
    </DashboardShell>
  );
}
