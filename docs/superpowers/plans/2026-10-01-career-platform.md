# Career Platform Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a recruiter-first, database-driven resume site with an
owner-only content dashboard, contact workflow, and private job-application
tracker.

**Architecture:** A Next.js App Router application hosts public, server-rendered
resume pages and protected dashboard routes. Supabase supplies PostgreSQL,
magic-link authentication, and object storage; Drizzle owns typed database
access and migrations; Resend sends contact notifications. Route handlers and
server actions call focused domain services, which call repositories rather than
querying the database directly.

**Tech Stack:** Next.js (App Router), TypeScript, React, Tailwind CSS, Drizzle
ORM, Supabase (PostgreSQL/Auth/Storage), Resend, Zod, Vitest, Playwright,
Vercel, Umami Cloud.

**Spec:** `docs/superpowers/specs/2026-10-01-career-platform-design.md`

## Global Constraints

- Use a single integrated TypeScript/Next.js deployment on Vercel.
- Use Supabase for PostgreSQL, passwordless authentication, and object storage.
- Use Resend for transactional contact notifications.
- Public queries must return published content only.
- Only the allowlisted owner identity may access dashboard routes or mutations.
- Object storage contains binary files; PostgreSQL stores file metadata only.
- Private routes and records must not be indexable.
- Use privacy-first aggregate analytics without marketing profiling.
- The public UI is minimal, professional, responsive, semantic, and keyboard
  accessible.
- Do not implement public opportunity listings, candidate or employer
  accounts, billing, chat, community features, or generated PDFs.
- Include the required Copilot co-author trailer in every commit.

---

## File Structure

| Path | Responsibility |
| --- | --- |
| `app/(public)/**` | Public resume, projects, contact, metadata, sitemap, and robots routes. |
| `app/(admin)/admin/**` | Owner-only dashboard screens. |
| `app/api/**/route.ts` | Narrow HTTP endpoints for contact submission and uploads. |
| `components/public/**` | Accessible public presentation components. |
| `components/admin/**` | Reusable dashboard forms and workflow controls. |
| `lib/auth/**` | Supabase server/browser clients and owner authorization guards. |
| `lib/db/schema.ts` | Drizzle table definitions and inferred row types. |
| `lib/db/repositories/**` | Typed persistence operations; no business policy. |
| `lib/services/**` | Validation, authorization-aware business rules, and transactions. |
| `lib/storage/**` | Supabase Storage authorization and file operations. |
| `lib/email/**` | Resend adapter and contact-notification template. |
| `drizzle/**` | Versioned SQL migrations and Drizzle metadata. |
| `tests/unit/**` | Service and repository tests. |
| `tests/integration/**` | PostgreSQL-backed route and persistence tests. |
| `tests/e2e/**` | Critical public and owner dashboard browser flows. |

### Task 1: Establish the Next.js Foundation

**Files:**
- Create: `package.json`, `next.config.ts`, `tsconfig.json`,
  `tailwind.config.ts`, `postcss.config.mjs`, `vitest.config.ts`,
  `playwright.config.ts`, `.env.example`
- Create: `app/layout.tsx`, `app/globals.css`, `app/page.tsx`,
  `app/not-found.tsx`, `app/error.tsx`
- Create: `components/site-header.tsx`, `components/site-footer.tsx`
- Create: `tests/unit/site-shell.test.tsx`
- Modify: `README.md`

**Interfaces:**
- Produces `SiteHeader(): JSX.Element`, `SiteFooter(): JSX.Element`, and the
  public root route consumed by later public pages.
- Produces `pnpm test`, `pnpm test:integration`, `pnpm test:e2e`,
  `pnpm lint`, and `pnpm typecheck` scripts.

- [ ] **Step 1: Scaffold the application and install declared dependencies**

  Run:

  ```bash
  pnpm create next-app@latest . --ts --tailwind --eslint --app --src-dir=false --import-alias='@/*' --use-pnpm
  pnpm add drizzle-orm postgres @supabase/ssr @supabase/supabase-js zod resend
  pnpm add -D drizzle-kit vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom playwright
  ```

- [ ] **Step 2: Write the failing shell test**

  ```tsx
  import { render, screen } from '@testing-library/react';
  import Home from '@/app/page';

  it('renders a recruiter-oriented resume call to action', () => {
    render(<Home />);
    expect(screen.getByRole('link', { name: /view resume/i })).toBeVisible();
  });
  ```

