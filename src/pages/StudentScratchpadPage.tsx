import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import CodeMirror, { EditorView } from "@uiw/react-codemirror";
import { python, pythonLanguage } from "@codemirror/lang-python";
import { cpp, cppLanguage } from "@codemirror/lang-cpp";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import type { Completion, CompletionContext, CompletionResult } from "@codemirror/autocomplete";
import { tags as t } from "@lezer/highlight";
import { DashboardShell } from "../components/layout/DashboardShell";
import { STUDENT_RAIL_ITEMS } from "../components/layout/studentRailItems";
import { Breadcrumbs } from "../components/ui/Breadcrumbs";
import { Panel } from "../components/ui/Panel";
import { apiGet, apiMutateForm } from "../lib/auth";
import { ApiError, apiErrorMessage } from "../lib/api";
import type { StudentDashboardResponse } from "../types/api";
import formStyles from "../components/ui/Form.module.css";
import styles from "./StudentScratchpadPage.module.css";

type Language = "python" | "c" | "cpp";
type Mode = "editor" | "upload";

const LANGUAGES: { id: Language; label: string; ext: string; filename: string; template: string }[] = [
  {
    id: "python",
    label: "Python",
    ext: ".py",
    filename: "main.py",
    template: 'print("Hello from Nexus!")\n',
  },
  {
    id: "c",
    label: "C",
    ext: ".c",
    filename: "main.c",
    template: '#include <stdio.h>\n\nint main() {\n    printf("Hello from Nexus!\\n");\n    return 0;\n}\n',
  },
  {
    id: "cpp",
    label: "C++",
    ext: ".cpp",
    filename: "main.cpp",
    template: '#include <iostream>\n\nint main() {\n    std::cout << "Hello from Nexus!" << std::endl;\n    return 0;\n}\n',
  },
];

interface RunResult {
  stdout: string;
  stderr: string;
}

interface CompilerResponse {
  stdout?: string;
  stderr?: string;
  error?: string;
  // The compiler microservices are a separate FastAPI-style service — a request they reject
  // outright (not a compile error, a malformed-request error) comes back in this shape instead of
  // {error}. Django's view (Compilers/views.py) passes their response through unchanged, status
  // code included — so this can arrive as either a 200 or a non-2xx, hence checking it in both
  // the success and catch paths below.
  detail?: string | { msg?: string; type?: string }[];
}

/** Pulls a human-readable message out of whatever failure shape the response actually has —
 * {error}, {detail: "..."}, or {detail: [{msg, type}, ...]} (the microservice's own validation
 * error format, passed through by Django unchanged). Returns null when the body looks like a real
 * run result instead. */
function extractCompilerError(data: CompilerResponse): string | null {
  if (data.error) return data.error;
  if (typeof data.detail === "string") return data.detail;
  if (Array.isArray(data.detail) && data.detail.length > 0) {
    return data.detail.map((d) => d.msg ?? d.type).filter(Boolean).join("; ") || "The compiler service rejected this request.";
  }
  return null;
}

/** Maps CodeMirror's parse tags to this app's own palette instead of pulling in a prebuilt theme
 * package — keeps the editor's colors consistent with everywhere else (warm gold for keywords,
 * the same green/orange/red used for status tones elsewhere) rather than a generic code-theme's
 * blues and purples that wouldn't match. */
const highlightStyle = HighlightStyle.define([
  { tag: [t.keyword, t.controlKeyword, t.operatorKeyword, t.moduleKeyword], color: "var(--color-accent)", fontWeight: 600 },
  { tag: [t.string, t.special(t.string)], color: "var(--color-good)" },
  { tag: [t.number, t.bool, t.null, t.atom], color: "var(--color-warning)" },
  { tag: [t.comment, t.blockComment, t.lineComment], color: "var(--color-muted)", fontStyle: "italic" },
  { tag: [t.function(t.variableName), t.function(t.definition(t.variableName))], color: "var(--color-ink)", fontWeight: 600 },
  { tag: [t.typeName, t.className, t.namespace], color: "var(--color-accent)" },
  { tag: [t.definition(t.variableName), t.propertyName], color: "var(--color-ink)" },
  { tag: [t.operator, t.punctuation, t.bracket], color: "var(--color-muted)" },
  { tag: t.invalid, color: "var(--color-critical)" },
]);

