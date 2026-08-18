import { jsPDF } from "jspdf";

/**
 * Shared drawing helpers for the locked "Registrar" PDF design, approved via a design-preview
 * artifact (ivory letterhead, bottle-green & gold seal, watermark, student photo box — see
 * transcriptPdf.ts/semesterResultPdf.ts for how these compose into each document). jsPDF has no
 * access to Google Fonts (Cormorant Garamond/PT Serif) without embedding a base64 TTF, not worth
 * it for an internal tool — so "times" (jsPDF's built-in Times-Roman) stands in as the closest
 * serif match. Colors and layout are otherwise reproduced exactly.
 */

export const PAGE_W = 210;
export const PAGE_H = 297;
export const MARGIN = 14;
export const CONTENT_W = PAGE_W - MARGIN * 2;

export const COLOR = {
  green: [27, 58, 47] as [number, number, number],
  gold: [169, 125, 46] as [number, number, number],
  ink: [32, 29, 22] as [number, number, number],
  muted: [107, 98, 80] as [number, number, number],
  ivory: [250, 247, 238] as [number, number, number],
  rule: [228, 220, 199] as [number, number, number],
  /** Green blended ~6% into the ivory page background — a literal light tint rather than a
   * transparent green, since jsPDF/PDF viewers don't reliably honor GState opacity on text (the
   * first version used doc.setGState({opacity}) and rendered at full strength in practice). */
  watermark: [237, 236, 227] as [number, number, number],
};

export function newDocument(): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  doc.setFillColor(...COLOR.ivory);
  doc.rect(0, 0, PAGE_W, PAGE_H, "F");
  return doc;
}

export function drawWatermark(doc: jsPDF): void {
  doc.setDrawColor(...COLOR.watermark);
  doc.setLineWidth(0.6);
  doc.circle(PAGE_W / 2, 150, 42, "S");
  doc.setFont("times", "bold");
  doc.setFontSize(72);
  doc.setTextColor(...COLOR.watermark);
  doc.text("NU", PAGE_W / 2, 158, { align: "center", angle: 14 });
}

interface LetterheadOptions {
  docTitle: string;
  studentImageDataUrl: string | null;
  avatarInitials: string;
}

/** Seal + university name + student photo box + centered document title. Returns the Y cursor
 * position immediately below the title, ready for the next section. */
export function drawLetterhead(doc: jsPDF, { docTitle, studentImageDataUrl, avatarInitials }: LetterheadOptions): number {
  const top = MARGIN;
  const sealCx = MARGIN + 6;
  const sealCy = top + 6;

  doc.setDrawColor(...COLOR.green);
  doc.setLineWidth(0.5);
  doc.circle(sealCx, sealCy, 6, "S");
  doc.setFont("times", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...COLOR.green);
  doc.text("NU", sealCx, sealCy + 1.2, { align: "center" });

  doc.setFont("times", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...COLOR.green);
  doc.text("Namal University", sealCx + 10, top + 4);
  doc.setFont("times", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...COLOR.muted);
  doc.text("MIANWALI · OFFICE OF THE REGISTRAR", sealCx + 10, top + 9);

  const photoW = 20;
  const photoH = 24;
  const photoX = PAGE_W - MARGIN - photoW;
  const photoY = top - 2;
  doc.setFillColor(241, 236, 224);
  doc.setDrawColor(...COLOR.green);
  doc.setLineWidth(0.35);
  doc.rect(photoX, photoY, photoW, photoH, "FD");
  if (studentImageDataUrl) {
    doc.addImage(studentImageDataUrl, photoX + 0.8, photoY + 0.8, photoW - 1.6, photoH - 1.6, undefined, "FAST");
  } else {
    doc.setFont("times", "bold");
    doc.setFontSize(14);
    doc.setTextColor(...COLOR.green);
    doc.text(avatarInitials, photoX + photoW / 2, photoY + photoH / 2 + 2, { align: "center" });
  }
  doc.setFont("times", "normal");
  doc.setFontSize(6);
  doc.setTextColor(...COLOR.muted);
  const captionY = photoY + photoH + 3;
  doc.text("STUDENT PHOTO", photoX + photoW / 2, captionY, { align: "center" });

  // The rule must clear whichever of the two header columns is taller — the photo box + its
  // caption (photoY..captionY) is taller than the seal+uni-name block, so it's what determines
  // this. A fixed top+13 (this block's own height) cut straight through the photo box before.
  const ruleY = Math.max(top + 13, captionY + 3);
  doc.setDrawColor(...COLOR.green);
  doc.setLineWidth(0.6);
  doc.line(MARGIN, ruleY, PAGE_W - MARGIN, ruleY);
  doc.setLineWidth(0.2);
  doc.line(MARGIN, ruleY + 0.7, PAGE_W - MARGIN, ruleY + 0.7);

  doc.setFont("times", "bold");
  doc.setFontSize(12.5);
  doc.setTextColor(...COLOR.green);
  doc.text(docTitle.toUpperCase(), PAGE_W / 2, ruleY + 8, { align: "center", charSpace: 0.6 });

  return ruleY + 14;
}

