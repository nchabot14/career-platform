# Move to Railway and PostgreSQL Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** nickchabot.com is served by the existing Railway project: the Next.js app runs on its web service, with all data and uploaded files in its Postgres service. The Azure VM stays running for a week as a fallback.

**Architecture:** The Drizzle schema moves from SQLite (libsql) to PostgreSQL (postgres.js), based on the Postgres schema the app used before commit `1405773`. Uploaded files move from local disk into a `stored_file` table. `lib/storage/files.ts` keeps its three functions, so its callers don't change. A Dockerfile builds the app for Railway, and a pre-deploy command applies migrations. A one-off script copies the VM's SQLite data and files into Railway Postgres. A Cloudflare DNS change then moves the domain.

**Tech Stack:** Next.js 16.3.7, Node.js 24, pnpm 11.24.0, Drizzle ORM 0.45 + drizzle-kit 0.31, `postgres` (postgres.js) 3.4, `@libsql/client` (copy script only), Docker, Railway (CLI + config-as-code), Cloudflare DNS, Supabase Auth, Resend.

**Spec:** No separate spec file. The requirements are the user's request of 2026-10-08 ("plan its move to Railway and PostgreSQL; the Railway project already exists with Postgres and a web service"), plus the answers they gave the same day: store uploaded files in Postgres, copy all VM data over, move the domain and keep the VM as a fallback. The user repeated the request on 2026-10-20; the plan was re-checked against the code and the live site that day (see "Changes since 2026-10-08").

## What exists today (checked 2026-10-08, re-checked 2026-10-20)

| | |
|---|---|
| App | Next.js App Router. Drizzle on SQLite via `@libsql/client` (`lib/db/client.ts`, `lib/db/schema.ts`). One migration, `drizzle/0000_initial_schema.sql`. |
| Uploads | Resume PDFs and application documents are written to `FILE_STORAGE_DIR` (default `data/files`) by `lib/storage/files.ts`. They are read in `app/resume/route.ts` and `app/(admin)/admin/applications/[id]/documents/[documentId]/route.ts`. |
| Production | Azure VM `vm-career-platform` (address `<VM_PUBLIC_IP>`; this public repo uses placeholders for addresses). nginx with a Certbot certificate for nickchabot.com proxies to `career-platform@8000` and `@8001`. Data lives in `~/career-platform/data/career_platform.db` and `~/career-platform/data/files/`. |
| DNS | Cloudflare (nameservers `*.ns.cloudflare.com`). `nickchabot.com` resolves straight to the VM (DNS only; nginx answers). `www` is **proxied by Cloudflare** (orange cloud): Cloudflare itself answers with a 301 to `https://nickchabot.com/`, so `www` traffic never reaches the VM. |
| Analytics and privacy | `/privacy` page and a GA4 tag behind a consent banner (`components/analytics.tsx`, `components/consent-banner.tsx`, `lib/consent.ts`), merged 2026-10-20 but **not yet deployed**. The tag only renders when the build-time variable `NEXT_PUBLIC_GA_MEASUREMENT_ID` is set. The privacy page names Microsoft Azure as host and has `[CONFIRM: …]` placeholders for backup and server-log retention. |
| Railway | A project already exists with a Postgres service and a web service. Its service names, Postgres version and GitHub link haven't been checked yet; Task 0 does that. |
| Local tools | No `railway` CLI and no `psql`. Docker is installed but wasn't running. |

SQLite-only code that must change: the `rowid` tie-break in `lib/db/repositories/job-applications.ts:171`, the `is_current = 1` partial index, the `'[]'` JSON defaults, `databaseClient.execute` in `app/api/health/route.ts`, `databaseClient.batch` in `tests/integration/test-database.ts`, and `tests/e2e/prepare-database.mjs`.

## Changes since 2026-10-08

Checked 2026-10-20. No commit since 2026-10-08 touches `lib/db`, `lib/storage`, `drizzle/`, `tests/integration`, `tests/e2e/prepare-database.mjs`, `playwright.config.ts`, `.github/` or `package.json`, and the line references in Tasks 1 and 2 still match. What did change, and where the plan now accounts for it:

- **GA4 tag and privacy page added.** Task 5 passes `NEXT_PUBLIC_GA_MEASUREMENT_ID` as a build argument. Task 7 rewrites the privacy page's hosting, log and backup paragraphs for Railway and only then turns the tag on.
- **e2e suite is 17 tests** (the accessibility check now includes `/privacy`). Task 3 expects 17.
- **`www` is proxied by Cloudflare, which does the redirect.** Task 7 keeps that and moves only the apex record.
- **SSH to the VM times out even though the laptop's address matches `Allow-SSH-Laptop`**, so the old fix (update the NSG rule) doesn't apply. Task 0, Step 4 diagnoses it instead. Every data copy depends on SSH.
- **Redirects break behind a proxy (live bug).** `app/auth/callback/route.ts` builds redirects from `request.url`, and `middleware.ts` does too, so behind nginx (and Railway) they point at `localhost:<port>`. Magic-link sign-in on the live site lands on `https://localhost:8000/…`. New Task 0A fixes this on `main` before the migration starts. Live `/admin` also returned 500 on 2026-10-20, a separate fault that needs the VM's logs (Task 0, Step 4 first).
- **No seeding, made explicit.** Nothing in the repo seeds today. A Global Constraint, a Task 0 emptiness check, a Task 5 test and a Task 6 row count now keep it that way.
- **The VM's `NEXT_PUBLIC_SITE_URL` is the bare IP** (the live canonical URL and `og:url` are `http://<VM_PUBLIC_IP>`). Task 6 already sets this variable fresh instead of copying it.

## Global Constraints

- Node.js 24 and pnpm 11.24.0 (`packageManager` in `package.json`). Next.js stays at 16.3.7. Before writing Next-specific code, read the relevant guide in `node_modules/next/dist/docs/`, as `AGENTS.md` requires.
- The site stays on Next.js. Don't propose a Python or other runtime.
- The web service runs exactly one replica. The contact-form rate limiter (`lib/security/rate-limit.ts`) keeps its counts in process memory.
- Uploads stay capped at 10 MiB (`MAX_UPLOAD_BYTES`, `MAX_DOCUMENT_BYTES`).
- Only published content appears publicly, including metadata and the sitemap.
- `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:integration` and `pnpm test:e2e` (which includes the axe WCAG 2.1 AA checks) all pass at the end of every task, except where a task says otherwise.
- The repo is public on GitHub. Never commit secrets, IP addresses, `.env` values or copies of production data. Production data copies live in `~/career-migration/`, outside the repo, and are deleted after Task 8.
- Work on branch `feat/railway-postgres`. Merge to `main` only in Task 7. Task 0A is the exception: it goes to `main` on its own branch first.
- **Deploys never seed data.** Migrations create schema only, the pre-deploy command only applies migrations, and the start command only starts the server. Every real row in Railway Postgres comes from the VM, through `scripts/copy-sqlite-to-postgres.mjs`. Fixture inserts exist only in `tests/e2e/prepare-database.mjs` (refuses any database without `e2e` in its name) and the integration tests (refuse any `DATABASE_URL` without `test`). Task 5's test enforces this.
- **Redirects never use the request's host or protocol.** Railway's proxy terminates TLS and forwards plain HTTP, so `request.url` inside the app is `http://localhost:<PORT>/…` (Next.js applies `X-Forwarded-Proto` only to the protocol, and never in middleware). Every absolute URL the app sends a browser to is built from `NEXT_PUBLIC_SITE_URL` with `absoluteUrl()` from `lib/site-url.ts` (Task 0A).

## Review Focus

1. **Malformed ids in admin URLs.** `/admin/applications/not-a-uuid` should show "not found", not a 500. Ids therefore stay `text` columns (not `uuid`), so Postgres never raises a cast error. Task 1 adds a test that `getApplicationDetail("not-a-uuid")` returns `undefined`.
2. **Two timeline entries recorded in the same millisecond** must keep their insertion order once `rowid` is gone. Task 1 adds an identity `sequence` column, and its test records two status changes back to back. Task 4 checks that the copy preserves the order.
3. **A database outage** should make `/api/health` return 503 `{"status":"degraded"}` without leaking the connection string. Railway's health check depends on this. The Task 1 health test uses an error message that contains a fake password.
4. **Running the copy twice, or a copy that fails partway**, must not leave half-copied or duplicated data. It refuses to write into a non-empty database without `--replace`, and runs as one transaction. Task 4 tests both cases.
5. **Non-ASCII text** (emoji, accents, curly quotes) in contact messages and filenames must survive the SQLite-to-Postgres copy unchanged. Task 4's fixture uses it.
6. **Sign-in behind a TLS-terminating proxy.** A visitor at `https://nickchabot.com` who opens `/admin`, or follows a magic link, must stay on `https://nickchabot.com`. On 2026-10-20 the live callback redirected to `https://localhost:8000/login?error=callback`, and a local `next start` with Railway-style headers redirected `/admin` to `http://localhost:8080/login`. Task 0A's tests pin both redirects, and Tasks 6 and 7 check them on the real addresses.
7. **A deploy that seeds rows**, which would collide with the VM copy or put fixture content on the public site. Task 5's test scans the migrations and deploy commands, and Task 6 counts rows after the first deploy.

---

### Task 0: Get access and record the Railway project's details

This task is operations only, with no code. Several steps need the user, because they involve logins or changes to cloud resources.

**Files:** none.

- [ ] **Step 1: Install the Railway CLI, start Docker, and log in**

```bash
brew install railway
railway --version
open -a Docker && until docker info >/dev/null 2>&1; do sleep 2; done; echo docker-ready
```

Login opens a browser, so ask the user to run it themselves, by typing `! railway login` in the Claude Code prompt.