/** Matches .codeInput's old look (surface-sunken background, bordered, rounded) so swapping the
 * plain textarea for CodeMirror didn't change the page's visual language, just added real
 * per-language parsing/highlighting on top of it. */
const editorTheme = EditorView.theme({
  "&": {
    fontSize: "0.84rem",
    backgroundColor: "var(--color-surface-sunken)",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-md)",
  },
  "&.cm-focused": {
    outline: "none",
    borderColor: "var(--color-accent)",
    boxShadow: "0 0 0 3px var(--color-accent-soft)",
  },
  ".cm-content": {
    fontFamily: "var(--font-mono)",
    caretColor: "var(--color-ink)",
  },
  ".cm-gutters": {
    backgroundColor: "var(--color-surface-sunken)",
    color: "var(--color-muted)",
    border: "none",
  },
  ".cm-activeLine, .cm-activeLineGutter": {
    backgroundColor: "var(--color-accent-glow)",
  },
});

/**
 * Hand-maintained symbol lists, not real understanding — no type inference, no import tracking
 * beyond "this literal module/namespace name was typed", nothing that knows what a variable
 * actually holds. That's the deliberate tradeoff for zero backend/language-server dependency.
 */

// python() already ships builtin-function and local-variable completion out of the box (verified
// live — typing "pri" already surfaces "print" and prior local names). What it doesn't have is
// any notion of stdlib modules, so "os." / "math." etc. suggest nothing without this.
const PYTHON_MODULE_MEMBERS: Record<string, string[]> = {
  os: ["path", "getcwd", "listdir", "mkdir", "makedirs", "remove", "removedirs", "rename", "rmdir", "environ", "system", "walk", "sep", "name", "getenv"],
  "os.path": ["join", "exists", "isfile", "isdir", "basename", "dirname", "splitext", "abspath", "getsize"],
  math: ["pi", "e", "tau", "inf", "nan", "sqrt", "pow", "floor", "ceil", "trunc", "log", "log2", "log10", "exp", "sin", "cos", "tan", "asin", "acos", "atan", "atan2", "factorial", "gcd", "isnan", "isinf", "fabs", "hypot"],
  sys: ["argv", "exit", "stdin", "stdout", "stderr", "path", "version", "platform", "maxsize"],
  random: ["random", "randint", "randrange", "choice", "choices", "shuffle", "sample", "seed", "uniform"],
  json: ["dumps", "loads", "dump", "load"],
  re: ["match", "search", "findall", "sub", "split", "compile"],
  time: ["time", "sleep", "strftime", "localtime", "perf_counter"],
  datetime: ["datetime", "date", "time", "timedelta", "now"],
  collections: ["Counter", "defaultdict", "OrderedDict", "namedtuple", "deque"],
  itertools: ["chain", "product", "permutations", "combinations", "count", "cycle", "groupby"],
};

function pythonModuleMemberCompletion(context: CompletionContext): CompletionResult | null {
  const match = context.matchBefore(/[A-Za-z_][\w.]*\.\w*/);
  if (!match) return null;
  const dot = match.text.lastIndexOf(".");
  const members = PYTHON_MODULE_MEMBERS[match.text.slice(0, dot)];
  if (!members) return null;
  return {
    from: match.from + dot + 1,
    options: members.map((label): Completion => ({ label, type: "property" })),
    validFor: /^\w*$/,
  };
}

// @codemirror/lang-cpp registers no completion source at all (verified live — neither stdlib
// names nor a just-defined local variable suggest anything) — this covers both from scratch.
const C_STDLIB_FUNCTIONS = [
  "printf", "scanf", "fprintf", "fscanf", "sprintf", "sscanf", "puts", "gets", "fgets", "fputs",
  "fopen", "fclose", "fread", "fwrite", "fseek", "ftell", "rewind", "putchar", "getchar", "perror",
  "malloc", "calloc", "realloc", "free", "exit", "atoi", "atof", "atol", "abs", "rand", "srand",
  "qsort", "bsearch", "system",
  "strlen", "strcpy", "strncpy", "strcat", "strncat", "strcmp", "strncmp", "strchr", "strstr",
  "strtok", "memcpy", "memmove", "memset", "memcmp",
  "sqrt", "pow", "floor", "ceil", "fabs", "sin", "cos", "tan", "log", "log10", "exp",
  "isalpha", "isdigit", "isspace", "isupper", "islower", "toupper", "tolower",
];

