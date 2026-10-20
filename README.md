# career-platform

A recruiter-first resume site with a private owner dashboard, built with
Next.js App Router, TypeScript, Tailwind CSS, Drizzle ORM, and PostgreSQL.

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

3. Start the local PostgreSQL database and apply the migrations:

   ```bash
   docker compose up -d --wait
   pnpm db:migrate
   ```

   Docker creates `career_platform` plus the `career_platform_test` and
   `career_platform_e2e` databases the tests use. Stop it with
   `docker compose down`; add `-v` to delete its data.

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
- `pnpm test:integration`: repository and route tests against the
  `career_platform_test` database
- `pnpm test:e2e`: Playwright browser and accessibility tests. They build the
  app and run it on port 3100 against the throwaway
  `career_platform_e2e` database. Run `pnpm exec playwright install chromium`
  once first.

## Operations

Deployment, environment variables, Supabase and Resend setup, backups, and
restore steps are in [docs/operations.md](docs/operations.md).