- [ ] **Step 2: Link this repo to the project and list its services**

```bash
cd ~/isba-4715/career-platform
railway link          # pick the existing project; when asked for a service, pick the web service
railway status
railway service list 2>/dev/null || railway status --json
```

Record the exact names of the web service and the Postgres service. Later tasks call them `<WEB_SERVICE>` and `<PG_SERVICE>`. Also record whether the web service is connected to the GitHub repo `nchabot14/career-platform`, and which branch it deploys. If it's connected to `main`, merging to `main` will deploy automatically (see Task 7).

- [ ] **Step 3: Record the Postgres major version**

`psql` isn't installed on the laptop, so run it from the Postgres image:

```bash
docker run --rm postgres:17 psql "$(railway variables --service <PG_SERVICE> --kv | sed -n 's/^DATABASE_PUBLIC_URL=//p')" -tAc 'select version()'
```

If the major version isn't 17, use it instead of `17` in `compose.yaml` (Task 1) and in `.github/workflows/ci.yml` (Task 3).

Then confirm the Railway database is empty, because every real row must come from the VM:

```bash
docker run --rm postgres:17 psql "$(railway variables --service <PG_SERVICE> --kv | sed -n 's/^DATABASE_PUBLIC_URL=//p')" -tAc \
  "select table_schema || '.' || table_name from information_schema.tables where table_schema not in ('pg_catalog','information_schema')"
```

Expected: no output. If tables exist, stop and show the list to the user. Don't drop anything without their go-ahead.

- [ ] **Step 4: Restore SSH access to the VM**

On 2026-10-20, SSH timed out while ports 80 and 443 answered, and the laptop's address matched the `Allow-SSH-Laptop` rule. Check, in order, and stop at the first finding:

```bash
curl -4 -s https://ifconfig.me
az network nsg rule show -g rg-career-platform --nsg-name vm-career-platformNSG -n Allow-SSH-Laptop --query "{source:sourceAddressPrefix,port:destinationPortRange,access:access,priority:priority}" -o table
az network nsg rule list -g rg-career-platform --nsg-name vm-career-platformNSG --query "[?direction=='Inbound'].{name:name,priority:priority,access:access,port:destinationPortRange,source:sourceAddressPrefix}" -o table
az vm show -d -g rg-career-platform -n vm-career-platform --query "{state:powerState,ip:publicIps}" -o table
nc -vz -G 5 <VM_PUBLIC_IP> 22
ssh -v -o ConnectTimeout=10 -i ~/.ssh/isba4775_azure azureuser@<VM_PUBLIC_IP> 'echo ok' 2>&1 | tail -5
```

1. The source differs from the laptop's address: with the user's approval, update the rule with `az network nsg rule update … --source-address-prefixes "<laptop address>/32"`.
2. A lower-numbered Deny rule matches port 22: report it to the user. Don't change it without asking.
3. The VM's public IP differs from `<VM_PUBLIC_IP>`: use the new one, and update the SSH memory note.
4. Port 22 is filtered by the laptop's network (the same check from a phone hotspot succeeds): use the hotspot, or Azure's `az ssh vm` or Serial Console, for the copy steps.

Expected at the end: `ok`. Tasks 4, 6, 7 and 8 can't run without it.

- [ ] **Step 5: Create the branch**

```bash
git switch main && git pull --ff-only
git switch -c feat/railway-postgres
```

Do this after Task 0A is merged, so the branch includes it.

---

### Task 0A: Build redirects from the site address, not the request

This task ships to `main` on its own, before the migration, because magic-link sign-in on the live site is broken by it today. Behind any TLS-terminating proxy (nginx now, Railway later), `request.url` is the server's internal address. Using the configured site address is correct on both, and a forged `Host` or `X-Forwarded-*` header can't change it.

**Files:**
- Modify: `app/auth/callback/route.ts`, `middleware.ts:27-30`, `app/login/page.tsx:79-81`
- Create: `tests/unit/auth-redirects.test.ts`

**Interfaces:**
- Consumes: `absoluteUrl(pathname: string): string` and `getSiteUrl(): string` from `@/lib/site-url` (unchanged).
- Produces: nothing new. The Supabase redirect allow-list must contain `${NEXT_PUBLIC_SITE_URL}/auth/callback`, which `docs/operations.md` already requires.

Read `node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md` first. Next 16 renames middleware to "proxy". Don't rename `middleware.ts` in this task; only change how it builds the URL.

- [ ] **Step 1: Branch**

```bash
git switch main && git pull --ff-only && git switch -c fix/redirects-behind-proxy
```

- [ ] **Step 2: Write the failing tests**

Create `tests/unit/auth-redirects.test.ts` (`// @vitest-environment node`). Mock `@/lib/auth/server` (`createServerSupabaseClient` returns `{ auth: { exchangeCodeForSession } }`) and `@supabase/ssr` (`createServerClient` returns `{ auth: { getUser: async () => ({ data: { user: null }, error: null }) } }`). In `beforeEach`, stub `NEXT_PUBLIC_SITE_URL=https://nickchabot.com`, `NEXT_PUBLIC_SUPABASE_URL=https://supabase.example`, `NEXT_PUBLIC_SUPABASE_ANON_KEY=anon`, `OWNER_EMAIL=owner@example.com`. Every request is built the way the app sees it behind the proxy:

```ts
const behindProxy = (path: string) =>
  new NextRequest(`http://localhost:8080${path}`, {
    headers: { host: "nickchabot.com", "x-forwarded-proto": "https", "x-forwarded-host": "evil.example" },
  });
```

Tests and assertions (`response.headers.get("location")`):
- `"callback without a code returns to the site's login page"`: `GET(behindProxy("/auth/callback"))` gives `"https://nickchabot.com/login?error=callback"`.
- `"callback with a rejected code returns to the site's login page"`: `exchangeCodeForSession` resolves `{ error: new Error("bad") }`; same location.
- `"successful callback lands on the requested admin page"`: `{ error: null }`, path `/auth/callback?code=c&next=/admin/messages`, gives `"https://nickchabot.com/admin/messages"`.
- `"callback never redirects off-site"`: `next=//evil.example/x` gives `"https://nickchabot.com/admin"`.
- `"middleware sends signed-out visitors to the site's login page"`: `middleware(behindProxy("/admin"))` gives status `307` and `"https://nickchabot.com/login"`.

Run `pnpm exec vitest run tests/unit/auth-redirects.test.ts`. Expected: FAIL; locations start with `http://localhost:8080` or `https://localhost:8080`.

- [ ] **Step 3: Use the site address**

- `app/auth/callback/route.ts`: keep reading `code` and `next` from `request.nextUrl.searchParams`. Build each of the three redirects with `absoluteUrl(...)` instead of `new URL(..., url.origin)`.
- `middleware.ts` `redirectToLogin`: `NextResponse.redirect(absoluteUrl("/login"))`. The `request` parameter becomes unused; remove it from the signature and the call.
- `app/login/page.tsx`: replace the `origin` header fallback with `getSiteUrl()`, so `emailRedirectTo` is `` `${getSiteUrl()}/auth/callback?next=/admin` ``. Remove the `headers` import if nothing else uses it.

- [ ] **Step 4: Verify**

```bash
pnpm exec vitest run tests/unit/auth-redirects.test.ts
pnpm lint && pnpm typecheck && pnpm test && pnpm test:integration && pnpm test:e2e
```

Expected: all pass. The e2e tests for unauthenticated `/admin` → `/login` still pass, because `playwright.config.ts` already sets `NEXT_PUBLIC_SITE_URL` to its `baseURL`.

- [ ] **Step 5: Commit, merge and deploy to the VM**

```bash
git add app/auth/callback/route.ts middleware.ts app/login/page.tsx tests/unit/auth-redirects.test.ts
git commit -m "fix: build sign-in redirects from the site address"
git push -u origin fix/redirects-behind-proxy
gh pr create --title "Build sign-in redirects from the site address" --body "Behind the proxy, request.url is the internal localhost address, so the magic-link callback redirected to https://localhost:8000. Redirects now use NEXT_PUBLIC_SITE_URL."
gh pr checks --watch && gh pr merge --merge --delete-branch
```

Deploying to the VM needs SSH (Task 0, Step 4), and `NEXT_PUBLIC_SITE_URL=https://nickchabot.com` in the VM's `.env`. It's the bare IP today; fix it with the user's approval before rebuilding. Then follow the deploy steps in the Azure VM memory note. Check:

```bash
curl -s -o /dev/null -w '%{redirect_url}\n' https://nickchabot.com/auth/callback
```

Expected: `https://nickchabot.com/login?error=callback`.

---

### Task 1: Run the app and its tests on PostgreSQL

Switching the dialect breaks every database call at once, so the schema, client, migrations, test harness, health check and activity ordering all move together. At the end of this task, unit and integration tests pass on a local Postgres. The e2e tests stay broken until Task 3.