const CPP_STD_MEMBERS = [
  "cout", "cin", "cerr", "endl", "string", "vector", "map", "set", "pair", "sort", "find", "max",
  "min", "swap", "unique_ptr", "shared_ptr", "make_pair", "make_unique", "make_shared", "to_string",
];

function cCompletion(context: CompletionContext): CompletionResult | null {
  const std = context.matchBefore(/std::\w*/);
  if (std) {
    return {
      from: std.from + 5,
      options: CPP_STD_MEMBERS.map((label): Completion => ({ label, type: "function" })),
      validFor: /^\w*$/,
    };
  }

  const word = context.matchBefore(/\w+/);
  if (!word || (word.from === word.to && !context.explicit)) return null;

  const localNames = new Set<string>();
  const identifierPattern = /[A-Za-z_]\w*/g;
  const doc = context.state.doc.toString();
  let m: RegExpExecArray | null;
  while ((m = identifierPattern.exec(doc))) {
    if (m[0] !== word.text) localNames.add(m[0]);
  }

  const options: Completion[] = [
    ...C_STDLIB_FUNCTIONS.map((label): Completion => ({ label, type: "function" })),
    ...Array.from(localNames, (label): Completion => ({ label, type: "variable" })),
  ];
  return { from: word.from, options, validFor: /^\w*$/ };
}

const LANGUAGE_EXTENSIONS = {
  python: [python(), pythonLanguage.data.of({ autocomplete: pythonModuleMemberCompletion })],
  c: [cpp(), cppLanguage.data.of({ autocomplete: cCompletion })],
  cpp: [cpp(), cppLanguage.data.of({ autocomplete: cCompletion })],
} as const;

