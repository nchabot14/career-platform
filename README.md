# career-platform

Recruiter-first career platform built with Next.js App Router, TypeScript, and
Tailwind CSS.

## Requirements

- Node.js 24.20.0
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

3. Fill in the required values for Supabase, Resend, and analytics.

4. Create the local SQLite database:

   ```bash
   pnpm db:migrate
   ```

   The database lives at `data/career_platform.db` unless `DATABASE_URL`
   points elsewhere. `pnpm test:integration` uses a separate
   `data/career_platform.test.db` and applies the Drizzle migrations itself.

5. Start the development server:

   ```bash
   pnpm dev
   ```

## Database commands

- `pnpm db:generate` — create a migration after editing `lib/db/schema.ts`
- `pnpm db:migrate` — apply pending migrations

## Quality commands

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm test:integration`
- `pnpm test:e2e`