**Files:**
- Create: `compose.yaml`, `scripts/create-test-databases.sql`, `scripts/sqlite-legacy-schema.sql` (a copy of the old migration, used by Task 4's test)
- Modify: `package.json`, `drizzle.config.ts`, `lib/db/database-url.ts`, `lib/db/client.ts`, `lib/db/schema.ts`, `lib/db/repositories/job-applications.ts:166-172`, `app/api/health/route.ts`, `tests/integration/test-database.ts`, `tests/integration/health.test.ts`, `tests/integration/job-application-repository.test.ts`, `.env.example`, `README.md`
- Replace: `drizzle/` (SQLite migration) with a fresh PostgreSQL `0000` migration

**Interfaces:**
- Produces: `db` (Drizzle `PostgresJsDatabase<typeof schema>`) and `databaseClient` (`postgres.Sql`) from `@/lib/db/client`. Table exports keep their names (`profiles`, `experiences`, `education`, `skills`, `projects`, `resumeDocuments`, `socialLinks`, `contactMessages`, `jobApplications`, `applicationContacts`, `applicationDocuments`, `applicationActivities`). New column `applicationActivities.sequence: number`, generated by the database. Postgres table and column names are identical to the SQLite ones, so Task 4 can copy rows column for column.

- [ ] **Step 1: Start a local Postgres**

Create `compose.yaml`:

```yaml
# Local PostgreSQL for development and tests. Railway runs production.
services:
  postgres:
    image: postgres:17
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: career_platform
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./scripts/create-test-databases.sql:/docker-entrypoint-initdb.d/create-test-databases.sql:ro

volumes:
  pgdata:
```

Create `scripts/create-test-databases.sql`:

```sql
-- Integration and end-to-end tests each wipe their own database.
CREATE DATABASE career_platform_test;
CREATE DATABASE career_platform_e2e;
```

Run:

```bash
docker compose up -d --wait
docker compose exec postgres psql -U postgres -c '\l' | grep career_platform
```

Expected: `career_platform`, `career_platform_e2e` and `career_platform_test` are listed.

- [ ] **Step 2: Swap the driver dependencies**

```bash
pnpm add postgres@^3.4.9
pnpm remove @libsql/client && pnpm add -D @libsql/client@^0.18.0
```

`@libsql/client` stays as a dev dependency only so Task 4's copy script can read the VM's SQLite file.

In `package.json`, change the integration script, and add `engines` (Railway and Docker read it):

```json
"test:integration": "DATABASE_URL=postgres://postgres:postgres@localhost:5432/career_platform_test vitest run tests/integration --passWithNoTests --maxWorkers 1",
```

```json
"engines": { "node": "24.x" },
```

- [ ] **Step 3: Write the failing tests for the new behaviour**

Add to `tests/integration/job-application-repository.test.ts`. Add `getApplicationDetail` to the existing import from `@/lib/db/repositories/job-applications`.

```ts
it("keeps timeline entries in insertion order when they share a timestamp", async () => {
  const application = await createApplication({
    company: "Ordering Co", role: "Analyst", jobUrl: null, source: null,
    status: "saved", notes: null, appliedAt: null, nextFollowUpAt: null,
  });

  await transitionApplicationStatus(application.id, "applied");
  await transitionApplicationStatus(application.id, "interviewing");
  await transitionApplicationStatus(application.id, "offer");

  // Force every entry onto one instant so only insertion order can separate them.
  await db
    .update(applicationActivities)
    .set({ occurredAt: new Date("2026-10-08T12:00:00.000Z") })
    .where(eq(applicationActivities.applicationId, application.id));

  const detail = await getApplicationDetail(application.id);
  expect(detail?.activities.map((activity) => activity.resultingStatus)).toEqual([
    "applied",
    "interviewing",
    "offer",
  ]);
});

it("treats a malformed application id as not found", async () => {
  await expect(getApplicationDetail("not-a-uuid")).resolves.toBeUndefined();
});
```

If `createApplication`'s input type in this file differs from the object above, copy the shape of the existing call at the top of the file, changing only `company`.

In `tests/integration/health.test.ts`, change the import and the failing-database test:

```ts
import { db } from "@/lib/db/client";
```

```ts
it("returns 503 degraded without error details when the database fails", async () => {
  vi.spyOn(db, "execute").mockRejectedValue(
    new Error("connect ECONNREFUSED postgres://app:secret-password@db.internal:5432/railway"),
  );
  vi.spyOn(console, "error").mockImplementation(() => {});

  const response = await GET();

  expect(response.status).toBe(503);
  const text = await response.text();
  expect(JSON.parse(text)).toEqual({ status: "degraded" });
  expect(text).not.toContain("secret");
});
```

- [ ] **Step 4: Convert the schema**

Keep the SQLite migration for Task 4's test, then remove it:

```bash
cp drizzle/0000_initial_schema.sql scripts/sqlite-legacy-schema.sql
git rm -r -q drizzle
```

Replace the top of `lib/db/schema.ts`, from the imports down to the `timestamps` constant, with:

```ts
import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import { sql } from "drizzle-orm";
import {
  boolean,
  date as pgDate,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp as pgTimestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

const publicationStateValues = ["draft", "published"] as const;
const contactMessageStatusValues = ["unread", "read", "archived"] as const;
const applicationStatusValues = [
  "saved",
  "applied",
  "interviewing",
  "offer",
  "rejected",
  "withdrawn",
] as const;
const contactNotificationStatusValues = ["pending", "sent", "failed"] as const;

export type PublicationState = (typeof publicationStateValues)[number];
export type ContactMessageStatus = (typeof contactMessageStatusValues)[number];
export type ApplicationStatus = (typeof applicationStatusValues)[number];
export type ContactNotificationStatus =
  (typeof contactNotificationStatusValues)[number];

export const publicationStateEnum = pgEnum("publication_state", publicationStateValues);
export const contactMessageStatusEnum = pgEnum("contact_message_status", contactMessageStatusValues);
export const applicationStatusEnum = pgEnum("application_status", applicationStatusValues);

const publicationState = (name: string) => publicationStateEnum(name);
const contactMessageStatus = (name: string) => contactMessageStatusEnum(name);
const applicationStatus = (name: string) => applicationStatusEnum(name);

// Ids stay text holding UUIDs, as in SQLite: a malformed id in a URL then
// simply matches nothing instead of failing a uuid cast.
const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());

const timestamp = (name: string) => pgTimestamp(name, { withTimezone: true, mode: "date" });

// ISO YYYY-MM-DD strings, as before.
const date = (name: string) => pgDate(name, { mode: "string" });

const jsonArray = <T>(name: string) =>
  jsonb(name)
    .$type<T[]>()
    .notNull()
    .default(sql`'[]'::jsonb`);

const timestamps = {
  createdAt: timestamp("created_at")
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: timestamp("updated_at")
    .notNull()
    .$defaultFn(() => new Date()),
};
```

Then, in the rest of the file:

- Replace every `sqliteTable(` with `pgTable(`.
- In `resumeDocuments`, change `isCurrent` and the partial index:

```ts
    isCurrent: boolean("is_current").notNull().default(false),
```

```ts
    uniqueIndex("resume_document_current_unique")
      .on(table.isCurrent)
      .where(sql`${table.isCurrent} = true`),
```

- In `applicationActivities`, add this after `id: id(),`:

```ts
  // Breaks ties between entries recorded in the same millisecond.
  sequence: integer("sequence").generatedAlwaysAsIdentity(),
```

`integer(...)` columns (`sort_order`, `size`) and `text(...)` columns stay as they are; `pg-core` exports both under the same names. Delete the old comment about SQLite having no enum type.

- [ ] **Step 5: Point the client, config and URL at Postgres**

`lib/db/database-url.ts`:

```ts
export const defaultDatabaseUrl = "postgres://postgres:postgres@localhost:5432/career_platform";

export function getDatabaseUrl() {
  return process.env.DATABASE_URL || defaultDatabaseUrl;
}
```

`lib/db/client.ts`:

```ts
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { getDatabaseUrl } from "@/lib/db/database-url";
import * as schema from "@/lib/db/schema";

export const databaseClient = postgres(getDatabaseUrl(), { max: 10, onnotice: () => {} });

export const db = drizzle(databaseClient, { schema });
```

`drizzle.config.ts`: change `dialect: "turso",` to `dialect: "postgresql",`.

`.env.example`: change the `DATABASE_URL` line to:

```
DATABASE_URL=postgres://postgres:postgres@localhost:5432/career_platform
```

- [ ] **Step 6: Generate the Postgres migration and apply it locally**

```bash
pnpm db:generate --name initial_schema
grep -c "CREATE TABLE" drizzle/0000_initial_schema.sql
grep -n "GENERATED ALWAYS AS IDENTITY\|is_current\" = true\|'\[\]'::jsonb" drizzle/0000_initial_schema.sql
pnpm db:migrate
```

Expected: `12` tables. The grep finds the identity column, the partial index and the jsonb defaults. `db:migrate` succeeds against the local `career_platform` database.

- [ ] **Step 7: Replace `rowid` and the health check**

In `lib/db/repositories/job-applications.ts`, replace the activities query and its comment (lines 170-171):

```ts
    db.select().from(applicationActivities).where(eq(applicationActivities.applicationId, id)).orderBy(asc(applicationActivities.occurredAt), asc(applicationActivities.sequence)),
```

Remove `sql` from the `drizzle-orm` import if nothing else in the file uses it.

`app/api/health/route.ts`:

```ts
import { sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { logServerError } from "@/lib/observability/logger";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await db.execute(sql`select 1`);
    return Response.json({ status: "ok" }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    logServerError("health_check_failed", error, {});
    return Response.json({ status: "degraded" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
```

Check `lib/observability/logger.ts` and confirm `logServerError` doesn't log `error.message` in a way that reaches the HTTP response. It only writes to the server log, so the leak test passes. Server logs on Railway are private.

- [ ] **Step 8: Move the integration harness to Postgres**

Replace `tests/integration/test-database.ts`:

```ts
// @vitest-environment node

import { afterEach, beforeAll } from "vitest";
import { sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { db } from "@/lib/db/client";

const tables = [
  "application_activity",
  "application_document",
  "application_contact",
  "job_application",
  "contact_message",
  "social_link",
  "resume_document",
  "project",
  "skill",
  "education",
  "experience",
  "profile",
];

let databaseReady: Promise<void> | undefined;

function requireTestDatabaseUrl() {
  if (!process.env.DATABASE_URL?.includes("test")) {
    throw new Error(
      "Integration tests delete every row after each test. Set DATABASE_URL to a dedicated test database (for example postgres://postgres:postgres@localhost:5432/career_platform_test) or run pnpm test:integration.",
    );
  }
}

async function ensureDatabaseReady() {
  if (!databaseReady) {
    databaseReady = migrate(db, { migrationsFolder: "drizzle" });
  }

  await databaseReady;
}

beforeAll(async () => {
  requireTestDatabaseUrl();
  await ensureDatabaseReady();
}, 30_000);

afterEach(async () => {
  await db.execute(sql.raw(`TRUNCATE TABLE ${tables.join(", ")} RESTART IDENTITY CASCADE`));
}, 30_000);
```

- [ ] **Step 9: Run the checks and fix what's left**

```bash
grep -rnE "sqlite|libsql|rowid|\.batch\(" lib app tests --include='*.ts' --include='*.tsx' | grep -v "tests/e2e"
pnpm typecheck
pnpm test
pnpm test:integration
pnpm lint
```

Expected:
- The grep prints nothing.
- Typecheck passes. If it reports a missing `sequence` on an `ApplicationActivity` object literal in a unit test, add `sequence: 1` (or the next number) to that literal.
- Unit and integration tests pass, including the two new repository tests and the health test.
- If an integration test fails because it compared a `Date` with a number, or `0`/`1` with a boolean, fix the test's expected value, not the schema.
- `tests/unit/file-storage.test.ts` and the file reads in integration tests still use the disk; Task 2 changes them.

- [ ] **Step 10: Update the README's local setup**

In `README.md`, replace the "Create the local SQLite database" step with:

````markdown
3. Start the local PostgreSQL database and apply the migrations:

   ```bash
   docker compose up -d --wait
   pnpm db:migrate
   ```

   Docker creates `career_platform` plus the `career_platform_test` and
   `career_platform_e2e` databases the tests use. Stop it with
   `docker compose down`; add `-v` to delete its data.
````

Replace the first line of the README ("…Drizzle ORM, and SQLite.") with "…Drizzle ORM, and PostgreSQL.". Remove the `data/career_platform.test.db` mention under Quality commands, and the `data/career_platform.e2e.db` one, replacing them with the database names above.

- [ ] **Step 11: Commit**

```bash
git add -A compose.yaml scripts/ drizzle/ package.json pnpm-lock.yaml drizzle.config.ts lib/db app/api/health tests/integration .env.example README.md
git commit -m "feat: run the app and its tests on PostgreSQL"
```

---

### Task 2: Store uploaded files in Postgres

**Files:**
- Modify: `lib/db/schema.ts` (add `storedFiles`), `lib/storage/files.ts`, `tests/integration/test-database.ts` (truncate list), `tests/integration/application-tracker.test.ts`, `tests/integration/resume-upload-route.test.ts`, `.env.example`
- Move: `tests/unit/file-storage.test.ts` → `tests/integration/file-storage.test.ts`
- Create: migration `drizzle/0001_stored_files.sql` (generated)

**Interfaces:**
- Consumes: `db` from Task 1.
- Produces: unchanged signatures in `@/lib/storage/files`: `writeStoredFile(key: string, bytes: Uint8Array): Promise<void>`, `readStoredFile(key: string): Promise<Uint8Array | null>`, `deleteStoredFile(key: string): Promise<void>`. New table `stored_file (key text primary key, bytes bytea not null, created_at, updated_at)`, which Tasks 3 and 4 insert into directly.

- [ ] **Step 1: Move the storage test and make it database-backed (it should fail)**

```bash
git mv tests/unit/file-storage.test.ts tests/integration/file-storage.test.ts
```

Replace its contents:

```ts
// @vitest-environment node

import "@/tests/integration/test-database";
import { expect, it } from "vitest";
import {
  deleteStoredFile,
  readStoredFile,
  writeStoredFile,
} from "@/lib/storage/files";

it("writes, reads, and deletes a file by key", async () => {
  const bytes = new Uint8Array([37, 80, 68, 70, 0, 255]);

  await writeStoredFile("resumes/abc.pdf", bytes);
  expect(await readStoredFile("resumes/abc.pdf")).toEqual(bytes);

  await deleteStoredFile("resumes/abc.pdf");
  expect(await readStoredFile("resumes/abc.pdf")).toBeNull();
});

it("replaces the bytes when the same key is written twice", async () => {
  await writeStoredFile("resumes/same.pdf", new Uint8Array([1, 2, 3]));
  await writeStoredFile("resumes/same.pdf", new Uint8Array([4, 5]));

  expect(await readStoredFile("resumes/same.pdf")).toEqual(new Uint8Array([4, 5]));
});

it("round-trips a 10 MiB file", async () => {
  const bytes = new Uint8Array(10 * 1024 * 1024).map((_, index) => index % 251);

  await writeStoredFile("application-documents/owner/a/b-big.pdf", bytes);
  expect(await readStoredFile("application-documents/owner/a/b-big.pdf")).toEqual(bytes);
});

it("returns null when a file is missing and ignores deleting a missing file", async () => {
  expect(await readStoredFile("resumes/missing.pdf")).toBeNull();
  await expect(deleteStoredFile("resumes/missing.pdf")).resolves.toBeUndefined();
});

it.each(["../escape.pdf", "/etc/passwd", "resumes/../../x.pdf", "resumes/", "", "a\\b.pdf"])(
  "rejects the unsafe key %j",
  async (key) => {
    await expect(readStoredFile(key)).rejects.toThrow(/invalid storage key/i);
    await expect(writeStoredFile(key, new Uint8Array())).rejects.toThrow(/invalid storage key/i);
  },
);
```

In `tests/integration/test-database.ts`, add `"stored_file",` as the first entry of `tables`.

Run `pnpm test:integration -- tests/integration/file-storage.test.ts`. Expected: FAIL. The `stored_file` table doesn't exist yet (the TRUNCATE errors), and the files module still writes to disk.

- [ ] **Step 2: Add the table and its migration**

In `lib/db/schema.ts`, add `customType` to the `drizzle-orm/pg-core` import, then add this after `applicationActivities`:

```ts
const bytea = customType<{ data: Uint8Array; driverData: Buffer }>({
  dataType: () => "bytea",
  toDriver: (value) => Buffer.from(value),
  fromDriver: (value) => new Uint8Array(value),
});

// Uploaded file contents, addressed by the storage keys that
// resume_document and application_document already record.
export const storedFiles = pgTable("stored_file", {
  key: text("key").primaryKey(),
  bytes: bytea("bytes").notNull(),
  ...timestamps,
});
```

```bash
pnpm db:generate --name stored_files
pnpm db:migrate
```

- [ ] **Step 3: Reimplement `lib/storage/files.ts`**

```ts
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { storedFiles } from "@/lib/db/schema";

// Uploaded files live in Postgres, so a deploy never loses them and one
// database backup covers everything. Keys are server-generated,
// slash-separated paths such as "resumes/<uuid>.pdf".
const safeKeyPattern = /^[A-Za-z0-9_-][A-Za-z0-9._-]*(?:\/[A-Za-z0-9_-][A-Za-z0-9._-]*)*$/;

function assertSafeKey(key: string) {
  if (!safeKeyPattern.test(key)) {
    throw new Error(`Invalid storage key: ${JSON.stringify(key)}`);
  }
}

export async function writeStoredFile(key: string, bytes: Uint8Array) {
  assertSafeKey(key);
  const now = new Date();

  await db
    .insert(storedFiles)
    .values({ key, bytes, createdAt: now, updatedAt: now })
    .onConflictDoUpdate({ target: storedFiles.key, set: { bytes, updatedAt: now } });
}

export async function readStoredFile(key: string): Promise<Uint8Array | null> {
  assertSafeKey(key);
  const [row] = await db
    .select({ bytes: storedFiles.bytes })
    .from(storedFiles)
    .where(eq(storedFiles.key, key))
    .limit(1);

  return row?.bytes ?? null;
}

export async function deleteStoredFile(key: string) {
  assertSafeKey(key);
  await db.delete(storedFiles).where(eq(storedFiles.key, key));
}
```

- [ ] **Step 4: Point the two integration tests at the database**

In `tests/integration/application-tracker.test.ts`:
- Delete the `root` variable, the `beforeAll` and `afterAll` blocks that create and remove the temp directory, and the now-unused `fs`, `os`, `path`, `afterAll` and `beforeAll` imports.
- Add `import { readStoredFile } from "@/lib/storage/files";`.
- Replace line 52 with:

```ts
  expect(await readStoredFile(detail!.documents[0].storageKey)).toEqual(bytes);
```

In `tests/integration/resume-upload-route.test.ts`, make the same deletions and add the same import, then replace the last two lines of the first test with:

```ts
  const stored = await readStoredFile(second.storageKey);
  expect(new TextDecoder().decode(stored!)).toContain("second");
```

Remove the `FILE_STORAGE_DIR=data/files` line from `.env.example`.

- [ ] **Step 5: Run everything**

```bash
grep -rn "FILE_STORAGE_DIR\|getStorageRoot" lib app tests .env.example | grep -v tests/e2e
pnpm typecheck && pnpm test && pnpm test:integration && pnpm lint
```

Expected: the grep prints nothing, and every check passes. The unit tests that mock `@/lib/storage/files` (`resume-upload`, `application-management`, `public-routes`, `application-document-route`) pass unchanged, because the module's functions kept their names.

- [ ] **Step 6: Commit**

```bash
git add -A lib/db/schema.ts lib/storage/files.ts drizzle/ tests/ .env.example
git commit -m "feat: store uploaded files in Postgres"
```

---

### Task 3: End-to-end tests and CI on Postgres

**Files:**
- Modify: `tests/e2e/prepare-database.mjs` (rewrite), `playwright.config.ts`, `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: the `drizzle/` migrations and the `stored_file` table from Tasks 1 and 2.

- [ ] **Step 1: Rewrite the e2e fixture script**

Replace `tests/e2e/prepare-database.mjs`:

```js
// Rebuilds the throwaway end-to-end database with fixed fixtures before the
// Playwright web server starts. Never point this at a real database: it
// drops every table first.
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";

const databaseUrl = process.env.DATABASE_URL ?? "";

if (!new URL(databaseUrl).pathname.includes("e2e")) {
  throw new Error("Refusing to prepare a database without 'e2e' in its name.");
}

const sql = postgres(databaseUrl, { max: 1, onnotice: () => {} });

await sql`DROP SCHEMA IF EXISTS drizzle CASCADE`;
await sql`DROP SCHEMA IF EXISTS public CASCADE`;
await sql`CREATE SCHEMA public`;
await migrate(drizzle(sql), { migrationsFolder: "drizzle" });

const now = new Date();

async function insert(table, values) {
  const record = { id: crypto.randomUUID(), created_at: now, updated_at: now, ...values };
  await sql`INSERT INTO ${sql(table)} ${sql(record)}`;
}

await insert("profile", {
  name: "Ada Lovelace",
  headline: "Analyst of engines",
  summary: "Writes programs for machines that do not exist yet.",
  location: "London",
  availability: "Open to roles",
  visibility: "public",
  publication_state: "published",
});
await insert("experience", {
  employer: "Analytical Engines Ltd",
  title: "Programmer",
  start_date: "1842-01-01",
  end_date: null,
  description: "Wrote the first published algorithm.",
  highlights: sql.json(["Note G"]),
  sort_order: 0,
  publication_state: "published",
});
await insert("project", {
  title: "Engine Notes",
  slug: "engine-notes",
  summary: "Annotated translation.",
  body: "Paragraph one.\n\n- First point\n- Second point",
  role: "Author",
  technologies: sql.json(["Punch cards"]),
  links: sql.json([]),
  sort_order: 0,
  publication_state: "published",
});
await insert("project", {
  title: "Secret Draft",
  slug: "secret-draft",
  summary: "Not ready.",
  body: "Hidden.",
  technologies: sql.json([]),
  links: sql.json([]),
  sort_order: 1,
  publication_state: "draft",
});

const pdf = new TextEncoder().encode("%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n");
await sql`INSERT INTO stored_file ${sql({ key: "resumes/e2e.pdf", bytes: Buffer.from(pdf), created_at: now, updated_at: now })}`;
await insert("resume_document", {
  storage_key: "resumes/e2e.pdf",
  filename: "ada.pdf",
  mime_type: "application/pdf",
  size: pdf.byteLength,
  is_current: true,
  publication_state: "published",
});

await sql.end();
console.log("e2e database ready");
```

Before replacing the file, compare the old version's fixtures (lines 36-90) with the ones above. If the old file inserts anything not listed here, port it the same way: JSON via `sql.json`, booleans as `true`/`false`, timestamps as `Date`.

- [ ] **Step 2: Update the Playwright config**

In `playwright.config.ts` `webServer.env`, replace the `DATABASE_URL` and `FILE_STORAGE_DIR` lines with:

```ts
      DATABASE_URL:
        process.env.E2E_DATABASE_URL ?? "postgres://postgres:postgres@localhost:5432/career_platform_e2e",
```

- [ ] **Step 3: Run the e2e suite locally**

```bash
pnpm test:e2e
```

Expected: all 17 tests pass, including the PDF download test, which now reads from `stored_file`, and the `/privacy` accessibility check.

- [ ] **Step 4: Give CI a Postgres service**

In `.github/workflows/ci.yml`, add this under `check:` (at the same level as `runs-on`):

```yaml
    services:
      postgres:
        image: postgres:17
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: career_platform
        ports:
          - 5432:5432
        options: >-
          --health-cmd "pg_isready -U postgres"
          --health-interval 5s
          --health-timeout 5s
          --health-retries 10
```

Replace the SQLite comment and the `pnpm test:integration` step with:

```yaml
      - name: Create test databases
        run: psql postgres://postgres:postgres@localhost:5432/postgres -f scripts/create-test-databases.sql

      - run: pnpm test:integration
```

- [ ] **Step 5: Commit and check CI**

```bash
git add tests/e2e/prepare-database.mjs playwright.config.ts .github/workflows/ci.yml
git commit -m "test: run end-to-end tests and CI against Postgres"
git push -u origin feat/railway-postgres
gh pr create --draft --title "Move to Railway and PostgreSQL" --body "Implements docs/superpowers/plans/2026-10-08-railway-postgres-migration.md"
gh pr checks --watch
```

Expected: the CI `check` job passes.

---

### Task 4: Script that copies the VM's data into Postgres

**Files:**
- Create: `scripts/copy-sqlite-to-postgres.mjs`, `tests/integration/copy-sqlite-to-postgres.test.ts`
- Uses: `scripts/sqlite-legacy-schema.sql` (saved in Task 1)

**Interfaces:**
- Consumes: the Postgres tables from Tasks 1 and 2 (identical column names), and `readStoredFile` from Task 2 (in the test).
- Produces: `copySqliteToPostgres({ sqlite, sql, filesDir, replace?, log? }): Promise<void>`, where `sqlite` is a libsql `Client` and `sql` is a postgres.js `Sql`. Command line: `TARGET_DATABASE_URL=… node scripts/copy-sqlite-to-postgres.mjs <sqlite-file> <files-dir> [--replace]`. Tasks 6 and 7 use the command line.

- [ ] **Step 1: Write the failing test**

Create `tests/integration/copy-sqlite-to-postgres.test.ts`:

```ts
// @vitest-environment node

import "@/tests/integration/test-database";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createClient, type Client } from "@libsql/client";
import { asc, eq } from "drizzle-orm";
import postgres from "postgres";
import { afterEach, beforeEach, expect, it } from "vitest";
import { db } from "@/lib/db/client";
import {
  applicationActivities,
  contactMessages,
  experiences,
  profiles,
  resumeDocuments,
} from "@/lib/db/schema";
import { readStoredFile } from "@/lib/storage/files";
import { copySqliteToPostgres } from "@/scripts/copy-sqlite-to-postgres.mjs";