export function StudentScratchpadPage() {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState<StudentDashboardResponse | null>(null);

  const [mode, setMode] = useState<Mode>("editor");
  const [language, setLanguage] = useState<Language>("python");
  const [code, setCode] = useState(LANGUAGES[0].template);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [stdin, setStdin] = useState("");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<RunResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiGet<StudentDashboardResponse>("/student/dashboard/")
      .then((res) => {
        if (!cancelled) setDashboard(res);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          navigate("/login", { replace: true });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  const active = LANGUAGES.find((l) => l.id === language)!;
  const canRun = mode === "editor" ? code.trim().length > 0 : uploadFiles.length > 0;

  function handleModeChange(next: Mode) {
    setMode(next);
    setResult(null);
    setError(null);
  }

  function handleLanguageChange(next: Language) {
    setLanguage(next);
    setCode(LANGUAGES.find((l) => l.id === next)!.template);
    setResult(null);
    setError(null);
  }

  function handleFilesChosen(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploadFiles((prev) => [...prev, ...Array.from(files)]);
    setResult(null);
    setError(null);
  }

  function removeUploadFile(index: number) {
    setUploadFiles((prev) => prev.filter((_, i) => i !== index));
  }

  const editorExtensions = useMemo(
    () => [LANGUAGE_EXTENSIONS[language], editorTheme, syntaxHighlighting(highlightStyle)],
    [language],
  );

  async function handleRun() {
    setRunning(true);
    setError(null);
    setResult(null);
    try {
      const body = new FormData();
      if (mode === "editor") {
        body.append("file", new File([code], active.filename, { type: "text/plain" }));
      } else {
        for (const file of uploadFiles) body.append("file", file);
      }
      if (stdin.trim()) body.append("input_list", stdin);

      const data = await apiMutateForm<CompilerResponse>("/student/compilers/", "POST", body);
      const message = extractCompilerError(data);
      if (message) {
        setError(message);
      } else {
        setResult({ stdout: data.stdout ?? "", stderr: data.stderr ?? "" });
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        navigate("/login", { replace: true });
        return;
      }
      if (err instanceof ApiError && err.body && typeof err.body === "object") {
        const message = extractCompilerError(err.body as CompilerResponse);
        if (message) {
          setError(message);
          return;
        }
      }
      setError(apiErrorMessage(err));
    } finally {
      setRunning(false);
    }
  }

  const avatarInitials = dashboard ? `${dashboard.first_name[0]}${dashboard.last_name[0]}`.toUpperCase() : "—";

  return (
    <DashboardShell
      railItems={STUDENT_RAIL_ITEMS}
      activeRailId="scratchpad"
      homeHref="/student/dashboard"
      profileHref="/student/profile"
      avatarInitials={avatarInitials}
      avatarSrc={dashboard?.image}
      pageTitle="Scratchpad"
      subtitle={dashboard?.institutional_email ?? ""}
    >
      <Breadcrumbs
        items={[{ label: "Dashboard", href: "/student/dashboard" }, { label: "Scratchpad" }]}
      />

      <Panel
        title="Run code"
        headerExtra={
          <div className={styles.toolbar}>
            <div className={styles.langTabs} role="tablist" aria-label="Mode">
              {(
                [
                  { id: "editor", label: "Editor" },
                  { id: "upload", label: "Upload files" },
                ] as const
              ).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  role="tab"
                  aria-selected={mode === m.id}
                  className={styles.langTab}
                  data-active={mode === m.id}
                  onClick={() => handleModeChange(m.id)}
                >
                  {m.label}
                </button>
              ))}
            </div>
            <div className={styles.langTabs} role="tablist" aria-label="Language">
              {LANGUAGES.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  role="tab"
                  aria-selected={language === l.id}
                  className={styles.langTab}
                  data-active={language === l.id}
                  onClick={() => handleLanguageChange(l.id)}
                >
                  {l.label}
                </button>
              ))}
            </div>
            <button type="button" className={formStyles.primaryButton} onClick={handleRun} disabled={running || !canRun}>
              {running ? "Running…" : "Run"}
            </button>
          </div>
        }
      >
        {mode === "editor" ? (
          <div className={styles.editorRow}>
            <div className={styles.editorRowHead}>
              <span className={styles.editorLabel}>{active.filename}</span>
            </div>
            <CodeMirror
              value={code}
              onChange={setCode}
              extensions={editorExtensions}
              theme="none"
              aria-label={`Code editor — ${active.filename}`}
            />
          </div>
        ) : (
          <div className={styles.editorRow}>
            <label className={formStyles.secondaryButton} htmlFor="file-input">
              + Choose files
            </label>
            <input
              id="file-input"
              type="file"
              multiple
              accept={`${active.ext},.zip`}
              className={styles.fileInput}
              onChange={(e) => {
                handleFilesChosen(e.target.files);
                e.target.value = "";
              }}
            />
            <span className={formStyles.hint}>
              A single {active.ext} file, a .zip archive, or several loose files. For a .zip or
              multiple files, one of them must be named {active.filename} — that's the entry point.
            </span>

            {uploadFiles.length > 0 && (
              <ul className={styles.fileList}>
                {uploadFiles.map((file, index) => (
                  <li key={`${file.name}-${index}`} className={styles.fileChip}>
                    <span>{file.name}</span>
                    <button type="button" onClick={() => removeUploadFile(index)} aria-label={`Remove ${file.name}`}>
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className={styles.lowerRow}>
          <div className={formStyles.field}>
            <label htmlFor="stdin-input">Input (stdin, optional)</label>
            <textarea
              id="stdin-input"
              className={styles.stdinInput}
              placeholder={"One value per line, fed to input() / scanf / cin as the program runs"}
              value={stdin}
              onChange={(e) => setStdin(e.target.value)}
            />
          </div>
        </div>
      </Panel>

      <Panel title="Output" hint={result || error ? undefined : "Nothing run yet"}>
        {error && <div className={formStyles.errorBanner}>{error}</div>}
        {result && (
          <div className={styles.outputGrid}>
            <div>
              <div className={styles.outputLabel}>stdout</div>
              <pre className={styles.outputBlock}>{result.stdout || "(empty)"}</pre>
            </div>
            <div>
              <div className={styles.outputLabel} data-tone={result.stderr ? "critical" : undefined}>
                stderr
              </div>
              <pre className={styles.outputBlock} data-tone={result.stderr ? "critical" : undefined}>
                {result.stderr || "(empty)"}
              </pre>
            </div>
          </div>
        )}
        {!result && !error && <p className={styles.empty}>Write some code above and hit Run to see stdout and stderr here.</p>}
      </Panel>
    </DashboardShell>
  );
}