interface StudentField {
  label: string;
  value: string;
}

/** Two-column student info grid. Returns the Y cursor position below it. */
export function drawStudentBlock(doc: jsPDF, startY: number, fields: StudentField[]): number {
  const colW = CONTENT_W / 2;
  let rowY = startY;
  fields.forEach((field, i) => {
    const col = i % 2;
    const x = MARGIN + col * colW;
    if (col === 0 && i > 0) rowY += 9;
    doc.setFont("times", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(...COLOR.muted);
    doc.text(field.label.toUpperCase(), x, rowY);
    doc.setFont("times", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(...COLOR.ink);
    doc.text(field.value, x, rowY + 4.2);
  });
  const bottom = rowY + 8;
  doc.setDrawColor(...COLOR.rule);
  doc.setLineWidth(0.2);
  doc.line(MARGIN, bottom, PAGE_W - MARGIN, bottom);
  return bottom + 6;
}

export function drawSemesterHeading(doc: jsPDF, y: number, title: string, gpaLabel: string): void {
  doc.setFont("times", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(...COLOR.green);
  doc.text(title, MARGIN, y);
  doc.setFontSize(9);
  doc.text(gpaLabel, PAGE_W - MARGIN, y, { align: "right" });
}

interface SummaryItem {
  label: string;
  value: string;
}

export function drawSummaryBlock(doc: jsPDF, y: number, items: SummaryItem[]): number {
  doc.setDrawColor(...COLOR.green);
  doc.setLineWidth(0.6);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  doc.setLineWidth(0.2);
  doc.line(MARGIN, y + 0.7, PAGE_W - MARGIN, y + 0.7);

  const gap = 40;
  const totalW = items.length > 1 ? gap * (items.length - 1) : 0;
  let x = PAGE_W - MARGIN - totalW;
  for (const item of items) {
    doc.setFont("times", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(...COLOR.muted);
    doc.text(item.label.toUpperCase(), x, y + 7, { align: "center" });
    doc.setFont("times", "bold");
    doc.setFontSize(15);
    doc.setTextColor(...COLOR.green);
    doc.text(item.value, x, y + 14, { align: "center" });
    x += gap;
  }
  return y + 20;
}

export function drawFooter(doc: jsPDF, y: number, issuedOn: string): void {
  doc.setFont("times", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...COLOR.muted);
  doc.text(`Issued ${issuedOn} · Computer-generated, valid without signature`, MARGIN, y);

  const lineW = 40;
  const lineX = PAGE_W - MARGIN - lineW;
  doc.setDrawColor(...COLOR.muted);
  doc.setLineWidth(0.2);
  doc.line(lineX, y - 3, lineX + lineW, y - 3);
  doc.text("Controller of Examinations", lineX + lineW / 2, y, { align: "center" });
}