let dir: string;
let sqlite: Client;
let sql: postgres.Sql;
const quiet = () => {};
const created = Date.UTC(2026, 8, 1, 12, 0, 0, 123);
const applicationId = "6a0c3d5e-1111-4222-8333-944445555666";
const resumeBytes = new TextEncoder().encode("%PDF-1.7\nresume\n");
const docBytes = new TextEncoder().encode("Notes for the interview ✓\n");
const docKey = `application-documents/owner/${applicationId}/d1-notes.txt`;

async function row(table: string, values: Record<string, unknown>) {
  const record = { id: crypto.randomUUID(), created_at: created, updated_at: created, ...values };
  const columns = Object.keys(record);
  await sqlite.execute({
    sql: `INSERT INTO ${table} (${columns.join(", ")}) VALUES (${columns.map(() => "?").join(", ")})`,
    args: Object.values(record) as never,
  });
}

beforeEach(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), "copy-sqlite-"));
  sqlite = createClient({ url: `file:${path.join(dir, "source.db")}` });
  await sqlite.executeMultiple(await fs.readFile("scripts/sqlite-legacy-schema.sql", "utf8"));
  sql = postgres(process.env.DATABASE_URL!, { max: 1, onnotice: () => {} });

  await row("profile", {
    name: "Zoë Ångström", headline: "Analyst — “quoted” 🚀", summary: "Summary",
    location: null, availability: null, visibility: "public", publication_state: "published",
  });
  await row("experience", {
    employer: "Pioneer", title: "Intern", start_date: "2026-05-01", end_date: null,
    description: "Built things", highlights: JSON.stringify(["One", "Two ✓"]),
    sort_order: 0, publication_state: "published",
  });
  await row("resume_document", {
    storage_key: "resumes/r1.pdf", filename: "résumé.pdf", mime_type: "application/pdf",
    size: resumeBytes.byteLength, is_current: 1, publication_state: "published",
  });
  await row("contact_message", {
    sender_name: "Renée", sender_email: "renee@example.com", subject: "Hi 👋",
    message: "Ça va?", submitted_at: created, status: "unread", notification_status: "sent",
  });
  await row("job_application", {
    id: applicationId, company: "Acme", role: "Analyst", status: "applied",
    applied_at: created, notes: null,
  });
  for (const note of ["first", "second", "third"]) {
    await row("application_activity", {
      application_id: applicationId, type: "note", occurred_at: created, note,
    });
  }
  await row("application_document", {
    application_id: applicationId, storage_key: docKey, filename: "notes.txt",
    mime_type: "text/plain", size: docBytes.byteLength, category: "Notes",
  });

  await fs.mkdir(path.join(dir, "files/resumes"), { recursive: true });
  await fs.writeFile(path.join(dir, "files/resumes/r1.pdf"), resumeBytes);
  await fs.mkdir(path.join(dir, "files", path.dirname(docKey)), { recursive: true });
  await fs.writeFile(path.join(dir, "files", docKey), docBytes);
});

