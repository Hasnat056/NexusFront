import type { PersonQualification } from "../types/api";
import type { QualificationFormItem } from "../types/dashboard";

export function emptyQualificationFormItem(): QualificationFormItem {
  return {
    degree_title: "",
    education_board: "",
    passing_year: "",
    institution: "",
    total_marks: "",
    obtained_marks: "",
    is_current: false,
  };
}

export function qualificationsToFormItems(qualifications: PersonQualification[] | undefined): QualificationFormItem[] {
  return (qualifications ?? []).map((q) => ({
    degree_title: q.degree_title,
    education_board: q.education_board ?? "",
    passing_year: q.passing_year ? String(q.passing_year) : "",
    institution: q.institution,
    total_marks: q.total_marks ? String(q.total_marks) : "",
    obtained_marks: q.obtained_marks ? String(q.obtained_marks) : "",
    is_current: q.is_current,
  }));
}

/** The UI row index of each item that survives qualificationFormItemsToWire's blank-row filter,
 * in submission order — position k in this array is which UI row the backend's k'th
 * qualification_set error object actually belongs to (see remapListFieldErrors, lib/api.ts). */
export function nonBlankQualificationIndices(items: QualificationFormItem[]): number[] {
  return items.reduce<number[]>((indices, q, i) => {
    if (q.degree_title.trim() || q.institution.trim()) indices.push(i);
    return indices;
  }, []);
}

export function qualificationFormItemsToWire(items: QualificationFormItem[]): PersonQualification[] {
  return items
    .filter((q) => q.degree_title.trim() || q.institution.trim())
    .map((q) => ({
      degree_title: q.degree_title,
      education_board: q.education_board || null,
      passing_year: q.passing_year ? Number(q.passing_year) : null,
      institution: q.institution,
      total_marks: q.total_marks ? Number(q.total_marks) : null,
      obtained_marks: q.obtained_marks ? Number(q.obtained_marks) : null,
      is_current: q.is_current,
    }));
}
