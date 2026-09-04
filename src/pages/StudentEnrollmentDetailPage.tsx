import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { DashboardShell } from "../components/layout/DashboardShell";
import { STUDENT_RAIL_ITEMS } from "../components/layout/studentRailItems";
import { Breadcrumbs } from "../components/ui/Breadcrumbs";
import { Panel } from "../components/ui/Panel";
import { Select } from "../components/ui/Select";
import { StatTile } from "../components/ui/StatTile";
import { Tag } from "../components/ui/Tag";
import { AssessmentCard } from "../components/ui/AssessmentCard";
import { AttendanceDots } from "../components/ui/AttendanceDots";
import { useToast } from "../components/ui/ToastContext";
import type { StatusTone } from "../types/dashboard";
import type { EnrollmentStatus, Review, StudentAttendanceSummary, StudentDashboardResponse, StudentEnrollment } from "../types/api";
import { groupAssessmentsByType } from "../data/studentEnrollments";
import { attendancePercentageTone } from "../data/studentAttendance";
import { apiGet, apiGetAllPages, apiMutate, apiMutateForm } from "../lib/auth";
import { ApiError, apiErrorMessage } from "../lib/api";
import formStyles from "../components/ui/Form.module.css";
import styles from "./PersonDetailPage.module.css";
import pageStyles from "./StudentEnrollmentDetailPage.module.css";

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
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const enrollmentId = id ? Number(id) : NaN;
  const { showToast } = useToast();

  const [dashboard, setDashboard] = useState<StudentDashboardResponse | null>(null);
  const [enrollment, setEnrollment] = useState<StudentEnrollment | null>(null);
  const [attendance, setAttendance] = useState<StudentAttendanceSummary | null>(null);
  const [review, setReview] = useState<Review | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const [error, setError] = useState<string | null>(null);
  const [pendingFiles, setPendingFiles] = useState<Record<number, File | null>>({});
  const [reviewText, setReviewText] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  const [savingReview, setSavingReview] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      apiGet<StudentDashboardResponse>("/student/dashboard/"),
      apiGet<StudentEnrollment>(`/student/enrollments/${enrollmentId}/`),
      apiGet<StudentAttendanceSummary>(`/student/attendance/${enrollmentId}/`),
    ])
      .then(([dashboardRes, enrollmentRes, attendanceRes]) => {
        if (cancelled) return;
        setDashboard(dashboardRes);
        setEnrollment(enrollmentRes);
        setAttendance(attendanceRes);
        // No GET-by-enrollment for a review — list this student's own and find the one for this
        // enrollment (ReviewListAPIView.get_queryset filters by student_id only).
        return apiGetAllPages<Review>(`/student/${dashboardRes.student_id}/enrollments/reviews/`).then((reviews) => {
          if (cancelled) return;
          const existing = reviews.find((r) => r.enrollment === enrollmentId) ?? null;
          setReview(existing);
          setReviewText(existing?.review_text ?? "");
          setReviewRating(existing ? Number(existing.rating) : 5);
        });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          navigate("/login", { replace: true });
          return;
        }
        if (err instanceof ApiError && err.status === 404) {
          setNotFound(true);
          return;
        }
        setLoadError(apiErrorMessage(err));
      });
    return () => {
      cancelled = true;
    };
  }, [navigate, enrollmentId, refreshKey]);

  const avatarInitials = dashboard ? `${dashboard.first_name[0]}${dashboard.last_name[0]}`.toUpperCase() : "—";

  if (loadError) {
    return (
      <DashboardShell railItems={STUDENT_RAIL_ITEMS} activeRailId="enrollments" homeHref="/student/dashboard" profileHref="/student/profile" avatarInitials={avatarInitials} pageTitle="Enrollment" subtitle="">
        <div className={formStyles.errorBanner}>{loadError}</div>
      </DashboardShell>
    );
  }

  if (notFound) {
    return (
      <DashboardShell
        railItems={STUDENT_RAIL_ITEMS}
        activeRailId="enrollments"
        homeHref="/student/dashboard"
        profileHref="/student/profile"
        avatarInitials={avatarInitials}
        pageTitle="Enrollment"
        subtitle={dashboard?.institutional_email ?? ""}
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

  if (!dashboard || !enrollment) {
    return (
      <DashboardShell railItems={STUDENT_RAIL_ITEMS} activeRailId="enrollments" homeHref="/student/dashboard" profileHref="/student/profile" avatarInitials={avatarInitials} pageTitle="Enrollment" subtitle="">
        <p className={styles.notFound}>Loading enrollment…</p>
      </DashboardShell>
    );
  }

  const { allocation_details } = enrollment;
  const course = allocation_details.course_details;
  const faculty = "first_name" in allocation_details.faculty_details ? allocation_details.faculty_details : null;
  const gradedCount = allocation_details.assessment_set.filter((a) => a.assessmentchecked_set?.obtained != null).length;
  const assessmentGroups = groupAssessmentsByType(allocation_details.assessment_set);

  async function handleUpload(assessmentId: number) {
    const file = pendingFiles[assessmentId];
    if (!file) {
      setError("Choose a file first.");
      return;
    }
    const assessment = allocation_details.assessment_set.find((a) => a.assessment_id === assessmentId);
    const checkedId = assessment?.assessmentchecked_set?.id;
    if (!checkedId) {
      setError("Submission record not found.");
      return;
    }
    setError(null);
    try {
      const form = new FormData();
      form.append("student_upload", file);
      await apiMutateForm(
        `/student/enrollments/${enrollmentId}/assessments/${assessmentId}/file-upload/${checkedId}/`,
        "PATCH",
        form,
      );
      showToast("Submission uploaded.");
      setPendingFiles((prev) => ({ ...prev, [assessmentId]: null }));
      setRefreshKey((k) => k + 1);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        navigate("/login", { replace: true });
        return;
      }
      setError(apiErrorMessage(err));
    }
  }

  async function handleSaveReview(e: FormEvent) {
    e.preventDefault();
    if (!reviewText.trim()) {
      setError("Review text can't be empty.");
      return;
    }
    setSavingReview(true);
    setError(null);
    try {
      if (review) {
        await apiMutate<Review>(
          `/student/${dashboard!.student_id}/enrollments/${enrollmentId}/reviews/${review.review_id}/`,
          "PATCH",
          { review_text: reviewText, rating: reviewRating },
        );
        showToast("Review updated.");
      } else {
        await apiMutate<Review>(`/student/${dashboard!.student_id}/enrollments/${enrollmentId}/reviews/`, "POST", {
          review_text: reviewText,
          rating: reviewRating,
        });
        showToast("Review submitted.");
      }
      setRefreshKey((k) => k + 1);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        navigate("/login", { replace: true });
        return;
      }
      setError(apiErrorMessage(err));
    } finally {
      setSavingReview(false);
    }
  }

  return (
    <DashboardShell
      railItems={STUDENT_RAIL_ITEMS}
      activeRailId="enrollments"
      homeHref="/student/dashboard"
      profileHref="/student/profile"
      avatarInitials={avatarInitials}
      avatarSrc={dashboard.image}
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

      {enrollment.status === "Completed" && (
        <Panel title="Result">
          {enrollment.result?.course_gpa != null ? (
            <div className={styles.panelBody}>
              <div className={pageStyles.resultStats}>
                <StatTile id="course-gpa" label="Course GPA" value={enrollment.result.course_gpa.toFixed(2)} />
                {enrollment.result.obtained_marks != null && (
                  <StatTile id="obtained-marks" label="Marks obtained" value={`${enrollment.result.obtained_marks.toFixed(2)} / 100`} />
                )}
              </div>
              <Link
                to={`/student/transcript/${allocation_details.semester_id}?course=${enrollmentId}`}
                className={formStyles.linkButton}
              >
                View semester result →
              </Link>
            </div>
          ) : (
            <p className={styles.empty}>Result not yet calculated for this course.</p>
          )}
        </Panel>
      )}

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
            <Select
              id="rating"
              value={String(reviewRating)}
              onChange={(next) => setReviewRating(Number(next))}
              placeholder="Select rating…"
              options={[5, 4, 3, 2, 1].map((n) => ({ value: String(n), label: `${n} / 5` }))}
            />
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
            <button type="submit" className={formStyles.primaryButton} disabled={savingReview}>
              {savingReview ? "Saving…" : review ? "Update review" : "Submit review"}
            </button>
          </div>
        </form>
      </Panel>
    </DashboardShell>
  );
}
