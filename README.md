# Nexus Web

The web frontend for **Nexus**, a university learning management system. It gives admins, faculty and students their own workspace for running the academic semester, from setting up programs and classes through to results and transcripts.

The backend lives in a separate repository: [NexusAPI](https://github.com/Hasnat056/NexusAPI) (Django REST Framework).

## What it does

Nexus has three roles. Each one gets its own dashboard and routes, and the backend enforces the same boundaries through Django auth groups.

**Admin** manages the institution's academic structure and the semester lifecycle:

- Departments, programs, courses, classes and academic sessions
- Faculty and student records, including bulk creation from CSV
- Semesters, from generation and activation to closing
- Course allocations (one at a time or in bulk) and student enrollments
- A change-request queue for faculty requests such as result recalculation
- Student transcripts

**Faculty** run the courses they're allocated:

- A dashboard of current allocations and what's due
- Assessments and marks for each allocation
- Lectures and attendance
- Change requests sent to the admin, with status tracking

**Students** follow their own progress:

- A dashboard with current enrollments and upcoming work
- Attendance per course
- Semester results and the full transcript, both downloadable as PDF
- A coding scratchpad that runs Python, C and C++ through the backend's compiler services

## Tech stack

- React 19 and TypeScript
- Vite for the dev server and build
- React Router 7 for role-scoped routing
- CodeMirror 6 for the scratchpad editor
- jsPDF with jspdf-autotable for transcript and result PDFs
- Plain CSS Modules with shared design tokens (`src/styles/tokens.css`), no UI framework
- Oxlint for linting

## Getting started

You'll need Node.js 20.19+ or 22.12+ (what Vite 8 requires), and a running NexusAPI instance to sign in against.

### 1. Start the backend

From the NexusAPI repository:

```bash
docker compose up --build
```

This serves the API at `http://localhost:8000/api/`. See the NexusAPI README for creating users and loading data.

### 2. Start the frontend

```bash
npm install
npm run dev
```

Open the URL Vite prints (normally `http://localhost:5173`). The dev server proxies every `/api` request to `localhost:8000` (see `vite.config.ts`), so you don't need to set up CORS on the backend for local work.

### 3. Sign in

Choose a role on the login screen and enter credentials for an account in that role's group (`Admin`, `Faculty` or `Student`). After sign-in, the app calls that role's `/profile/` endpoint to confirm the account really belongs to the chosen role.

## Configuration

| Variable            | Default | Purpose                                      |
| ------------------- | ------- | -------------------------------------------- |
| `VITE_API_BASE_URL` | `/api`  | Base URL the app uses for every API request. |

Put overrides in a `.env.local` file (it's gitignored), for example:

```bash
VITE_API_BASE_URL=https://your-api-host.example.com/api
```

## Scripts

| Command           | What it does                                             |
| ----------------- | -------------------------------------------------------- |
| `npm run dev`     | Start the dev server with hot reload                     |
| `npm run build`   | Type-check, then build for production to `dist/`         |
| `npm run preview` | Serve the production build locally                       |
| `npm run lint`    | Run Oxlint                                               |

## Deploying

`npm run build` produces a static site in `dist/`. Two things matter when you host it:

1. **Same origin, or CORS.** NexusAPI doesn't send CORS headers at the moment. The simplest setup is to serve `dist/` from the same Nginx that proxies the API, so `/api` stays same-origin and the default `VITE_API_BASE_URL` works unchanged. Hosting the frontend on another domain means enabling CORS on the backend and building with `VITE_API_BASE_URL` pointed at it.
2. **SPA fallback.** The app uses client-side routing, so the server has to return `index.html` for unknown paths. In Nginx that's `try_files $uri /index.html;`.

## Authentication

Sign-in uses JWT through NexusAPI (`POST /api/token/`). The access and refresh tokens are kept in `localStorage`, and every authenticated request sends `Authorization: Bearer <access>`. Token refresh isn't wired up yet: when the access token expires (60 minutes by default), the next request gets a 401, the app clears the session and asks the user to sign in again.

## Project structure

```
src/
  pages/        One component per route (Admin*, Faculty*, Student* and shared pages)
  components/
    layout/     App shell, side rail, top bar, per-role layouts
    ui/         Reusable pieces: tables, selects, tags, form fields, panels
    charts/     Dashboard charts and timelines
    auth/       Route guards
  lib/          API client, auth, PDF generation, shared helpers
  hooks/        Shared React hooks
  data/         Display helpers, label maps, and a few remaining local stand-ins
  types/        TypeScript types for API payloads
  styles/       Design tokens
```

## Status

Nexus is under active development. Most screens use the live API. A few parts, such as the admin change-request queue, still use local placeholder data until the matching backend endpoints are connected.
