import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { RequireRole } from "./components/auth/RequireRole";
import { AdminLayout } from "./components/layout/AdminLayout";
import { LoginPage } from "./pages/LoginPage";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { AdminDashboardPage } from "./pages/AdminDashboardPage";
import { ChangeRequestDetailPage } from "./pages/ChangeRequestDetailPage";
import { ChangeRequestListPage } from "./pages/ChangeRequestListPage";
import { SemesterListPage } from "./pages/SemesterListPage";
import { SemesterDetailPage } from "./pages/SemesterDetailPage";
import { TranscriptListPage } from "./pages/TranscriptListPage";
import { FacultyDashboardPage } from "./pages/FacultyDashboardPage";
import { FacultyProfilePage } from "./pages/FacultyProfilePage";
import { FacultyAllocationListPage } from "./pages/FacultyAllocationListPage";
import { FacultyAllocationDetailPage } from "./pages/FacultyAllocationDetailPage";
import { FacultyAllocationAssessmentsPage } from "./pages/FacultyAllocationAssessmentsPage";
import { FacultyAllocationLecturesPage } from "./pages/FacultyAllocationLecturesPage";
import { FacultyRequestListPage } from "./pages/FacultyRequestListPage";
import { FacultyRequestDetailPage } from "./pages/FacultyRequestDetailPage";
import { StudentDashboardPage } from "./pages/StudentDashboardPage";
import { StudentProfilePage } from "./pages/StudentProfilePage";
import { StudentAttendancePage } from "./pages/StudentAttendancePage";
import { StudentAttendanceDetailPage } from "./pages/StudentAttendanceDetailPage";
import { StudentEnrollmentDetailPage } from "./pages/StudentEnrollmentDetailPage";
import { StudentEnrollmentListPage } from "./pages/StudentEnrollmentListPage";
import { StudentTranscriptPage } from "./pages/StudentTranscriptPage";
import { StudentSemesterResultPage } from "./pages/StudentSemesterResultPage";
// Lazy — CodeMirror plus its language packages add ~200KB gzipped, and this is the only page
// that needs any of it. Every other route stays eagerly bundled.
const StudentScratchpadPage = lazy(() =>
  import("./pages/StudentScratchpadPage").then((m) => ({ default: m.StudentScratchpadPage })),
);
import { FacultyListPage } from "./pages/FacultyListPage";
import { FacultyCreatePage } from "./pages/FacultyCreatePage";
import { FacultyDetailPage } from "./pages/FacultyDetailPage";
import { StudentListPage } from "./pages/StudentListPage";
import { StudentCreatePage } from "./pages/StudentCreatePage";
import { StudentDetailPage } from "./pages/StudentDetailPage";
import { AdminProfilePage } from "./pages/AdminProfilePage";
import { DepartmentListPage } from "./pages/DepartmentListPage";
import { DepartmentDetailPage } from "./pages/DepartmentDetailPage";
import { ProgramListPage } from "./pages/ProgramListPage";
import { ProgramCreatePage } from "./pages/ProgramCreatePage";
import { ProgramDetailPage } from "./pages/ProgramDetailPage";
import { SessionListPage } from "./pages/SessionListPage";
import { SessionDetailPage } from "./pages/SessionDetailPage";
import { CourseListPage } from "./pages/CourseListPage";
import { CourseCreatePage } from "./pages/CourseCreatePage";
import { CourseDetailPage } from "./pages/CourseDetailPage";
import { ClassListPage } from "./pages/ClassListPage";
import { ClassCreatePage } from "./pages/ClassCreatePage";
import { ClassDetailPage } from "./pages/ClassDetailPage";
import { AllocationListPage } from "./pages/AllocationListPage";
import { AllocationCreatePage } from "./pages/AllocationCreatePage";
import { AllocationBulkPage } from "./pages/AllocationBulkPage";
import { AllocationDetailPage } from "./pages/AllocationDetailPage";
import { EnrollmentListPage } from "./pages/EnrollmentListPage";
import { EnrollmentCreatePage } from "./pages/EnrollmentCreatePage";
import { EnrollmentDetailPage } from "./pages/EnrollmentDetailPage";
import { BulkCreatePage } from "./pages/BulkCreatePage";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />

      <Route element={<RequireRole role="Admin" />}>
        <Route element={<AdminLayout />}>
          <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
          <Route path="/admin/profile" element={<AdminProfilePage />} />
          <Route path="/admin/profile/edit" element={<AdminProfilePage />} />
          <Route path="/admin/requests" element={<ChangeRequestListPage />} />
          <Route path="/admin/requests/:id" element={<ChangeRequestDetailPage />} />
          <Route path="/admin/faculty" element={<FacultyListPage />} />
          <Route path="/admin/faculty/new" element={<FacultyCreatePage />} />
          <Route path="/admin/bulk" element={<BulkCreatePage />} />
          <Route path="/admin/faculty/:employeeId" element={<FacultyDetailPage />} />
          <Route path="/admin/faculty/:employeeId/edit" element={<FacultyDetailPage />} />
          <Route path="/admin/students" element={<StudentListPage />} />
          <Route path="/admin/students/new" element={<StudentCreatePage />} />
          <Route path="/admin/students/:studentId" element={<StudentDetailPage />} />
          <Route path="/admin/students/:studentId/edit" element={<StudentDetailPage />} />
          <Route path="/admin/departments" element={<DepartmentListPage />} />
          <Route path="/admin/departments/:departmentId" element={<DepartmentDetailPage />} />
          <Route path="/admin/programs" element={<ProgramListPage />} />
          <Route path="/admin/programs/new" element={<ProgramCreatePage />} />
          <Route path="/admin/programs/:programId" element={<ProgramDetailPage />} />
          <Route path="/admin/programs/:programId/edit" element={<ProgramDetailPage />} />
          <Route path="/admin/sessions" element={<SessionListPage />} />
          <Route path="/admin/sessions/:id" element={<SessionDetailPage />} />
          <Route path="/admin/semesters" element={<SemesterListPage />} />
          <Route path="/admin/semesters/:semesterId" element={<SemesterDetailPage />} />
          <Route path="/admin/transcripts" element={<TranscriptListPage />} />
          <Route path="/admin/courses" element={<CourseListPage />} />
          <Route path="/admin/courses/new" element={<CourseCreatePage />} />
          <Route path="/admin/courses/:courseCode" element={<CourseDetailPage />} />
          <Route path="/admin/courses/:courseCode/edit" element={<CourseDetailPage />} />
          <Route path="/admin/classes" element={<ClassListPage />} />
          <Route path="/admin/classes/new" element={<ClassCreatePage />} />
          <Route path="/admin/classes/:classId" element={<ClassDetailPage />} />
          <Route path="/admin/classes/:classId/edit" element={<ClassDetailPage />} />
          <Route path="/admin/allocations" element={<AllocationListPage />} />
          <Route path="/admin/allocations/new" element={<AllocationCreatePage />} />
          <Route path="/admin/allocations/bulk" element={<AllocationBulkPage />} />
          <Route path="/admin/allocations/:allocationId" element={<AllocationDetailPage />} />
          <Route path="/admin/allocations/:allocationId/edit" element={<AllocationDetailPage />} />
          <Route path="/admin/enrollments" element={<EnrollmentListPage />} />
          <Route path="/admin/enrollments/new" element={<EnrollmentCreatePage />} />
          <Route path="/admin/enrollments/:enrollmentId" element={<EnrollmentDetailPage />} />
          <Route path="/admin/enrollments/:enrollmentId/edit" element={<EnrollmentDetailPage />} />
        </Route>
      </Route>

      <Route element={<RequireRole role="Faculty" />}>
        <Route path="/faculty/dashboard" element={<FacultyDashboardPage />} />
        <Route path="/faculty/profile" element={<FacultyProfilePage />} />
        <Route path="/faculty/allocations" element={<FacultyAllocationListPage />} />
        <Route path="/faculty/allocations/:id" element={<FacultyAllocationDetailPage />} />
        <Route path="/faculty/allocations/:id/assessments" element={<FacultyAllocationAssessmentsPage />} />
        <Route path="/faculty/allocations/:id/lectures" element={<FacultyAllocationLecturesPage />} />
        <Route path="/faculty/requests" element={<FacultyRequestListPage />} />
        <Route path="/faculty/requests/:id" element={<FacultyRequestDetailPage />} />
      </Route>

      <Route element={<RequireRole role="Student" />}>
        <Route path="/student/dashboard" element={<StudentDashboardPage />} />
        <Route path="/student/enrollments" element={<StudentEnrollmentListPage />} />
        <Route path="/student/transcript" element={<StudentTranscriptPage />} />
        <Route path="/student/transcript/:id" element={<StudentSemesterResultPage />} />
        <Route path="/student/profile" element={<StudentProfilePage />} />
        <Route path="/student/attendance" element={<StudentAttendancePage />} />
        <Route path="/student/attendance/:id" element={<StudentAttendanceDetailPage />} />
        <Route path="/student/enrollments/:id" element={<StudentEnrollmentDetailPage />} />
        <Route
          path="/student/scratchpad"
          element={
            <Suspense fallback={null}>
              <StudentScratchpadPage />
            </Suspense>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;
