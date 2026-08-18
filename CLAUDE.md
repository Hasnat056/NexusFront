# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project state

This is a freshly scaffolded Vite + React + TypeScript project (created from the default `vite` React-TS template). `src/App.tsx` still contains the template's starter markup — no application-specific architecture exists yet. Do not assume conventions beyond what's described below; they haven't been established.

This app is the frontend for **NexusAPI**, a Django REST Framework backend for a university LMS, located at `/home/hasnat/Public/NexusAPI` (sibling directory). That repo has its own `CLAUDE.md` with full backend architecture details — read it when working on integration code. Summary of what matters for frontend work:

- **Base API URL**: local dev `http://localhost:8000/api/`; production `https://nexusapi.eastasia.cloudapp.azure.com/api/`.
- **Auth**: JWT via `djangorestframework-simplejwt`. `POST /api/token/` (body: `username`, `password`) returns `{access, refresh}`; `POST /api/token/refresh/` renews the access token. Send `Authorization: Bearer <access>` on all authenticated requests. Access tokens last 60 min, refresh tokens 7 days (configurable backend-side).
- **Three role-scoped route trees**, gated server-side by Django auth groups (`Admin`, `Faculty`, `Student`) — the frontend should branch its UI/routing around these same three roles:
  - `/api/admin/` — faculty/student/department/program/course management, semester lifecycle, allocations, enrollments, bulk CSV import, transcripts.
  - `/api/faculty/` — dashboard, profile, own course allocations, assessments, lectures/attendance, result-calculation requests, change requests.
  - `/api/student/` — dashboard, profile, own enrollments, attendance, transcripts.
- **API docs**: Swagger UI at `/api/schema/swagger-ui/`, ReDoc at `/api/schema/redoc/`, raw OpenAPI schema at `/api/schema/` — check these for exact request/response shapes rather than guessing from the README's endpoint table.
- **File uploads** (profile images, assessment/submission files) are proxied through the backend to Cloudinary; allowed types `jpeg, png, pdf, docx, pptx, xlsx, csv, zip`, max 50MB.
- **Local full-stack dev**: the backend runs via `docker compose up --build` from `/home/hasnat/Public/NexusAPI` (services: Django `backend`, MySQL, Redis, Celery, compiler microservices). Bring that stack up when you need a live API to develop against.

## Commands

- `npm run dev` — start the Vite dev server with HMR
- `npm run build` — type-check via `tsc -b` then production build via `vite build`
- `npm run lint` — run Oxlint
- `npm run preview` — preview the production build locally

There is no test runner configured in this project yet.

## Tooling

- **Linter**: Oxlint (`.oxlintrc.json`), not ESLint. Config enables `react`, `typescript`, and `oxc` plugins with `react/rules-of-hooks` as an error. Type-aware linting is not currently enabled (would require `oxlint-tsgolint`).
- **TypeScript**: project-references setup — root `tsconfig.json` references `tsconfig.app.json` (src) and `tsconfig.node.json` (Vite config). `tsconfig.app.json` targets `ES2023`, uses bundler module resolution, and enables strict-ish linting flags (`noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`, `erasableSyntaxOnly`). `verbatimModuleSyntax` is on, so type-only imports must use `import type`.
- **React Compiler** is not enabled.
- No CSS framework or component library is wired in; styling is currently plain CSS (`src/index.css`, `src/App.css`).