afterEach(async () => {
  sqlite.close();
  await sql.end();
  await fs.rm(dir, { recursive: true, force: true });
});

it("copies every row and file with types converted", async () => {
  await copySqliteToPostgres({ sqlite, sql, filesDir: path.join(dir, "files"), log: quiet });

  const [profile] = await db.select().from(profiles);
  expect(profile.name).toBe("Zoë Ångström");
  expect(profile.headline).toBe("Analyst — “quoted” 🚀");
  expect(profile.createdAt).toEqual(new Date(created));

  const [experience] = await db.select().from(experiences);
  expect(experience.highlights).toEqual(["One", "Two ✓"]);
  expect(experience.startDate).toBe("2026-05-01");

  const [resume] = await db.select().from(resumeDocuments);
  expect(resume.isCurrent).toBe(true);
  expect(resume.filename).toBe("résumé.pdf");

  const [message] = await db.select().from(contactMessages);
  expect(message.subject).toBe("Hi 👋");
  expect(message.submittedAt).toEqual(new Date(created));

  const activities = await db
    .select()
    .from(applicationActivities)
    .where(eq(applicationActivities.applicationId, applicationId))
    .orderBy(asc(applicationActivities.occurredAt), asc(applicationActivities.sequence));
  expect(activities.map((activity) => activity.note)).toEqual(["first", "second", "third"]);

  expect(await readStoredFile("resumes/r1.pdf")).toEqual(resumeBytes);
  expect(await readStoredFile(docKey)).toEqual(docBytes);
});

