import type { Gender } from "../types/api";
import { DEPARTMENTS, PROGRAMS } from "./academicStructure";
import { DESIGNATIONS, GENDERS, createFacultyRecord, emptyFacultyFormValue, type FacultyFormValue } from "./facultyDirectory";
import { createStudentRecord, emptyStudentFormValue, type StudentFormValue } from "./studentDirectory";

export type BulkTargetType = "faculty" | "student";

const QUALIFICATION_SLOTS = 5;
const QUALIFICATION_FIELDS = ["degree_title", "education_board", "institution", "passing_year", "total_marks", "obtained_marks", "is_current"] as const;

const COMMON_COLUMNS = [
  "password",
  "image",
  "first_name",
  "last_name",
  "father_name",
  "gender",
  "cnic",
  "dob",
  "contact_number",
  "institutional_email",
  "personal_email",
  "religion",
  "country",
  "province",
  "city",
  "zipcode",
  "street_address",
];

const FACULTY_COLUMNS = ["department", "designation", "joining_date"];
/** `student_class` is in the real GET /api/admin/bulk/?type=student template (AdminModule/
 * views.py::BulkCreateAPIView), but the parser (AdminModule/serializers.py::row_parser) reads
 * `row['class_']` instead — a key that's never actually present, so this column is silently
 * ignored server-side no matter what's in it. Kept in the template here for parity with the real
 * download, but this mock ignores it too (new rows default to class 1, same as the single-create
 * form), and the page flags this explicitly rather than pretending it works. */
const STUDENT_COLUMNS = ["program", "student_class", "admission_date"];

function qualificationColumns(): string[] {
  const columns: string[] = [];
  for (let i = 1; i <= QUALIFICATION_SLOTS; i++) {
    for (const field of QUALIFICATION_FIELDS) columns.push(`${field}_${i}`);
  }
  return columns;
}

export function csvColumns(type: BulkTargetType): string[] {
  return [...COMMON_COLUMNS, ...(type === "faculty" ? FACULTY_COLUMNS : STUDENT_COLUMNS), ...qualificationColumns()];
}

/** Mirrors GET /api/admin/bulk/?type=faculty|student — a headers-only CSV template. */
export function csvTemplate(type: BulkTargetType): string {
  return csvColumns(type).join(",") + "\n";
}

/** Minimal RFC4180-ish parser: handles quoted fields, embedded commas, and escaped `""` quotes —
 * enough for a CSV a spreadsheet program would export, without pulling in a library for it. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  const normalized = text.replace(/^﻿/, "").replace(/\r\n/g, "\n");

  for (let i = 0; i < normalized.length; i++) {
    const char = normalized[i];
    if (inQuotes) {
      if (char === '"' && normalized[i + 1] === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

export function rowsToRecords(rows: string[][]): Record<string, string>[] {
  if (rows.length === 0) return [];
  const [header, ...dataRows] = rows;
  return dataRows.map((cells) => {
    const record: Record<string, string> = {};
    header.forEach((key, i) => {
      record[key.trim()] = (cells[i] ?? "").trim();
    });
    return record;
  });
}

export interface BulkRowError {
  data_entry: Record<string, string>;
  errors: Record<string, string[]>;
}

export interface BulkCreateResult {
  row_count: number;
  insert_count: number;
  error_row_count: number;
  errors: BulkRowError[];
}

const COMMON_REQUIRED = ["password", "first_name", "last_name", "father_name", "gender", "dob", "cnic", "contact_number", "institutional_email"];

/** Approximates DRF's default per-field error shape/messages (`serializer.errors`) without
 * calling a real serializer — required-field and choice-field checks only, mirroring what
 * PersonSerializerMixin.create_mixin's underlying FacultySerializer/StudentSerializer would
 * reject on a genuinely empty/invalid value. */
function validateRow(type: BulkTargetType, row: Record<string, string>): Record<string, string[]> {
  const errors: Record<string, string[]> = {};
  const required = [...COMMON_REQUIRED, ...(type === "faculty" ? FACULTY_COLUMNS : ["program", "admission_date"])];
  for (const field of required) {
    if (!row[field]) errors[field] = ["This field is required."];
  }
  if (row.gender && !GENDERS.includes(row.gender as Gender)) {
    errors.gender = [`"${row.gender}" is not a valid choice.`];
  }
  if (type === "faculty") {
    if (row.department && !DEPARTMENTS.some((d) => d.department_id === row.department)) {
      errors.department = [`"${row.department}" is not a valid choice.`];
    }
    if (row.designation && !DESIGNATIONS.includes(row.designation as (typeof DESIGNATIONS)[number])) {
      errors.designation = [`"${row.designation}" is not a valid choice.`];
    }
  } else {
    if (row.program && !PROGRAMS.some((p) => p.program_id === row.program)) {
      errors.program = [`"${row.program}" is not a valid choice.`];
    }
  }
  return errors;
}