- [ ] **Step 3: Run the test to verify it fails**

  Run: `pnpm vitest run tests/unit/site-shell.test.tsx`

  Expected: FAIL because the resume link does not exist.

- [ ] **Step 4: Implement the accessible application shell and placeholder home**

  Create a root layout with semantic header, main, and footer landmarks.
  Implement `SiteHeader` with a skip link and `SiteFooter` with the current
  year. Make `app/page.tsx` render one `h1`, a concise professional summary,
  and a `View resume` link that targets `/resume`.

- [ ] **Step 5: Configure quality tooling and document local setup**

  Add scripts for linting, TypeScript checking, unit/integration tests, and
  Playwright. `.env.example` must list:

  ```dotenv
  NEXT_PUBLIC_SUPABASE_URL=
  NEXT_PUBLIC_SUPABASE_ANON_KEY=
  SUPABASE_SERVICE_ROLE_KEY=
  DATABASE_URL=
  RESEND_API_KEY=
  CONTACT_NOTIFICATION_EMAIL=
  OWNER_EMAIL=
  NEXT_PUBLIC_UMAMI_WEBSITE_ID=
  NEXT_PUBLIC_UMAMI_SCRIPT_URL=
  ```

  Update `README.md` with the required Node and pnpm versions, local environment
  setup, and each quality command.

- [ ] **Step 6: Run quality checks and commit**

  Run: `pnpm lint && pnpm typecheck && pnpm test`

  Commit:

  ```bash
  git add package.json pnpm-lock.yaml app components tests README.md .env.example \
    next.config.ts tsconfig.json tailwind.config.ts postcss.config.mjs vitest.config.ts playwright.config.ts
  git commit -m "feat: establish career platform foundation" \
    -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
  ```

### Task 2: Define the Database Schema and Typed Persistence Boundary

**Files:**
- Create: `drizzle.config.ts`, `lib/db/client.ts`, `lib/db/schema.ts`
- Create: `lib/db/repositories/public-content.ts`,
  `lib/db/repositories/job-applications.ts`,
  `lib/db/repositories/contact-messages.ts`
- Create: `drizzle/0000_initial_schema.sql`
- Create: `tests/integration/public-content-repository.test.ts`,
  `tests/integration/job-application-repository.test.ts`

**Interfaces:**
- Produces `getPublishedProfile()`, `listPublishedExperience()`,
  `listPublishedProjects()`, and `getPublishedProjectBySlug(slug: string)`.
- Produces `createApplication(input: NewApplication)`,
  `transitionApplicationStatus(id: string, status: ApplicationStatus)`, and
  `appendApplicationActivity(input: NewApplicationActivity)`.
- Produces the `ApplicationStatus` union:
  `'saved' | 'applied' | 'interviewing' | 'offer' | 'rejected' | 'withdrawn'`.

- [ ] **Step 1: Write failing integration tests**

  Test that a draft project is absent from `listPublishedProjects`, a published
  project is returned in `sortOrder` order, and a status transition creates
  exactly one activity record in the same transaction.

  ```ts
  expect(await listPublishedProjects()).toEqual([
    expect.objectContaining({ slug: 'accessible-search', publicationState: 'published' }),
  ]);
  expect(activities).toEqual([
    expect.objectContaining({ priorStatus: 'saved', resultingStatus: 'applied' }),
  ]);
  ```

- [ ] **Step 2: Run the tests to verify they fail**

  Run: `pnpm test:integration -- public-content-repository job-application-repository`

  Expected: FAIL because database modules and migrations do not exist.

- [ ] **Step 3: Implement schema, migration, and repositories**

  Define all entities in the approved spec. Use Postgres enums for
  `publication_state`, `contact_message_status`, and `application_status`.
  Add foreign keys from contacts, documents, and activities to job
  applications, and unique constraints for project slugs and the current
  resume marker. Repository methods must filter `publication_state = 'published'`
  for every public query. Implement status transition plus activity append in
  one transaction.

- [ ] **Step 4: Add migration and integration-test database lifecycle**

  Generate and check in the Drizzle migration. Configure integration tests to
  require `DATABASE_URL`, run migrations before tests, truncate tables after
  each test, and fail clearly when the variable is absent.

- [ ] **Step 5: Run checks and commit**

  Run: `pnpm typecheck && pnpm test:integration`

  Commit with `feat: add career platform data model`.

### Task 3: Add Supabase Authentication and Owner Authorization

