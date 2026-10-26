# career-platform

A recruiter-first resume site with a private owner dashboard, built with
Next.js App Router, TypeScript, Tailwind CSS, Drizzle ORM, and PostgreSQL.

**Live:** <https://nickchabot.com>, on Railway. As of 2026-10-26, Railway
hasn't issued its HTTPS certificate yet, so browsers warn at that address
([why](docs/evidence/domain-and-https.md#investigation-railway-certificate-not-issued)).
The same deployment answers at
<https://career-platform-production-0e0b.up.railway.app>.

Project 1 evidence: [docs/project-1-submission.md](docs/project-1-submission.md).

- **Public site:** profile, experience, projects (each with its own page),
  skills, education, links, a Resume PDF download, and a contact form.
  Only published content is shown. Projects are read from the database on
  every request. If the database fails, the homepage still shows the
  profile, says "Projects temporarily unavailable." and returns HTTP 503.
  A refresh after the database recovers brings the projects back
  ([evidence](docs/evidence/database-outage.md)).
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
backups (Railway's PostgreSQL is unmanaged), DNS, testing and recovery. The
layer-by-layer comparison is in
[docs/railway-migration.md](docs/railway-migration.md#who-manages-what).

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
[docs/operations.md](docs/operations.md); the nginx, two app copies, NSG
rules and reboot check are in
[docs/superpowers/plans/2026-10-01-operate-the-vm.md](docs/superpowers/plans/2026-10-01-operate-the-vm.md),
and its HTTPS setup in [docs/how-this-site-is-secured.md](docs/how-this-site-is-secured.md).

## Architecture

Diagrams for Azure and Railway, with locations, protocols, ports and data
flow, plus the email and analytics paths:
[docs/request-path.md](docs/request-path.md).

In short: Cloudflare DNS sends `nickchabot.com` to Railway's edge, which
ends TLS and forwards plain HTTP to the Next.js container on port 8080. The
app reads Railway Postgres over the private network on port 5432. `www` is
answered by Cloudflare with a 301 to the bare domain. Mail goes to Zoho
through the MX records, whichever host runs the site, and visitors' browsers
send analytics straight to Google.

## Rollback

**Code.** Every push to `main` is a new Railway deployment, and the old
ones stay listed (`railway deployment list`).
- Fastest: in the Railway dashboard, open the last good deployment and
  choose **Rollback**. It switches traffic back to that image without a
  rebuild.
- Lasting: `git revert <sha>` and push, so `main` matches what's running.
  Railway builds the revert, runs migrations, and switches traffic only
  after `/api/health` passes.

**Database.** Migrations in `drizzle/` only go forward, and they run before
each deploy. So:
- Before merging a change that adds a migration, take a backup:
  `railway run --service Postgres -- sh -c 'pg_dump "$DATABASE_PUBLIC_URL"' > backup-$(date -u +%Y%m%dT%H%M%SZ).sql`
  (needs `pg_dump` 18 on the laptop; never commit the file).
- To undo a schema change, write a new migration that reverses it and
  deploy that. Rolling the code back alone leaves the new schema in place,
  so old code has to tolerate it. Adding columns or tables is safe;
  dropping or renaming isn't.
- If data is damaged, restore the backup into the Postgres service
  (`psql "$DATABASE_PUBLIC_URL" < backup.sql` on an emptied database), after
  pausing edits so nothing written in between is lost. Compare row counts
  before reopening.

**Hosting.** To fall back to Azure, change Cloudflare's `@` record back to
an `A` record for the VM, DNS only. The VM's certificate is valid until
2027-01-06. Data written on Railway since 2026-10-26 isn't on the VM, so it
has to be copied back first; see
[docs/railway-migration.md](docs/railway-migration.md#rollback).

## Decisions

Written up on 2026-10-26 from the repository and what happened, and
checked by me against my own reasons.

1. **SQLite first, then PostgreSQL.** I used SQLite on the Azure VM
   because the course's Azure guide called for it; I didn't compare engines
   myself at the time. Looking back, it fit that setup: the database is one
   file next to the app, there's no database server to install, secure or
   keep running, it's read locally rather than over the network, and a
   backup is one `.backup` command. Running PostgreSQL on the VM would have
   meant another service competing with the app for the VM's 1 GiB of
   memory. The limit showed up at the next move: a SQLite file lives on one
   machine's disk, and Railway runs the app in a container with no lasting
   disk, so moving to Railway meant moving to PostgreSQL. (Commit `1405773`,
   2026-10-01.)
2. **Moving from the VM to Railway.** Alternatives: stay on the VM, or
   move to another PaaS. I'd move, because our time is the biggest cost and
   Railway takes over the server, TLS and deploys. The full reasoning is in
   the [recommendation](docs/railway-migration.md#recommendation).
3. **Managed email (Zoho) instead of running a mail server.** Running
   Postfix and Dovecot on the VM was the alternative. It would mean keeping
   port 25 open, spam filtering, TLS certificates for mail, and building a
   sending reputation from a cloud IP address, which large providers often
   distrust (Azure also restricts outbound port 25). Zoho's free plan
   handles all of that; I publish MX, SPF, DKIM and DMARC records and keep
   control of the domain, so I can switch providers by changing DNS. The
   cost is depending on Zoho's free-plan limits.

## Investigated failures

| Failure | Kind | Record |
|---|---|---|
| The SQLite database the app expected didn't exist, then held no data | Application/database dependency, real | [ex03.md](docs/evidence/ex03.md#the-sqlite-database-i-expected-didnt-exist) |
| First Railway deploy served `relation "profile" does not exist`: the pre-deploy migration never ran because Railway ignored `railway.json` | Application/database dependency, real | [railway-migration.md](docs/railway-migration.md#problems-along-the-way) |
| Railway's certificate for nickchabot.com not issued after the cutover | Network/TLS, real, **unresolved** | [domain-and-https.md](docs/evidence/domain-and-https.md#investigation-railway-certificate-not-issued) |
| DNS still at the old VM, so the old certificate didn't match | DNS/TLS, **supplied lab simulation** | [ex05.md](docs/evidence/ex05.md) |
| Azure region refused by the student subscription; wrong IP in the plan | Azure setup, real | [ex03.md](docs/evidence/ex03.md#what-went-wrong-and-how-i-fixed-it) |

Each record gives the symptom, the checks, the diagnosis, the repair, and
the repeated check.

## Remaining limitations

As of 2026-10-26:

- **HTTPS at nickchabot.com isn't working** until Railway issues the
  certificate.
- **No `/admin` sign-in or contact alerts on Railway:** the Supabase,
  `OWNER_EMAIL` and Resend variables aren't set. Contact messages are still
  saved.
- **The database outage check ran on a local build**, not on Railway.
- **The fallback profile is a copy** (`lib/fallback-profile.ts`), so it has
  to be updated by hand when the profile or education changes.
- **The health check doesn't cover the schema:** it only checks that the
  database answers, so a deploy with missing tables can still go live.
- **`railway.json` stops being read on 2026-12-01.** The deploy settings
  are set in the dashboard; they should move to `.railway/railway.ts`.
- **Backups on Railway are manual** (`pg_dump`), and a restore hasn't been
  rehearsed.

## Services, costs and cleanup

| Service | What it's for | Billing | Cost so far | Ends or renews | Cleanup |
|---|---|---|---|---|---|
| Railway, project `fabulous-recreation` | Web service (compute) and Postgres (compute, plus a volume that keeps the data) | Trial: $5 of credit for 30 days | $0.36 for 2026-10-08 to 2026-10-26 (`railway usage`) | Trial ends **2026-11-08**; after that a custom domain needs the Hobby plan | Before the trial ends, move to AWS (course plan) or upgrade. Remove the Postgres TCP proxy now. Delete the old projects `caring-comfort` and `thorough-trust` |
| Azure VM `vm-career-platform` (Standard_B2ats_v2) | Old host, kept as the fallback | Azure for Students credit: compute by the hour, plus the OS disk and public IP, which bill even when the VM is stopped | $0.00 billed to me (`az consumption usage list`); the credit balance is in the Azure portal | Runs until the instructor says otherwise | When told: delete resource group `rg-career-platform`, which removes the VM, disk and IP |
| Domain `nickchabot.com` (Namecheap) | The address | Yearly | *Check the Namecheap receipt* | Expires **2027-10-01** | Turn off auto-renew if it's no longer wanted |
| Cloudflare | DNS and the `www` redirect | Free plan | $0 | — | — |
| Zoho Mail | `nick@nickchabot.com` | Forever Free plan | $0 | — | — |
| Google Analytics 4 | Visitor activity | Free | $0 | — | — |
| Supabase | Owner sign-in only (not configured on Railway) | Free plan | $0 | Free projects pause when inactive | — |
| GitHub | Repository and CI | Free | $0 | — | — |

## Specs and plans

- Original application spec:
  [docs/superpowers/specs/2026-10-01-career-platform-design.md](docs/superpowers/specs/2026-10-01-career-platform-design.md)
- Application plan:
  [docs/superpowers/plans/2026-10-01-career-platform.md](docs/superpowers/plans/2026-10-01-career-platform.md)
- Azure VM migration:
  [docs/superpowers/plans/2026-09-24-azure-vm-migration.md](docs/superpowers/plans/2026-09-24-azure-vm-migration.md)
  and [docs/superpowers/plans/2026-10-01-operate-the-vm.md](docs/superpowers/plans/2026-10-01-operate-the-vm.md)
- Railway and PostgreSQL migration:
  [docs/superpowers/plans/2026-10-08-railway-postgres-migration.md](docs/superpowers/plans/2026-10-08-railway-postgres-migration.md).
  There is no separate spec for it; the plan carries the requirements.

## Reflection

Something that I understand better is how these requests actually get from a
browser to the app. It is a complicated process where it starts through DNS,
moves through TLS, then hits the proxy, which forwards the request to the
app, and the app builds the page from the information it reads from the
database.

Something that surprised me is how the before-MX email ended up arriving 33
minutes late, rather than bouncing. I thought this email would bounce, but
instead, it just got delayed by a long time before it actually ended up
sending, which is something that I would not have predicted or expected.

Something I'd change is adding the site's real domain after DNS had spread,
rather than before, since I believe that would make the process smoother. I
also would've changed the fact that I did not set all the variables before
the cutover, a good practice to do which I consciously chose not to.
