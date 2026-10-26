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

## How the site runs

The site runs on [Railway](https://railway.com): a web service built from
the `Dockerfile` and a Railway PostgreSQL 18 service, with the domain in
Cloudflare DNS (a `CNAME` at Railway, DNS only).

- **Updating the site:** push to `main`. Railway builds the image, runs
  `node scripts/migrate.mjs` as the pre-deploy step, and switches traffic
  only after `/api/health` passes. A failed migration or health check leaves
  the previous deploy serving.
- **Schema changes:** `pnpm db:generate` locally, commit the migration in
  `drizzle/`, push. Deploys never seed data.
- **Settings:** environment variables live on the Railway web service.
  `DATABASE_URL` references the Postgres service. `NEXT_PUBLIC_*` values are
  built into the app, so changing one rebuilds it. The pre-deploy command
  and health check are set in the Railway dashboard, because Railway ignores
  `railway.json` for new services.
- **Logs and status:** `railway deployment list`, `railway logs`,
  `railway domain list` (after `railway link`).
- **Railway trial:** ends **2026-11-08**. After it, a custom domain needs the
  Hobby plan.

Railway now owns the host, routing, TLS and the certificate. I still own the
code, runtime versions, settings and secrets, the schema, the data and its
backups (Railway's PostgreSQL is unmanaged), DNS, testing and recovery.

On Azure, I set up the firewall rule, nginx with `server_name`, Certbot and
its renewal timer, and systemd services, and shipped updates by SSH, pull,
build and restart. On Railway, TLS, certificates, routing, restarts and
builds are the platform's job, and an update is a `git push`.

The VM's data moved with a verified backup, a one-transaction copy into
Postgres, and a table-by-table comparison of every value. The details, the
problems along the way, rollback and cost notes, and my recommendation on
the move are in [docs/railway-migration.md](docs/railway-migration.md).

### Azure (history)

The site ran on an Azure VM until 2026-10-26, and the VM stays up as the
fallback. Its setup, backups and restore steps are in
[docs/operations.md](docs/operations.md). The migration plan is
[docs/superpowers/plans/2026-10-08-railway-postgres-migration.md](docs/superpowers/plans/2026-10-08-railway-postgres-migration.md).