**Files:**
- Create: `lib/auth/server.ts`, `lib/auth/browser.ts`, `lib/auth/owner.ts`,
  `middleware.ts`
- Create: `app/auth/callback/route.ts`, `app/login/page.tsx`,
  `app/(admin)/admin/layout.tsx`
- Create: `tests/unit/owner-authorization.test.ts`

**Interfaces:**
- Produces `createServerSupabaseClient()`, `getAuthenticatedUser()`, and
  `requireOwner(): Promise<AuthenticatedOwner>`.
- `requireOwner()` redirects unauthenticated requests to `/login`, rejects an
  authenticated non-owner with HTTP 403, and returns the validated owner.

- [ ] **Step 1: Write failing authorization tests**

  Mock Supabase auth and verify: no user redirects to login; a user whose email
  differs from `OWNER_EMAIL` receives a forbidden error; the matching owner
  returns `{ id, email }`.

- [ ] **Step 2: Run the test to verify it fails**

  Run: `pnpm vitest run tests/unit/owner-authorization.test.ts`

  Expected: FAIL because `requireOwner` does not exist.

- [ ] **Step 3: Implement magic-link login and owner guards**

  Use `@supabase/ssr` cookie-aware clients. The login page sends a magic link
  only for the configured owner email. The callback exchanges the code for a
  session. Protect `/admin/:path*` in middleware and call `requireOwner` again
  in dashboard layouts, server actions, and route handlers.

- [ ] **Step 4: Run checks and commit**

  Run: `pnpm lint && pnpm typecheck && pnpm test`

  Commit with `feat: protect owner dashboard`.

### Task 4: Deliver Public Resume Content and SEO

**Files:**
- Create: `app/(public)/layout.tsx`, `app/(public)/page.tsx`,
  `app/(public)/projects/[slug]/page.tsx`, `app/resume/route.ts`,
  `app/sitemap.ts`, `app/robots.ts`
- Create: `components/public/experience-timeline.tsx`,
  `components/public/project-card.tsx`, `components/public/skills-list.tsx`,
  `components/public/contact-links.tsx`
- Create: `lib/services/public-profile.ts`
- Create: `tests/unit/public-profile.test.ts`,
  `tests/e2e/public-resume.spec.ts`

**Interfaces:**
- Produces `getPublicProfilePage(): Promise<PublicProfilePage>`, which
  combines published profile, experience, skills, social links, current resume,
  and projects.
- `GET /resume` returns the current published PDF with a safe attachment name,
  or 404 when no current document is published.

- [ ] **Step 1: Write failing service and browser tests**

  Verify the page exposes only published data, shows an accessible Resume PDF
  link, renders an `h1`, and its keyboard focus reaches that link. Verify
  `/robots.txt` disallows `/admin` and `/api`.

- [ ] **Step 2: Run tests to verify they fail**

  Run: `pnpm test tests/unit/public-profile.test.ts && pnpm test:e2e -- public-resume`

  Expected: FAIL because public profile routes and service are absent.

- [ ] **Step 3: Implement public routes and metadata**

  Build the minimal public page from `getPublicProfilePage`. Render projects
  at stable slug URLs and return `notFound()` for unpublished or missing
  slugs. Add route-specific metadata, canonical URLs, Open Graph data,
  `sitemap.ts` entries only for published pages, and a `robots.ts` rule that
  blocks admin and API routes. Use semantic list and article elements, visible
  focus styles, and alt text from database fields.

- [ ] **Step 4: Implement the resume download route**

  Resolve the one current published `resume_document`, create a short-lived
  Supabase Storage signed URL server-side, fetch it, and return its bytes with
  `Content-Type: application/pdf` and a sanitized
  `Content-Disposition: attachment; filename="first-last-resume.pdf"` header.

