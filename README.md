# career-platform

A recruiter-first resume site with a private owner dashboard, built with
Next.js App Router, TypeScript, Tailwind CSS, Drizzle ORM, and SQLite.

- **Public site:** profile, experience, projects (each with its own page),
  skills, education, links, a Resume PDF download, and a contact form.
  Only published content is shown.
- **Owner dashboard (`/admin`):** edit, order, publish, and preview content;
  upload the resume PDF; read contact messages; track job applications with
  contacts, documents, and a status timeline. Sign-in uses Supabase magic
  links and admits only `OWNER_EMAIL`.

## Requirements

- Node.js 24
- pnpm 11.24.0

## Local setup

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Create your local environment file:

   ```bash
   cp .env.example .env.local
   ```

   The public site works with no changes. `/admin` needs the Supabase values
   and `OWNER_EMAIL`; contact-form email alerts need the Resend values. See
   [docs/operations.md](docs/operations.md#environment-variables).

3. Create the local SQLite database:

   ```bash
   pnpm db:migrate
   ```

   The database lives at `data/career_platform.db` unless `DATABASE_URL`
   points elsewhere, and uploads go to `data/files/`. Both are git-ignored.

4. Start the development server:

   ```bash
   pnpm dev
   ```

## Database commands

- `pnpm db:generate`: create a migration after editing `lib/db/schema.ts`
- `pnpm db:migrate`: apply pending migrations

## Quality commands

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`: unit tests
- `pnpm test:integration`: repository and route tests against
  `data/career_platform.test.db`
- `pnpm test:e2e`: Playwright browser and accessibility tests. They build the
  app and run it on port 3100 against a throwaway
  `data/career_platform.e2e.db`. Run `pnpm exec playwright install chromium`
  once first.

## Operations

Deployment, environment variables, Supabase and Resend setup, backups, and
restore steps are in [docs/operations.md](docs/operations.md).
