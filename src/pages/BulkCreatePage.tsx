import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAdminPageConfig } from "../components/layout/AdminShellContext";
import { Breadcrumbs } from "../components/ui/Breadcrumbs";
import { flattenFieldErrors, type BulkCreateResult, type BulkTargetType } from "../data/bulkImport";
import { apiGetBlob, apiMutateForm, invalidateCache } from "../lib/auth";
import { ApiError, apiErrorMessage } from "../lib/api";
import formStyles from "../components/ui/Form.module.css";
import detailStyles from "./PersonDetailPage.module.css";
import styles from "./PersonCreatePage.module.css";

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function parseType(value: string | null): BulkTargetType | null {
  return value === "faculty" || value === "student" ? value : null;
}

export function BulkCreatePage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const type = parseType(searchParams.get("type"));
  useAdminPageConfig(type === "faculty" ? "Bulk import — Faculty" : type === "student" ? "Bulk import — Students" : "Bulk import");

  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<BulkCreateResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [downloading, setDownloading] = useState(false);

  function setType(next: BulkTargetType) {
    setSearchParams({ type: next });
    setFile(null);
    setResult(null);
    setError(null);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0] ?? null;
    setResult(null);
    setError(null);
    if (picked && !picked.name.toLowerCase().endsWith(".csv")) {
      setError("Only .csv files are supported.");
      setFile(null);
      return;
    }
    setFile(picked);
  }

  async function handleDownloadTemplate() {
    if (!type) return;
    setDownloading(true);
    setError(null);
    try {
      const blob = await apiGetBlob(`/admin/bulk/?type=${type}`);
      downloadBlob(`${type}_template.csv`, blob);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        navigate("/login", { replace: true });
        return;
      }
      setError(apiErrorMessage(err));
    } finally {
      setDownloading(false);
    }
  }

  async function handleImport() {
    if (!file || !type) return;
    setImporting(true);
    setError(null);
    setResult(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await apiMutateForm<BulkCreateResult>(`/admin/bulk/?type=${type}`, "POST", form);
      setResult(res);
      if (res.insert_count > 0) invalidateCache(type === "faculty" ? "admin:all-faculty" : "admin:all-students");
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        navigate("/login", { replace: true });
        return;
      }
      setError(apiErrorMessage(err));
    } finally {
      setImporting(false);
    }
  }

  return (
    <>
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/admin/dashboard" },
          ...(type === "faculty"
            ? [{ label: "Faculty", href: "/admin/faculty" }]
            : type === "student"
              ? [{ label: "Students", href: "/admin/students" }]
              : []),
          { label: "Bulk import" },
        ]}
      />

      <div className={styles.card}>
        <h1 className={styles.headline}>Bulk import{type === "faculty" ? " — Faculty" : type === "student" ? " — Students" : ""}</h1>

        <div className={formStyles.actions}>
          <button type="button" className={formStyles.secondaryButton} onClick={() => setType("faculty")} disabled={type === "faculty"}>
            Faculty
          </button>
          <button type="button" className={formStyles.secondaryButton} onClick={() => setType("student")} disabled={type === "student"}>
            Students
          </button>
        </div>

        {!type && <p className={formStyles.hint}>Select Faculty or Students to continue.</p>}

        {type && (
          <>
            <div className={formStyles.row}>
              <div className={formStyles.field}>
                <label>&nbsp;</label>
                <button type="button" className={formStyles.secondaryButton} onClick={handleDownloadTemplate} disabled={downloading}>
                  {downloading ? "Downloading…" : "Download CSV template"}
                </button>
              </div>
            </div>

            <div className={formStyles.row}>
              <div className={formStyles.field}>
                <label htmlFor="csvFile">CSV file</label>
                <input id="csvFile" type="file" accept=".csv" onChange={handleFileChange} />
                {file && <span className={formStyles.hint}>{file.name}</span>}
              </div>
              <div className={formStyles.field}>
                <label>&nbsp;</label>
                <button type="button" className={formStyles.primaryButton} onClick={handleImport} disabled={!file || importing}>
                  {importing ? "Importing…" : "Import"}
                </button>
              </div>
            </div>
          </>
        )}

        {error && <div className={formStyles.errorBanner}>{error}</div>}

        {result && (
          <>
            <div className={formStyles.banner}>
              {result.row_count} row{result.row_count === 1 ? "" : "s"} read — {result.insert_count} created,{" "}
              {result.error_row_count} failed.
            </div>
            {result.errors.length > 0 && (
              <div className={detailStyles.editCard}>
                <h3 className={formStyles.sectionTitle}>Row errors</h3>
                {result.errors.map((rowError, index) => (
                  <div className={formStyles.qualRow} key={index}>
                    <strong>
                      {rowError.data_entry.first_name || rowError.data_entry.institutional_email || `Row ${index + 1}`}
                    </strong>
                    <ul>
                      {flattenFieldErrors(rowError.errors).map(({ path, message }) => (
                        <li key={path}>
                          <code>{path}</code>: {message}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