- [ ] **Step 5: Run checks and commit**

  Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm test:e2e -- public-resume`

  Commit with `feat: publish resume and portfolio pages`.

### Task 5: Build Content Management and Resume Uploads

**Files:**
- Create: `app/(admin)/admin/page.tsx`,
  `app/(admin)/admin/profile/page.tsx`,
  `app/(admin)/admin/experience/page.tsx`,
  `app/(admin)/admin/projects/page.tsx`,
  `app/(admin)/admin/skills/page.tsx`, `app/(admin)/admin/resume/page.tsx`
- Create: `components/admin/content-status-control.tsx`,
  `components/admin/project-form.tsx`, `components/admin/resume-upload-form.tsx`
- Create: `lib/services/content-management.ts`, `lib/storage/resumes.ts`
- Create: `tests/unit/content-management.test.ts`,
  `tests/integration/resume-upload-route.test.ts`

**Interfaces:**
- Produces `saveProject(input: ProjectDraft)`, `publishProject(id: string)`,
  `unpublishProject(id: string)`, and analogous profile, experience, and skill
  operations.
- Produces `replaceCurrentResume(file: UploadedFile): Promise<ResumeDocument>`.
- `UploadedFile` is `{ name: string; type: string; size: number; bytes: Uint8Array }`.

- [ ] **Step 1: Write failing tests**

  Assert invalid project URLs and missing titles return Zod field errors; a
  publish operation revalidates the affected public path; a non-PDF or a PDF
  larger than 10 MiB is rejected before storage; replacing a resume clears the
  prior current marker atomically.

- [ ] **Step 2: Run tests to verify they fail**

  Run: `pnpm test tests/unit/content-management.test.ts && pnpm test:integration -- resume-upload-route`

  Expected: FAIL because management and storage services are absent.

- [ ] **Step 3: Implement authenticated dashboard forms and services**

  Provide create/edit, draft/publish, unpublish, ordering, preview, and
  deletion confirmation controls. Validate all server actions with Zod and call
  `requireOwner` inside each action. Preserve submitted field values and render
  field-specific errors when validation fails. Call `revalidatePath` after
  published-content changes.

- [ ] **Step 4: Implement resume storage**

  Create a private `resumes` bucket. Accept only `application/pdf`, maximum
  10 MiB, with server-generated object keys. Upload after authorization, then
  persist metadata and set the single current published record inside a
  transaction. On metadata failure, delete the just-uploaded object and return
  an explicit failure.

- [ ] **Step 5: Run checks and commit**

  Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm test:integration`

  Commit with `feat: add resume content dashboard`.

### Task 6: Implement the Contact Workflow and Notifications

**Files:**
- Create: `app/api/contact/route.ts`, `components/public/contact-form.tsx`
- Create: `lib/services/contact-submission.ts`, `lib/email/resend.ts`,
  `lib/email/contact-notification.ts`, `lib/security/rate-limit.ts`
- Create: `app/(admin)/admin/messages/page.tsx`
- Create: `tests/integration/contact-route.test.ts`,
  `tests/unit/contact-submission.test.ts`

**Interfaces:**
- Produces `submitContactMessage(input: ContactSubmission, requestKey: string)`.
- `ContactSubmission` is `{ name: string; email: string; subject: string; message: string }`.
- Returns `{ id: string; notificationStatus: 'sent' | 'failed' }` for accepted
  messages and a typed validation or rate-limit failure otherwise.

- [ ] **Step 1: Write failing tests**

  Verify blank/invalid fields return 422 with field errors; more than five
  requests per IP in one hour returns 429; a valid submission persists the
  message and calls the Resend adapter; an adapter failure persists the message
  with `notificationStatus: 'failed'` and returns an actionable 202 response.

- [ ] **Step 2: Run tests to verify they fail**

  Run: `pnpm test tests/unit/contact-submission.test.ts && pnpm test:integration -- contact-route`

  Expected: FAIL because the route and service are absent.

- [ ] **Step 3: Implement contact API, rate limiter, email adapter, and inbox**

  Validate JSON with Zod; derive a privacy-preserving hashed IP key using a
  server secret; enforce five accepted attempts per hour; persist the message
  before notification; and never expose provider error text to a visitor.
  Implement an owner-only message list with unread, read, and archived status.

