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

3. Fill in the required values for Supabase, PostgreSQL, Resend, and analytics.

4. Start the development server:

   ```bash
   pnpm dev
   ```

## Quality commands

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm test:integration`
- `pnpm test:e2e`