function qualificationSetFromRow(row: Record<string, string>) {
  const items = [];
  for (let i = 1; i <= QUALIFICATION_SLOTS; i++) {
    const degreeTitle = row[`degree_title_${i}`];
    const institution = row[`institution_${i}`];
    if (!degreeTitle && !institution) continue;
    items.push({
      degree_title: degreeTitle ?? "",
      education_board: row[`education_board_${i}`] ?? "",
      passing_year: row[`passing_year_${i}`] ?? "",
      institution: institution ?? "",
      total_marks: row[`total_marks_${i}`] ?? "",
      obtained_marks: row[`obtained_marks_${i}`] ?? "",
      is_current: row[`is_current_${i}`]?.toLowerCase() === "true",
    });
  }
  return items;
}

function facultyFormValueFromRow(row: Record<string, string>): FacultyFormValue {
  return {
    ...emptyFacultyFormValue(),
    first_name: row.first_name ?? "",
    last_name: row.last_name ?? "",
    father_name: row.father_name ?? "",
    gender: (row.gender as Gender) || "Male",
    dob: row.dob ?? "",
    cnic: row.cnic ?? "",
    institutional_email: row.institutional_email ?? "",
    personal_email: row.personal_email ?? "",
    contact_number: row.contact_number ?? "",
    religion: row.religion ?? "",
    image: row.image || null,
    password: row.password ?? "",
    confirm_password: row.password ?? "",
    address: {
      country: row.country ?? "",
      province: row.province ?? "",
      city: row.city ?? "",
      zipcode: row.zipcode ?? "",
      street_address: row.street_address ?? "",
    },
    qualification_set: qualificationSetFromRow(row),
    department: row.department ?? "",
    designation: (row.designation as FacultyFormValue["designation"]) || "Lecturer",
    joining_date: row.joining_date ?? "",
  };
}

function studentFormValueFromRow(row: Record<string, string>): StudentFormValue {
  return {
    ...emptyStudentFormValue(),
    first_name: row.first_name ?? "",
    last_name: row.last_name ?? "",
    father_name: row.father_name ?? "",
    gender: (row.gender as Gender) || "Male",
    dob: row.dob ?? "",
    cnic: row.cnic ?? "",
    institutional_email: row.institutional_email ?? "",
    personal_email: row.personal_email ?? "",
    contact_number: row.contact_number ?? "",
    religion: row.religion ?? "",
    image: row.image || null,
    password: row.password ?? "",
    confirm_password: row.password ?? "",
    address: {
      country: row.country ?? "",
      province: row.province ?? "",
      city: row.city ?? "",
      zipcode: row.zipcode ?? "",
      street_address: row.street_address ?? "",
    },
    qualification_set: qualificationSetFromRow(row),
    program: row.program ?? "",
    admission_date: row.admission_date ?? "",
  };
}

/**
 * Stand-in for POST /api/admin/bulk/?type=faculty|student (AdminModule/views.py::
 * BulkCreateAPIView) — synchronous, no Celery/task polling in the real endpoint either. Each row
 * is validated independently and, if valid, run through the exact same createFacultyRecord/
 * createStudentRecord path the single-record create page uses (mirroring how the real row_parser
 * output is fed straight into FacultySerializer/StudentSerializer, the same serializers
 * FacultyListCreateAPIView/StudentListCreateAPIView use). One row failing doesn't stop the rest —
 * the real view returns 201 with a per-row error list even when some/all rows fail.
 */
export function runBulkImport(type: BulkTargetType, csvText: string): BulkCreateResult {
  const rows = rowsToRecords(parseCsv(csvText));
  const result: BulkCreateResult = { row_count: rows.length, insert_count: 0, error_row_count: 0, errors: [] };

  for (const row of rows) {
    const errors = validateRow(type, row);
    if (Object.keys(errors).length > 0) {
      result.error_row_count += 1;
      result.errors.push({ data_entry: row, errors });
      continue;
    }
    if (type === "faculty") {
      createFacultyRecord(facultyFormValueFromRow(row));
    } else {
      createStudentRecord(studentFormValueFromRow(row));
    }
    result.insert_count += 1;
  }
  return result;
}