- [ ] **Step 4: Run checks and commit**

  Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm test:integration`

  Commit with `feat: add contact message workflow`.

### Task 7: Implement Private Job-Application Tracking

**Files:**
- Create: `app/(admin)/admin/applications/page.tsx`,
  `app/(admin)/admin/applications/new/page.tsx`,
  `app/(admin)/admin/applications/[id]/page.tsx`
- Create: `components/admin/application-form.tsx`,
  `components/admin/application-status-select.tsx`,
  `components/admin/application-timeline.tsx`
- Create: `lib/services/application-management.ts`,
  `lib/storage/application-documents.ts`
- Create: `tests/unit/application-management.test.ts`,
  `tests/e2e/application-workflow.spec.ts`

**Interfaces:**
- Produces `createApplication(input: ApplicationDraft)`,
  `updateApplication(id: string, input: ApplicationDraft)`,
  `changeApplicationStatus(id: string, status: ApplicationStatus)`, and
  `addApplicationDocument(id: string, file: UploadedFile)`.
- `ApplicationDraft` includes company, role, source, URL, status, applied date,
  notes, and optional next follow-up date.

- [ ] **Step 1: Write failing service and browser tests**

  Verify an owner can create a saved application, move it to applied, see a
  timeline entry with previous and new status, add a contact, and attach an
  owner-only document. Verify any unauthenticated browser navigation to an
  application page ends at `/login`.

- [ ] **Step 2: Run tests to verify they fail**

  Run: `pnpm test tests/unit/application-management.test.ts && pnpm test:e2e -- application-workflow`

  Expected: FAIL because dashboard application routes are absent.

- [ ] **Step 3: Implement the private tracker**

  Use Zod to enforce required company and role, valid URLs and dates, and the
  defined status union. Wrap each status change and activity creation in the
  repository transaction from Task 2. Provide filters for status and
  follow-up date, and show contacts, documents, notes, and timeline in the
  detail screen.

- [ ] **Step 4: Implement private document uploads**

  Store files in a private `application-documents` bucket under
  `owner/{applicationId}/{uuid}-{sanitizedName}`. Permit PDF, DOCX, and TXT
  types up to 10 MiB; reject all others. Download through an owner-authorized
  signed URL endpoint only.

- [ ] **Step 5: Run checks and commit**

  Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm test:e2e -- application-workflow`

  Commit with `feat: add private application tracker`.

### Task 8: Complete Production Readiness and Deploy

**Files:**
- Create: `app/api/health/route.ts`, `lib/observability/logger.ts`,
  `components/analytics.tsx`, `docs/operations.md`
- Modify: `app/layout.tsx`, `next.config.ts`, `README.md`
- Create: `.github/workflows/ci.yml`, `tests/e2e/accessibility.spec.ts`

**Interfaces:**
- `GET /api/health` returns `{ status: 'ok' }` only when a minimal database
  query succeeds; otherwise returns `{ status: 'degraded' }` with HTTP 503.
- `logServerError(event: string, error: unknown, context: Record<string, string>): void`
  removes secrets and PII before logging.

- [ ] **Step 1: Write failing health and accessibility tests**

  Verify the health endpoint returns 503 on database failure and 200 on
  success. Use Playwright to assert no automatically detected serious
  accessibility violations on the home page, project page, login page, and
  contact form.

- [ ] **Step 2: Run tests to verify they fail**

  Run: `pnpm test:integration -- health && pnpm test:e2e -- accessibility`

  Expected: FAIL because the endpoint and checks are absent.

- [ ] **Step 3: Implement operational controls**

  Add structured, redacted server-error logging. Add the Umami script only when
  both public analytics environment variables are configured; do not render
  third-party tracking otherwise. Add strict security headers appropriate for
  Next.js, including frame protection and a restrictive referrer policy, without
  blocking Supabase auth callbacks or Vercel deployment behavior.

- [ ] **Step 4: Add CI and deployment documentation**

  Configure GitHub Actions to run install, lint, typecheck, unit tests,
  integration tests when a test database secret is available, and Playwright.
  Document Supabase project setup, SQL migration deployment, storage buckets,
  auth redirect URLs, Resend domain verification, Vercel environment
  variables, backup configuration, health checks, and database restore steps.

- [ ] **Step 5: Run the release gate and commit**

  Run:

  ```bash
  pnpm lint && pnpm typecheck && pnpm test && pnpm test:integration && pnpm test:e2e
  ```

  Commit with `chore: prepare career platform for deployment`.

## Plan Self-Review

**Spec coverage:** Tasks 1-4 cover the public resume, projects, PDF download,
accessibility, responsive presentation, SEO, sitemap, robots, and indexing.
Tasks 2, 5, and 7 cover every specified entity, content state, storage
metadata, and private application workflow. Tasks 3, 5-7 cover owner-only
authorization and all mutations. Task 6 covers contact persistence,
notifications, validation, and rate limiting. Task 8 covers analytics,
monitoring, backups, operations, CI, and deployment. No specification
requirement is unassigned.

**Placeholder scan:** The plan contains no deferred implementation markers or
unspecified validation/error-handling directives; every task names exact files,
interfaces, test cases, commands, and a commit boundary.

**Type consistency:** `ApplicationStatus`, `UploadedFile`,
`ContactSubmission`, and `ApplicationDraft` are introduced before use and use
the same field names throughout the plan.
