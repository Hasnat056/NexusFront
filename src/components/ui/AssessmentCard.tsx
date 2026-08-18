import type { EnrollmentStatus, StudentAssessment } from "../../types/api";
import { isSubmissionWindowOpen } from "../../data/studentEnrollments";
import { Tag } from "./Tag";
import formStyles from "./Form.module.css";
import styles from "./AssessmentCard.module.css";

interface AssessmentCardProps {
  assessment: StudentAssessment;
  enrollmentStatus: EnrollmentStatus;
  pendingFile: File | null;
  onFileChange: (file: File | null) => void;
  onUpload: () => void;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { dateStyle: "medium" });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

const URGENT_WITHIN_MS = 3 * 24 * 60 * 60 * 1000;

export function AssessmentCard({ assessment, enrollmentStatus, pendingFile, onFileChange, onUpload }: AssessmentCardProps) {
  const checked = assessment.assessmentchecked_set;
  const obtained = checked?.obtained ?? null;
  const graded = obtained !== null;
  const windowOpen = isSubmissionWindowOpen(enrollmentStatus, assessment.submission_deadline);
  const urgent = windowOpen && assessment.submission_deadline
    ? new Date(assessment.submission_deadline).getTime() - Date.now() <= URGENT_WITHIN_MS
    : false;

  return (
    <div className={styles.card}>
      <div className={styles.head}>
        <div>
          <div className={styles.kicker}>{assessment.assessment_type}</div>
          <div className={styles.title}>{assessment.assessment_name}</div>
        </div>
        <Tag tone={graded ? "good" : "warning"}>{graded ? "Graded" : "Not graded"}</Tag>
      </div>

      <div className={styles.meta}>
        <span>{formatDate(assessment.assessment_date)}</span>
        <span>out of {assessment.total_marks}</span>
      </div>

      <div className={styles.scoreRow}>
        {graded ? (
          <>
            <span className={styles.scoreValue}>{obtained}</span>
            <span className={styles.scoreTotal}>/ {assessment.total_marks}</span>
          </>
        ) : (
          <span className={styles.scoreValue} data-graded="false">
            Not graded yet
          </span>
        )}
      </div>

      {checked && (checked.student_upload || windowOpen) && (
        <div className={styles.submission}>
          {checked.student_upload && (
            <div className={styles.submissionStatus}>
              <Tag tone="good">Submitted</Tag>
              <a href={checked.student_upload} target="_blank" rel="noreferrer">
                View file
              </a>
            </div>
          )}

          {assessment.submission_deadline && (
            <p className={styles.deadline} data-urgent={urgent}>
              {windowOpen ? `Due ${formatDateTime(assessment.submission_deadline)}` : "Submission closed"}
            </p>
          )}

          {windowOpen && (
            <div className={styles.uploadRow}>
              <input
                type="file"
                onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
                aria-label={`Choose a file to submit for ${assessment.assessment_name}`}
              />
              <button type="button" className={formStyles.secondaryButton} onClick={onUpload} disabled={!pendingFile}>
                {checked.student_upload ? "Replace submission" : "Upload submission"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
