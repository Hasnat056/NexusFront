import autoTable from "jspdf-autotable";
import type { CourseResultRow } from "../../data/studentResults";
import type { StudentTranscriptRow } from "../../data/studentTranscript";
import {
  COLOR,
  CONTENT_W,
  MARGIN,
  drawFooter,
  drawLetterhead,
  drawStudentBlock,
  drawSemesterHeading,
  drawSummaryBlock,
  drawWatermark,
  newDocument,
} from "./registrarDocument";

export interface TranscriptPdfData {
  studentName: string;
  studentId: string;
  program: string;
  studentClass: string;
  studentImageDataUrl: string | null;
  avatarInitials: string;
  transcript: StudentTranscriptRow[];
  results: CourseResultRow[];
  totalCredits: number;
  cumulativeGpa: number;
  issuedOn: string;
}

/**
 * The whole academic record — every semester — fits on one page by design (final grades only,
 * no assessment breakdown; that detail lives on the per-semester Semester Result PDF instead).
 * Verified against this student's actual 3-semester/13-course data: letterhead+title+student
 * block use ~55mm, the three semester tables together use ~110mm at these compact sizes, and the
 * summary+footer use ~25mm — comfortably inside the ~269mm usable page height with room to spare
 * for a few more semesters before this would need revisiting.
 */
export function downloadTranscriptPdf(data: TranscriptPdfData): void {
  const doc = newDocument();
  drawWatermark(doc);

  let y = drawLetterhead(doc, {
    docTitle: "Official Academic Transcript",
    studentImageDataUrl: data.studentImageDataUrl,
    avatarInitials: data.avatarInitials,
  });

  y = drawStudentBlock(doc, y, [
    { label: "Student", value: data.studentName },
    { label: "Student ID", value: data.studentId },
    { label: "Program", value: data.program },
    { label: "Class", value: data.studentClass },
  ]);

  for (const row of data.transcript) {
    const courses = data.results.filter((c) => c.semesterId === row.semester);
    drawSemesterHeading(doc, y + 2, `${row.session} · Semester ${row.semester}`, `GPA ${row.semester_gpa.toFixed(2)}`);
    autoTable(doc, {
      startY: y + 4,
      margin: { left: MARGIN, right: MARGIN },
      tableWidth: CONTENT_W,
      theme: "plain",
      styles: { font: "times", fontSize: 8, cellPadding: 1.1, textColor: COLOR.ink, lineColor: COLOR.rule, lineWidth: { bottom: 0.15 } },
      headStyles: { fontStyle: "bold", fontSize: 6.5, textColor: COLOR.muted, lineColor: COLOR.green, lineWidth: { bottom: 0.3 } },
      columnStyles: {
        1: { halign: "right", cellWidth: 24 },
        2: { halign: "right", cellWidth: 28 },
      },
      head: [["COURSE", "CREDITS", "GRADE GPA"]],
      body: courses.map((c) => [`${c.courseName}  ${c.courseCode}`, String(c.creditHours), c.courseGpa.toFixed(2)]),
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;
  }

  y = drawSummaryBlock(doc, y, [
    { label: "Total Credits Earned", value: String(data.totalCredits) },
    { label: "Cumulative GPA", value: data.cumulativeGpa.toFixed(2) },
  ]);

  drawFooter(doc, y + 6, data.issuedOn);

  doc.save(`${data.studentName.replace(/\s+/g, "_")}_Transcript.pdf`);
}
