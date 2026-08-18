import autoTable from "jspdf-autotable";
import type { CourseResultRow } from "../../data/studentResults";
import {
  COLOR,
  CONTENT_W,
  MARGIN,
  drawFooter,
  drawLetterhead,
  drawStudentBlock,
  drawSummaryBlock,
  drawWatermark,
  newDocument,
} from "./registrarDocument";

export interface SemesterResultPdfData {
  studentName: string;
  studentId: string;
  program: string;
  studentClass: string;
  studentImageDataUrl: string | null;
  avatarInitials: string;
  session: string;
  semesterId: number;
  courses: CourseResultRow[];
  totalCredits: number;
  semesterGpa: number;
  issuedOn: string;
}

/** One semester's full grade report, with every assessment's marks broken out under its course —
 * the detail the Transcript document deliberately omits. Unlike the Transcript, this is allowed
 * to spill onto a second page if a semester carries enough courses/assessments. */
export function downloadSemesterResultPdf(data: SemesterResultPdfData): void {
  const doc = newDocument();
  drawWatermark(doc);

  let y = drawLetterhead(doc, {
    docTitle: "Semester Grade Report",
    studentImageDataUrl: data.studentImageDataUrl,
    avatarInitials: data.avatarInitials,
  });

  y = drawStudentBlock(doc, y, [
    { label: "Student", value: data.studentName },
    { label: "Student ID", value: data.studentId },
    { label: "Program", value: data.program },
    { label: "Class", value: data.studentClass },
    { label: "Semester", value: `Semester ${data.semesterId} · ${data.session}` },
    { label: "Credits Attempted", value: String(data.totalCredits) },
  ]);

  // Assessment sub-rows reuse the course row's 4 columns with different meanings: col 1
  // (CREDITS for a course) becomes weightage, col 3 (GPA) becomes that assessment's actual
  // contribution to obtained_marks — (obtained/totalMarks)*weightage, the same formula
  // ResultCalculationMixin.calculate_result() sums server-side.
  const body: string[][] = [];
  const assessmentRowIndices = new Set<number>();
  const dividerRowIndices = new Set<number>();
  data.courses.forEach((c, i) => {
    body.push([`${c.courseName}\n${c.courseCode}`, String(c.creditHours), `${c.obtainedMarks.toFixed(2)} / 100`, c.courseGpa.toFixed(2)]);
    for (const a of c.breakdown) {
      assessmentRowIndices.add(body.length);
      body.push([`${a.name} (${a.type})`, `${a.weightage}%`, `${a.obtained ?? "—"} / ${a.totalMarks}`, `${a.contribution.toFixed(2)} pts`]);
    }
    if (i < data.courses.length - 1) {
      dividerRowIndices.add(body.length);
      body.push(["", "", "", ""]);
    }
  });

  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
    tableWidth: CONTENT_W,
    theme: "plain",
    styles: { font: "times", fontSize: 8.5, cellPadding: 1.3, textColor: COLOR.ink, lineColor: COLOR.rule, lineWidth: { bottom: 0.15 } },
    headStyles: { fontStyle: "bold", fontSize: 7, textColor: COLOR.muted, lineColor: COLOR.green, lineWidth: { bottom: 0.3 } },
    columnStyles: {
      1: { halign: "right", cellWidth: 20 },
      2: { halign: "right", cellWidth: 26 },
      3: { halign: "right", cellWidth: 20 },
    },
    head: [["COURSE", "WEIGHT / CREDITS", "MARKS", "CONTRIBUTION / GPA"]],
    body,
    didParseCell(hook) {
      if (dividerRowIndices.has(hook.row.index)) {
        hook.cell.styles.minCellHeight = 1.5;
        hook.cell.styles.lineWidth = { bottom: 0.15, top: 0, left: 0, right: 0 };
      } else if (assessmentRowIndices.has(hook.row.index)) {
        hook.cell.styles.fontSize = 7.5;
        hook.cell.styles.textColor = COLOR.muted;
        hook.cell.styles.lineWidth = 0;
        if (hook.column.index === 0) hook.cell.styles.cellPadding = { top: 0.6, bottom: 0.6, left: 4.5, right: 1 };
      }
    },
  });

  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;
  const afterSummary = drawSummaryBlock(doc, finalY, [
    { label: "Credits Earned", value: String(data.totalCredits) },
    { label: "Semester GPA", value: data.semesterGpa.toFixed(2) },
  ]);

  drawFooter(doc, afterSummary, data.issuedOn);

  doc.save(`${data.studentName.replace(/\s+/g, "_")}_Semester_${data.semesterId}_Result.pdf`);
}