it("refuses to copy into a database that already has data", async () => {
  await copySqliteToPostgres({ sqlite, sql, filesDir: path.join(dir, "files"), log: quiet });

  await expect(
    copySqliteToPostgres({ sqlite, sql, filesDir: path.join(dir, "files"), log: quiet }),
  ).rejects.toThrow(/not empty/i);
  expect(await db.select().from(profiles)).toHaveLength(1);
});

it("replaces existing data when asked", async () => {
  await copySqliteToPostgres({ sqlite, sql, filesDir: path.join(dir, "files"), log: quiet });
  await copySqliteToPostgres({ sqlite, sql, filesDir: path.join(dir, "files"), replace: true, log: quiet });

  expect(await db.select().from(profiles)).toHaveLength(1);
  expect(await db.select().from(applicationActivities)).toHaveLength(3);
});

it("changes nothing when an uploaded file is missing", async () => {
  await copySqliteToPostgres({ sqlite, sql, filesDir: path.join(dir, "files"), log: quiet });
  await sqlite.execute({ sql: "UPDATE profile SET name = ?", args: ["Changed"] });
  await fs.rm(path.join(dir, "files", docKey));

  await expect(
    copySqliteToPostgres({ sqlite, sql, filesDir: path.join(dir, "files"), replace: true, log: quiet }),
  ).rejects.toThrow(docKey);
  expect((await db.select().from(profiles))[0].name).toBe("Zoë Ångström");
});
```

If an insert fails because the legacy schema has a `NOT NULL` column the fixture omits, add that column to the fixture with a plain value. Don't change the schema file.

Run `pnpm test:integration -- tests/integration/copy-sqlite-to-postgres.test.ts`. Expected: FAIL, because the `@/scripts/copy-sqlite-to-postgres.mjs` module doesn't exist yet.

- [ ] **Step 2: Write the script**

Create `scripts/copy-sqlite-to-postgres.mjs`:

```js
// One-off copy of the SQLite database and uploaded files from the Azure VM
// into PostgreSQL. Column names are identical in both schemas; only types
// change. Everything happens in one transaction, so a failure changes nothing.
//
// Usage:
//   TARGET_DATABASE_URL=postgres://... node scripts/copy-sqlite-to-postgres.mjs <career_platform.db> <files-dir> [--replace]
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@libsql/client";
import postgres from "postgres";

// Parents before children, so foreign keys are satisfied as rows arrive.
const tables = [
  "profile",
  "experience",
  "education",
  "skill",
  "project",
  "resume_document",
  "social_link",
  "contact_message",
  "job_application",
  "application_contact",
  "application_document",
  "application_activity",
];
const timestampColumns = new Set([
  "created_at",
  "updated_at",
  "submitted_at",
  "applied_at",
  "next_follow_up_at",
  "occurred_at",
]);
const booleanColumns = new Set(["is_current"]);
const jsonColumns = new Set(["highlights", "technologies", "links"]);

function convertRow(columns, values, sql) {
  const row = {};

  columns.forEach((column, index) => {
    const value = values[index];
    if (value === null || value === undefined) row[column] = null;
    else if (timestampColumns.has(column)) row[column] = new Date(Number(value));
    else if (booleanColumns.has(column)) row[column] = Number(value) === 1;
    else if (jsonColumns.has(column)) row[column] = sql.json(JSON.parse(String(value)));
    else row[column] = value;
  });

  return row;
}

