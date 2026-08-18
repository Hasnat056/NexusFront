import type { Review } from "../types/api";

/**
 * Shaped like GET /api/student/<student_id>/enrollments/reviews/ — reviews the signed-in
 * student (NUM-STU-2023-114, Lucia Ferreira) has left on her own enrollments. Only two of the
 * five enrollments have a review yet — the rest render the "leave a review" form.
 */
export const mockStudentReviews: Review[] = [
  {
    urls: "http://localhost:8000/api/student/NUM-STU-2023-114/enrollments/4471/reviews/9001/",
    review_id: 9001,
    enrollment: 4471,
    review_text: "Clear lectures and fast feedback on assignments. The scheduling unit was tough but well explained.",
    rating: 5,
    timestamp: "2026-08-05T14:20:00Z",
  },
  {
    urls: "http://localhost:8000/api/student/NUM-STU-2023-114/enrollments/4474/reviews/9004/",
    review_id: 9004,
    enrollment: 4474,
    review_text: "Good writing feedback, though the pace felt slow at times.",
    rating: 4,
    timestamp: "2026-07-30T09:10:00Z",
  },
];

let nextReviewId = 9100;

export function getReviewByEnrollmentId(enrollmentId: number): Review | undefined {
  return mockStudentReviews.find((r) => r.enrollment === enrollmentId);
}

/** ReviewPermission never allows DELETE (Student included) — a review, once created, can only be
 * edited, never removed via the API, so this create/update pair is the entire write surface. */
export function saveReview(enrollmentId: number, reviewText: string, rating: number): Review {
  const existing = getReviewByEnrollmentId(enrollmentId);
  if (existing) {
    existing.review_text = reviewText;
    existing.rating = rating;
    return existing;
  }
  const review: Review = {
    urls: `http://localhost:8000/api/student/NUM-STU-2023-114/enrollments/${enrollmentId}/reviews/${nextReviewId}/`,
    review_id: nextReviewId++,
    enrollment: enrollmentId,
    review_text: reviewText,
    rating,
    timestamp: new Date().toISOString(),
  };
  mockStudentReviews.push(review);
  return review;
}