export async function copySqliteToPostgres({ sqlite, sql, filesDir, replace = false, log = console.log }) {
  await sql.begin(async (tx) => {
    const nonEmpty = [];
    for (const table of [...tables, "stored_file"]) {
      const [{ count }] = await tx`SELECT count(*)::int AS count FROM ${tx(table)}`;
      if (count > 0) nonEmpty.push(`${table} (${count})`);
    }

    if (nonEmpty.length > 0 && !replace) {
      throw new Error(`Target database is not empty: ${nonEmpty.join(", ")}. Re-run with --replace to overwrite it.`);
    }
    if (replace) {
      await tx.unsafe(`TRUNCATE TABLE ${[...tables, "stored_file"].join(", ")} RESTART IDENTITY CASCADE`);
    }

    for (const table of tables) {
      // Activities keep their original order; Postgres numbers them as they arrive.
      const order = table === "application_activity" ? " ORDER BY occurred_at, rowid" : "";
      const result = await sqlite.execute(`SELECT * FROM ${table}${order}`);

      for (const values of result.rows) {
        const row = convertRow(result.columns, values, sql);
        await tx`INSERT INTO ${tx(table)} ${tx(row)}`;
      }
      log(`${table}: ${result.rows.length}`);
    }

    const keys = [];
    for (const table of ["resume_document", "application_document"]) {
      const result = await sqlite.execute(`SELECT storage_key FROM ${table}`);
      keys.push(...result.rows.map((values) => String(values[0])));
    }

    const missing = [];
    for (const key of keys) {
      let bytes;
      try {
        bytes = await fs.readFile(path.join(filesDir, key));
      } catch (error) {
        if (error.code === "ENOENT") {
          missing.push(key);
          continue;
        }
        throw error;
      }
      const now = new Date();
      await tx`INSERT INTO stored_file ${tx({ key, bytes, created_at: now, updated_at: now })}`;
    }

    if (missing.length > 0) {
      throw new Error(`Uploaded files are missing, so nothing was copied: ${missing.join(", ")}`);
    }
    log(`stored_file: ${keys.length}`);
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [sqlitePath, filesDir] = process.argv.slice(2).filter((arg) => !arg.startsWith("--"));
  const replace = process.argv.includes("--replace");
  const targetUrl = process.env.TARGET_DATABASE_URL;

  if (!sqlitePath || !filesDir || !targetUrl) {
    console.error(
      "Usage: TARGET_DATABASE_URL=postgres://... node scripts/copy-sqlite-to-postgres.mjs <career_platform.db> <files-dir> [--replace]",
    );
    process.exit(1);
  }

  const sqlite = createClient({ url: `file:${path.resolve(sqlitePath)}` });
  const sql = postgres(targetUrl, { max: 1, onnotice: () => {} });

  try {
    await copySqliteToPostgres({ sqlite, sql, filesDir: path.resolve(filesDir), replace });
    console.log("Copy complete.");
  } finally {
    sqlite.close();
    await sql.end();
  }
}
```

- [ ] **Step 3: Run the tests**

```bash
pnpm test:integration -- tests/integration/copy-sqlite-to-postgres.test.ts
pnpm typecheck && pnpm lint
```

Expected: all four tests pass. If typecheck complains that the `.mjs` import has no types, add `scripts/copy-sqlite-to-postgres.d.mts`:

```ts
import type { Client } from "@libsql/client";
import type { Sql } from "postgres";

export function copySqliteToPostgres(options: {
  sqlite: Client;
  sql: Sql;
  filesDir: string;
  replace?: boolean;
  log?: (message: string) => void;
}): Promise<void>;
```

- [ ] **Step 4: Rehearse against a copy of the real data (stays on the laptop)**

```bash
mkdir -p ~/career-migration && chmod 700 ~/career-migration
ssh -i ~/.ssh/isba4775_azure azureuser@<VM_PUBLIC_IP> 'cd ~/career-platform && node -e "require(\"@libsql/client\").createClient({url:\"file:data/career_platform.db\"}).execute(\"VACUUM INTO '"'"'/tmp/career-copy.db'"'"'\").then(()=>console.log(\"snapshot ok\"))" && tar czf /tmp/career-files.tgz -C data files'
scp -i ~/.ssh/isba4775_azure azureuser@<VM_PUBLIC_IP>:/tmp/career-copy.db azureuser@<VM_PUBLIC_IP>:/tmp/career-files.tgz ~/career-migration/
ssh -i ~/.ssh/isba4775_azure azureuser@<VM_PUBLIC_IP> 'rm /tmp/career-copy.db /tmp/career-files.tgz'
tar xzf ~/career-migration/career-files.tgz -C ~/career-migration
docker compose exec postgres psql -U postgres -c 'DROP DATABASE IF EXISTS career_platform_rehearsal' -c 'CREATE DATABASE career_platform_rehearsal'
DATABASE_URL=postgres://postgres:postgres@localhost:5432/career_platform_rehearsal pnpm db:migrate
TARGET_DATABASE_URL=postgres://postgres:postgres@localhost:5432/career_platform_rehearsal node scripts/copy-sqlite-to-postgres.mjs ~/career-migration/career-copy.db ~/career-migration/files
```

`VACUUM INTO` takes a consistent snapshot while the site keeps running. `data/files` may not exist if nothing was ever uploaded. In that case, `tar` fails: create `~/career-migration/files` empty and skip the tar steps.

Expected: one line per table with the same counts as `sqlite3 ~/career-migration/career-copy.db "select count(*) from <table>"`, then `Copy complete.` Then run the app against it and check the content:

```bash
DATABASE_URL=postgres://postgres:postgres@localhost:5432/career_platform_rehearsal pnpm dev --port 3300
```

Open http://localhost:3300 and check that the profile, experience, projects, skills and education match https://nickchabot.com.

- [ ] **Step 5: Commit**

```bash
git add scripts/copy-sqlite-to-postgres.mjs tests/integration/copy-sqlite-to-postgres.test.ts
git add scripts/copy-sqlite-to-postgres.d.mts 2>/dev/null || true   # only if Step 3 needed it
git commit -m "feat: add a one-off copy from the VM's SQLite into Postgres"
```

---

### Task 5: Build and deploy configuration for Railway

A Dockerfile is used instead of Railway's automatic builder, because `pyproject.toml`, `uv.lock` and `.python-version` in the repo root may make the builder treat the app as a Python project.

**Files:**
- Create: `Dockerfile`, `.dockerignore`, `railway.json`, `scripts/migrate.mjs`
- Modify: `package.json` (add a `db:migrate:deploy` script)

**Interfaces:**
- Produces: an image that runs `pnpm start` on `$PORT`, and the pre-deploy command `node scripts/migrate.mjs` (needs `DATABASE_URL`). Task 6 relies on both.

- [ ] **Step 1: Write the runtime migration script**

`scripts/migrate.mjs`. It uses only runtime dependencies, because the pre-deploy command runs inside the built image.

```js
// Applies pending migrations from drizzle/. Railway runs this before each
// deploy goes live; a failure stops the deploy and leaves the old one serving.
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

const sql = postgres(url, { max: 1, onnotice: () => {} });

try {
  await migrate(drizzle(sql), { migrationsFolder: "drizzle" });
  console.log("Migrations applied.");
} finally {
  await sql.end();
}
```

Add `"db:migrate:deploy": "node scripts/migrate.mjs",` to `scripts` in `package.json`.

- [ ] **Step 1a: Pin "no seeding on deploy" with a test**

Create `tests/unit/deploy-does-not-seed.test.ts` (`// @vitest-environment node`). It reads files with `node:fs` and asserts:
- `"migrations only change schema"`: no file in `drizzle/*.sql` matches `/\b(INSERT\s+INTO|COPY\s+\w+\s+FROM|UPDATE\s+\w+\s+SET)\b/i`.
- `"the pre-deploy command only applies migrations"`: `railway.json`'s `deploy.preDeployCommand` equals `["node scripts/migrate.mjs"]` (or the documented string form chosen in Step 3), and `scripts/migrate.mjs` doesn't match `/insert|seed|prepare-database/i`.
- `"the container only starts the server"`: the last `CMD` line of `Dockerfile` contains `start` and doesn't match `/seed|migrate|prepare-database|copy-sqlite/i`.
- `"no package script seeds"`: no key or value in `package.json` `scripts` matches `/seed|prepare-database/i`.

Run it once the Dockerfile and `railway.json` from Steps 2-3 exist. Expected: PASS. Then temporarily add `INSERT INTO profile (id) VALUES ('x');` to the newest migration, confirm the test fails, and revert the line.

- [ ] **Step 2: Write the Dockerfile and .dockerignore**

`Dockerfile`:

```dockerfile
FROM node:24-slim

RUN npm install -g pnpm@11.24.0
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

# NEXT_PUBLIC_* values are compiled into the client bundle, so Railway must
# pass them as build arguments (it does for every declared ARG).
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_UMAMI_WEBSITE_ID
ARG NEXT_PUBLIC_UMAMI_SCRIPT_URL
ARG NEXT_PUBLIC_GA_MEASUREMENT_ID
RUN pnpm build

ENV NODE_ENV=production
EXPOSE 3000
CMD ["pnpm", "start"]
```

`.dockerignore`:

```
.git
node_modules
.next
data
.env
.env.*
!.env.example
.venv
test-results
playwright-report
.impeccable
.superpowers
docs
```

- [ ] **Step 3: Write `railway.json`**

```json
{
  "$schema": "https://railway.com/railway.schema.json",
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "Dockerfile"
  },
  "deploy": {
    "preDeployCommand": ["node scripts/migrate.mjs"],
    "healthcheckPath": "/api/health",
    "healthcheckTimeout": 120,
    "numReplicas": 1,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 5
  }
}
```

Check each key against https://docs.railway.com/reference/config-as-code before committing (use WebFetch). If a key name or shape differs (for example, whether `preDeployCommand` is a string or an array), use the documented form.

- [ ] **Step 4: Build and run the image locally**

```bash
docker build -t career-platform:local --build-arg NEXT_PUBLIC_SITE_URL=http://localhost:3400 .
docker run --rm -e DATABASE_URL=postgres://postgres:postgres@host.docker.internal:5432/career_platform_rehearsal \
  career-platform:local node scripts/migrate.mjs
docker run -d --name cp-local -p 3400:8080 -e PORT=8080 \
  -e DATABASE_URL=postgres://postgres:postgres@host.docker.internal:5432/career_platform_rehearsal career-platform:local
until curl -sf http://localhost:3400/api/health; do sleep 1; done; echo
curl -s http://localhost:3400/ | grep -o "Resume sections" | head -1
docker rm -f cp-local
```

Expected:
- The build succeeds.
- `Migrations applied.` (nothing new to apply).
- `{"status":"ok"}`, which confirms the server honours `$PORT` and listens beyond localhost.
- `Resume sections`.

If the health check never answers, the server may be binding to localhost only. In that case, change `CMD` to `["sh", "-c", "pnpm exec next start -H 0.0.0.0 -p ${PORT:-3000}"]`, then rebuild and retest.

- [ ] **Step 5: Commit**

```bash
git add Dockerfile .dockerignore railway.json scripts/migrate.mjs package.json tests/unit/deploy-does-not-seed.test.ts
git commit -m "build: add Dockerfile and Railway deploy configuration"
git push
```

---

### Task 6: Configure Railway and deploy to the Railway address

This task is operations only. Nothing changes for nickchabot.com yet.

**Files:** none in the repo. The VM's environment is copied to `~/career-migration/vm.env` (outside the repo).

- [ ] **Step 1: Copy the VM's settings into Railway variables**

```bash
ssh -i ~/.ssh/isba4775_azure azureuser@<VM_PUBLIC_IP> 'cat ~/career-platform/.env' > ~/career-migration/vm.env
chmod 600 ~/career-migration/vm.env
grep -oE '^[A-Z_]+=' ~/career-migration/vm.env   # names only; never print values into the chat
```

Set every variable except `DATABASE_URL`, `FILE_STORAGE_DIR`, `NEXT_PUBLIC_SITE_URL` and `NEXT_PUBLIC_GA_MEASUREMENT_ID` on the web service. The GA ID is set in Task 7, Step 7, after the privacy page describes Railway. Values with spaces or quotes stay intact because each line is passed as one argument:

```bash
grep -vE '^(DATABASE_URL|FILE_STORAGE_DIR|NEXT_PUBLIC_SITE_URL|NEXT_PUBLIC_GA_MEASUREMENT_ID)=|^#|^$' ~/career-migration/vm.env \
  | while IFS= read -r line; do railway variables --service <WEB_SERVICE> --set "$line" --skip-deploys; done
railway variables --service <WEB_SERVICE> --set 'DATABASE_URL=${{<PG_SERVICE>.DATABASE_URL}}' --skip-deploys
```

If `--skip-deploys` isn't recognised (`railway variables --help`), drop it. An early deploy will fail its health check harmlessly. Expected names on the web service: `OWNER_EMAIL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `RESEND_API_KEY`, `CONTACT_NOTIFICATION_EMAIL`, `CONTACT_FROM_EMAIL`, `RATE_LIMIT_SECRET`, `DATABASE_URL`, plus the Umami variables if they're set on the VM.

- [ ] **Step 2: Create the Railway address and set the site URL**

```bash
railway domain --service <WEB_SERVICE>     # prints https://<something>.up.railway.app
railway variables --service <WEB_SERVICE> --set "NEXT_PUBLIC_SITE_URL=https://<RAILWAY_DOMAIN>"
```

In the Supabase dashboard (Authentication → URL Configuration), add `https://<RAILWAY_DOMAIN>/**` to Redirect URLs, so the magic link works on the Railway address. Leave the Site URL as `https://nickchabot.com`.

- [ ] **Step 3: Deploy the branch**

If Task 0 found the web service connected to GitHub `main`, don't merge. Deploy from the local branch instead:

```bash
railway up --service <WEB_SERVICE> --detach
railway logs --service <WEB_SERVICE> --deployment
```

Expected in the logs: the Docker build, then `Migrations applied.` from the pre-deploy step, then `next start` reporting Ready. The deployment then turns Active once `/api/health` returns 200.

Confirm the deploy created tables but no rows:

```bash
docker run --rm postgres:17 psql "$(railway variables --service <PG_SERVICE> --kv | sed -n 's/^DATABASE_PUBLIC_URL=//p')" -tAc \
  "select relname, n_live_tup from pg_stat_user_tables order by relname" ;
docker run --rm postgres:17 psql "$(railway variables --service <PG_SERVICE> --kv | sed -n 's/^DATABASE_PUBLIC_URL=//p')" -tAc \
  "select (select count(*) from profile) + (select count(*) from project) + (select count(*) from contact_message) + (select count(*) from stored_file)"
```

Expected: the 13 app tables are listed, and the sum is `0`. If it isn't `0`, stop. Something seeded on deploy, which Task 5's test should have caught.

- [ ] **Step 4: Copy the data (rehearsal)**

Take a fresh snapshot (as in Task 4, Step 4), then copy it into Railway over its public URL:

```bash
TARGET_DATABASE_URL="$(railway variables --service <PG_SERVICE> --kv | sed -n 's/^DATABASE_PUBLIC_URL=//p')" \
  node scripts/copy-sqlite-to-postgres.mjs ~/career-migration/career-copy.db ~/career-migration/files
```

Expected: the same counts as the rehearsal, then `Copy complete.`

- [ ] **Step 5: Smoke-test the Railway address**

```bash
R=https://<RAILWAY_DOMAIN>
curl -s $R/api/health
curl -s -o /dev/null -w "%{http_code}\n" $R/
curl -s $R/sitemap.xml | grep -c "<loc>"
curl -s -o /dev/null -w "%{http_code} %{content_type}\n" $R/resume
curl -sI $R/ | grep -iE "strict-transport|x-frame|content-security"
curl -s -o /dev/null -w '%{redirect_url}\n' $R/admin
curl -s -o /dev/null -w '%{redirect_url}\n' $R/auth/callback
```

Expected: `{"status":"ok"}`. The two redirects are `$R/login` and `$R/login?error=callback`, with the same `https://` host as `$R`, never `localhost` or `http://`. Home returns 200. The sitemap has 1 + (number of published projects) entries, with `<loc>` values on the Railway address. `/resume` returns `200 application/pdf` if a resume is uploaded, or 404 if not. The security headers are present.

Then, in a browser:
1. Sign in at `$R/login` with the owner email and confirm the magic link lands on `/admin`.
2. Confirm the dashboard shows the copied contact messages and applications.
3. Download one application document.
4. Send a contact-form message; confirm it appears in `/admin/messages` and that the notification email arrives.

- [ ] **Step 6: Check that rate limiting tells visitors apart**

Send six contact messages from the laptop within a minute. The sixth should be refused. Then send one from a phone on mobile data, which should be accepted. If the phone is also refused, Railway's proxy isn't passing the visitor's address in `X-Forwarded-For`. Stop and report this: `clientIp` in `lib/security/rate-limit.ts` needs changing before the cutover.

Afterwards, delete the test messages in `/admin/messages`.

---

### Task 7: Move nickchabot.com to Railway

The VM keeps running throughout, and nothing on it is changed.

**Files:**
- Modify: `docs/operations.md`, `docs/how-this-site-is-secured.md`, `lib/security/rate-limit.ts` (comment only), `app/(public)/privacy/page.tsx`

- [ ] **Step 1: Merge the branch**

```bash
gh pr ready && gh pr checks --watch && gh pr merge --merge --delete-branch
git switch main && git pull --ff-only
```

If the web service deploys from `main`, this triggers a deploy. Wait for it to turn Active (`railway logs --service <WEB_SERVICE> --deployment`). Otherwise, run `railway up --service <WEB_SERVICE> --detach` from `main`.

- [ ] **Step 2: Final data copy**

Take a fresh VM snapshot (Task 4, Step 4), then:

```bash
TARGET_DATABASE_URL="$(railway variables --service <PG_SERVICE> --kv | sed -n 's/^DATABASE_PUBLIC_URL=//p')" \
  node scripts/copy-sqlite-to-postgres.mjs ~/career-migration/career-copy.db ~/career-migration/files --replace
```

This overwrites anything written on Railway since Task 6, including the test messages.

- [ ] **Step 3: Add the custom domains on Railway**

```bash
railway domain nickchabot.com --service <WEB_SERVICE>
```

Record the DNS records Railway asks for: a `CNAME` target, and possibly a `TXT` verification record. Don't add `www` to Railway: Cloudflare redirects it (see Step 4).

- [ ] **Step 4: Switch DNS in Cloudflare (with the user)**

In the Cloudflare dashboard for nickchabot.com:
1. Record the current `@` and `www` records, including each one's proxy status. These are the rollback values.
2. Find the rule that redirects `www` (Rules → Redirect Rules, or Page Rules), and leave it and the proxied `www` record unchanged. If no such rule exists, add `www` to Railway as well and treat it like `@`.
3. Replace the `@` `A` record with a `CNAME` to the target Railway gave. Cloudflare flattens the `CNAME` at the apex automatically.
4. Keep `@` set to "DNS only" (grey cloud), so Railway can issue its certificate.
5. Add any `TXT` record Railway asked for.

```bash
until dig +short nickchabot.com | grep -qv "^<VM_PUBLIC_IP>$"; do sleep 15; done; dig +short nickchabot.com
```

Wait until the Railway dashboard shows the domain as verified, with a certificate issued.

- [ ] **Step 5: Point the app at the real domain**

```bash
railway variables --service <WEB_SERVICE> --set "NEXT_PUBLIC_SITE_URL=https://nickchabot.com"
```

This redeploys, which is needed because the value is compiled in at build time. Wait for it to turn Active.

- [ ] **Step 6: Verify the live site**

Repeat Task 6, Step 5 with `R=https://nickchabot.com`. Also check:

```bash
curl -sI https://www.nickchabot.com | head -1
curl -s https://nickchabot.com/sitemap.xml | grep -o "<loc>[^<]*" | head -3
curl -s https://nickchabot.com/ | grep -o "Resume sections"
```

Expected: `www` still answers with a 301 to `https://nickchabot.com/`, the sitemap lists `https://nickchabot.com/...` addresses, and the section menu is present. Sign in to `/admin` once more, and send one contact message.

- [ ] **Step 7: Rewrite the operations guide**

Replace `docs/operations.md` with a Railway version covering these sections. Use placeholders instead of addresses or secrets.
- **Where it runs:** Railway project, web service (Dockerfile, one replica) and Postgres service. Domains go through Cloudflare DNS (`CNAME`, DNS only).
- **Environment variables:** the list from Task 6, Step 1. `DATABASE_URL` is a reference to the Postgres service. `NEXT_PUBLIC_*` values are build-time values, so changing one redeploys.
- **Deploying an update:** merge to `main` (or `railway up`). The pre-deploy step runs `node scripts/migrate.mjs`, and a failed migration or health check leaves the previous deploy serving.
- **Database changes:** `pnpm db:generate --name <change>` locally, commit the migration, then deploy.
- **Backups:** check the Postgres service's Backups tab, and record what the plan provides. A manual backup is `pg_dump "$(railway variables --service <PG_SERVICE> --kv | sed -n 's/^DATABASE_PUBLIC_URL=//p')" -Fc -f career-platform-$(date +%F).dump`, and a restore is `pg_restore --clean --if-exists -d <url> <file>`. Uploaded files are in the dump, because they live in `stored_file`.
- **Logs and health:** `railway logs --service <WEB_SERVICE>`, and `https://nickchabot.com/api/health`.
- **Rollback during the fallback week:** in Cloudflare, put the `@` record back to an `A` record for `<VM_PUBLIC_IP>`, DNS only. `www` was never changed. Before doing so, export anything written on Railway since the cutover (new contact messages and application changes), because the VM doesn't have it.

Read `docs/how-this-site-is-secured.md`. Replace its VM-specific parts (nginx, NSG, Certbot, systemd) with what now provides each protection: Railway's TLS at the edge, the same Next.js security headers, Supabase owner-only login, Postgres reachable only on Railway's private network plus the password-protected public proxy. Keep everything that still holds.

In `lib/security/rate-limit.ts`, change the comment "The app runs as a single process on one VM" to "The app runs as a single Railway replica".

In `app/(public)/privacy/page.tsx`, with the user:
- Replace "Microsoft Azure hosts the server" with Railway, which hosts the app and its database.
- Rewrite "Server logs" for Railway. Check the retention for the user's Railway plan in Railway's docs, and state it.
- Replace the backup sentence with what the Postgres service's Backups tab shows.
- Ask the user for the GA4 data-retention setting.
- Change the "Last updated" date.

When no `[CONFIRM` remains (`grep -c "\[CONFIRM" "app/(public)/privacy/page.tsx"` prints `0`), turn the tag on. This redeploys, because the value is compiled in at build time:

```bash
railway variables --service <WEB_SERVICE> --set "NEXT_PUBLIC_GA_MEASUREMENT_ID=G-JTFJE8DS7S"
```

Then open https://nickchabot.com in a private window. Expected: the consent banner shows, and there are no `_ga` cookies until Accept.

- [ ] **Step 8: Commit**

```bash
git add docs/operations.md docs/how-this-site-is-secured.md lib/security/rate-limit.ts "app/(public)/privacy/page.tsx"
git commit -m "docs: describe running the site on Railway"
git push
```

---

### Task 8: Retire the VM (at least a week after Task 7, with the user's go-ahead)

**Files:** none in the repo.

- [ ] **Step 1: Confirm Railway has been healthy all week**

Check the Railway dashboard's deploy history and metrics, and run `curl -s https://nickchabot.com/api/health`. Ask the user to confirm that nothing is missing, and that the VM isn't receiving traffic (`ssh … 'sudo tail -20 /var/log/nginx/access.log'` should show only bots hitting the bare IP).

- [ ] **Step 2: Keep a final copy of the VM's data, then stop the VM**

```bash
# snapshot exactly as in Task 4, Step 4, into ~/career-migration/final/
az vm deallocate -g rg-career-platform -n vm-career-platform
```

Deallocating stops compute charges but keeps the disk. Deleting the resource group (`az group delete -n rg-career-platform`) is a separate, irreversible decision, so ask the user explicitly before doing it.

- [ ] **Step 3: Clean up local copies**

Once the user agrees the final copy is no longer needed:

```bash
rm -rf ~/career-migration
```

Remove the `Allow-SSH-Laptop` rule, or the VM entirely, as the user decides. Update the Claude memory notes about the VM so they say the site now runs on Railway.
