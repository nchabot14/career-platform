# Moving the Site from Azure to Railway

On 2026-10-26 the site moved from an Azure VM (Next.js under systemd, nginx,
Certbot, SQLite on local disk) to Railway (a web service built from the
`Dockerfile`, plus a Railway PostgreSQL service). The Azure VM keeps running,
unchanged, as the fallback until Railway's trial decision is made.

- Plan: [2026-10-08-railway-postgres-migration.md](superpowers/plans/2026-10-08-railway-postgres-migration.md)
- Code change: [pull request #11](https://github.com/nchabot14/career-platform/pull/11)
- How a request reaches each host: [request-path.md](request-path.md)
- Domain and HTTPS after the cutover: [evidence/domain-and-https.md](evidence/domain-and-https.md)

## Timeline

| When | What |
|---|---|
| 2026-10-08 | Railway lesson. The plan is named for this date. |
| 2026-10-20 12:17–12:30 PDT | Code commits on `feat/railway-postgres` (`076c39a` to `56ba5aa`). |
| 2026-10-20 12:31 PDT | Plan committed (`2edd994`), a few minutes after the code it describes. Nothing on the live Azure site had changed. |
| 2026-10-26 07:50 UTC | VM database backed up and checked. |
| 2026-10-26, morning UTC | Railway deploy of the branch, data copy and comparison, write and update checks (below). |
| 2026-10-26 08:55 UTC | **Cutover:** Cloudflare `@` changed from the VM's `A` record to a CNAME at Railway, DNS only. |
| 2026-10-26 09:37 UTC | PR #11 merged; Railway deploys `main` from then on. |

The plan was reviewed and updated on 2026-10-26 (`e901dcd`) before the
cutover, with the status of every task.

## What changed in the code

| Area | Azure | Railway |
|---|---|---|
| Database | SQLite file through `@libsql/client` | PostgreSQL 18 through `postgres` (postgres.js) and Drizzle |
| Uploaded files | `data/files/` on the VM's disk | `stored_file` table, so a database backup includes them |
| Build and start | `pnpm build` on the VM, `next start` under systemd | `Dockerfile`; Railway runs `node scripts/migrate.mjs` before each deploy goes live |
| Schema changes | `pnpm db:migrate` by hand over SSH | Pre-deploy migration on every deploy |
| Redirects | Built from the request, which broke behind nginx | Built from `NEXT_PUBLIC_SITE_URL`, so the proxy can't change them |
| Rate-limit client IP | First `X-Forwarded-For` entry (nginx overwrote it) | `X-Real-IP`, which Railway's edge overwrites; a visitor can't forge it |
| Local development | SQLite file | PostgreSQL in Docker (`compose.yaml`), so tests match production |

Deploys never seed data. Migrations only create schema, and
`tests/unit/deploy-does-not-seed.test.ts` checks the migrations, the
pre-deploy command, the container's start command and the package scripts.

## How the data moved

1. **Backup.** An online SQLite `.backup` on the VM, checked with
   `PRAGMA integrity_check` (`ok`) and row counts against the live database.
2. **Transfer.** The backup was copied to the laptop (checksum matched), then
   loaded into Railway Postgres with `scripts/copy-sqlite-to-postgres.mjs`.
   The script runs as one transaction and refuses a non-empty database
   unless given `--replace`.
3. **Comparison.** Every table was compared between the live VM database
   and Railway, row by row on `id` and value by value: timestamps to the
   millisecond, booleans as booleans, JSON ignoring key order. A copy with
   one changed name and one timestamp moved by 1 ms was flagged, which
   showed the comparison can fail.

| Table | VM rows | Railway rows | Result |
|---|---:|---:|---|
| profile | 1 | 1 | 10 values identical |
| experience | 2 | 2 | 22 values identical |
| education | 2 | 2 | 20 values identical |
| skill | 4 | 4 | 36 values identical |
| project | 1 | 1 | 13 values identical |
| resume_document, social_link, contact_message, job_application, application_contact, application_document, application_activity | 0 | 0 | Empty on both |
| stored_file (Railway only) | – | 0 | Empty; the VM had no uploads |

The VM had no uploaded files and no writes after the backup was taken.

**Why a seed restore can't pass as this transfer.** The project has no seed
data: a freshly migrated database has 0 rows in every table, which
`tests/unit/deploy-does-not-seed.test.ts` checks for every deploy path. All
the VM's rows were entered by hand after the VM was set up
([ex03.md](evidence/ex03.md#the-sqlite-database-i-expected-didnt-exist)), so
matching them value for value can only come from copying the VM's database.
*To confirm with the owner: whether a specific record was edited on the VM
before the backup, to name here as the "real change". If not, the "Git and
GitHub" skill below is the change, made on Railway after the copy.*

## Proving it works

- **Reads:** the Railway site showed the VM's profile, experience, project and
  skills.
- **Writes:** the skill "Git and GitHub" (Developer tools) was added to Railway
  Postgres through `railway run`, and appeared on the Railway site right away.
  The VM doesn't have it, so the site is reading Railway's database.
- **Updates:** commit `07f8801` added a LinkedIn button. Pushing it was the
  whole release: Railway built and deployed it in about 1.5 minutes
  (deployment `d63fdb05`). On the VM, the same update meant SSH, pull,
  install, a 6-minute build that pushed the 1 GiB VM deep into swap (the
  homepage took 27 seconds to load meanwhile), and a rolling restart.

## Cutover and checks after it

1. **Before moving the domain** (2026-10-26, on
   `career-platform-production-0e0b.up.railway.app`): the homepage showed the
   VM's data, `/api/health` returned 200, the deploy log showed
   `Migrations applied.`, and the comparison above matched.
2. **Cutover** at 08:55 UTC: `@` to a CNAME at Railway, DNS only. The `www`
   redirect rule stayed as it was.
3. **After the cutover:**
   - DNS: `nickchabot.com` resolves to Railway's edge. **Pass.**
   - `http://www` and `https://www` 301 to `https://nickchabot.com/`. **Pass.**
   - Railway routes `nickchabot.com` to the app (200 with certificate checks
     off). **Pass.**
   - HTTPS with a valid certificate at `nickchabot.com`. **Fail**, Railway
     hasn't issued it; investigation in
     [domain-and-https.md](evidence/domain-and-https.md#investigation-railway-certificate-not-issued).
   - Settings: on Railway only `DATABASE_URL` (a reference to the Postgres
     service) and `NEXT_PUBLIC_SITE_URL` are set. The Supabase, Resend,
     `OWNER_EMAIL` and `RATE_LIMIT_SECRET` variables aren't, so `/admin`
     sign-in and contact alerts don't work on Railway yet. They didn't work
     on the VM either. The GA4 measurement ID was added later that day
     ([ex06.md](evidence/ex06.md#live-site-check)).

## Problems along the way

- **`railway.json` was ignored.** Railway parses it, but new services can't
  use config-as-code, so the first deploy ran without the pre-deploy
  migration and served `relation "profile" does not exist`. The pre-deploy
  command (`node scripts/migrate.mjs`) and health check (`/api/health`) are
  set in the dashboard instead. Config-as-code stops for all services on
  2026-12-01; the replacement is `.railway/railway.ts`.
- **The health check didn't catch missing tables.** `/api/health` only checks
  that the database answers, so the broken deploy went live.
- **HTTPS certificate rate-limited.** Railway's first certificate attempts for
  nickchabot.com ran before the DNS change had spread, failed, and hit
  Let's Encrypt's failed-validation limit. The domain stayed verified, but
  visitors saw a certificate error until the limit cleared.
- **Railway auto-deployed `main` before the code was ready.** The web service
  was connected to GitHub `main`, which still had the SQLite code, so its
  first build failed. The service deployed `feat/railway-postgres` until the
  merge.
- **A flaky unit test.** `tests/unit/public-page.test.tsx` cleared the page
  without unmounting React, which failed CI intermittently with "window is
  not defined" (seen on `main` since 2026-10-20). Fixed with `cleanup()`.

## Where this app differs from the course guide

The guide was written for a Python app. This site is Next.js, so there is no
Uvicorn proxy setting and no `alembic upgrade head`; the equivalents are
"build redirects from `NEXT_PUBLIC_SITE_URL`" and `Migrations applied.` in
the deploy log. Local development uses PostgreSQL in Docker rather than
SQLite, so tests run against the same database as production.

## Who manages what

| Layer | Azure VM | Railway |
|---|---|---|
| Operating system | **Me**: Ubuntu updates, packages, the swap and memory limits | Railway |
| Runtime | **Me**: Node.js and pnpm installed on the VM | **Me**, through the `Dockerfile` (`node:24-slim`, pnpm 11.24.0); Railway runs the container |
| Web entry point | **Me**: nginx, the NSG rules for 80/443, port 22 for SSH | Railway's edge; there's no SSH and no firewall to manage |
| TLS | **Me**: Certbot, its renewal timer, nginx's certificate settings | Railway issues and renews the certificate. **Me**: DNS has to point at Railway, and when issuance fails (as now) I have to notice and chase it |
| Application code | **Me** | **Me** |
| Configuration and secrets | **Me**: `.env` on the VM, mode 600 | **Me**: variables on the Railway service. Railway stores them |
| Database software | **Me**: SQLite is a library in the app; nothing to run | Railway runs the Postgres container. **Me**: Railway calls it unmanaged, so version upgrades, tuning and the TCP proxy are my decisions |
| Data | **Me**: backups with `.backup` and cron | **Me**: backups (`pg_dump`), restores, migrations. Railway keeps the volume |
| DNS | **Me**, in Cloudflare | **Me**, in Cloudflare |

What I still own on Railway: code, Node.js and dependency versions,
environment variables and secrets, the schema and its migrations, the data
and its backups, DNS, testing, monitoring and recovery. A PaaS removes the
server, not the operating work: today's missing certificate and the ignored
`railway.json` were both things only I would notice.

## Rollback

- **Code:** revert the commit and push; Railway deploys the revert.
- **Hosting:** in Cloudflare, change the `@` record back to an `A` record for
  the VM's address, DNS only. The VM's certificate is valid until
  2027-01-06.
- **Data:** this is the hard part. Railway has taken writes since the copy
  (the "Git and GitHub" skill), and the VM doesn't have them. Before pointing
  DNS back, pause edits, compare both databases, and add anything new to the
  VM first. There is no Postgres-to-SQLite copy script; with this little
  data, re-entering changes through `/admin` is the practical path.

## Cost notes

- **Railway:** on the trial, which ends on **2026-11-08** (30 days with $5 of
  credit). After it, the Free plan allows no custom domain (one during the
  trial, then 0) and limits a service to 0.5 GB RAM, so keeping
  nickchabot.com on Railway means the Hobby plan: $5 of monthly usage credit,
  2 custom domains, and usage beyond the credit billed per second (memory
  $0.00000386 per GB/s, CPU $0.00000772 per vCPU/s, egress $0.05 per GB).
  Figures from <https://railway.com/pricing>, checked 2026-10-26.
- **Azure:** a Standard_B2ats_v2 VM (2 vCPUs, 1 GiB RAM) on an Azure for
  Students subscription. It keeps running as the fallback, so both hosts are
  paid for until one is retired.

## Recommendation

*Draft for review.* As the CTO of a three-developer startup on an Azure VM,
I would move to Railway. What I saw during this migration:

- **Our hours are the biggest cost.** On Azure, HTTPS alone took a firewall
  rule, nginx's `server_name`, Certbot, domain validation and a renewal
  timer. SSH access broke when the laptop's IP changed, deploys were manual,
  and every build risked running the VM out of memory. On Railway the same
  update was a `git push`, live in about 1.5 minutes, with the build
  happening off the server. For three developers, every hour not spent on
  patching, SSH rules and restarts goes to the product.
- **Money is close enough not to decide it.** Railway's Hobby plan includes
  $5 of usage a month and bills per second beyond that; the trial's usage
  page will show this site's real monthly figure before the decision. A VM is billed for every hour whether or not anyone
  visits, and ours needed more memory than its size to build reliably, so its
  real price was higher than the listed one.
- **We give up some control, on purpose.** We no longer choose the OS, nginx
  settings or the certificate authority, and Railway's platform decisions
  apply to us. Today that showed twice: `railway.json` was ignored for new
  services, and certificate issuance was briefly rate-limited. We still own
  the code, data, schema, secrets, DNS and backups.
- **Reliability is better, if we use it.** Railway restarts failed services,
  rolls out deploys only after a health check passes, and keeps the previous
  deploy serving when a migration fails. The VM was a single machine whose
  failures we would find and fix ourselves. The health check needs to cover
  the schema, not just the database connection, so a deploy like today's
  first one can't go live.

What would change my answer: needing hardware or networking control Railway
doesn't offer, compliance rules that require a specific cloud or region, or
usage growing until the per-resource bill clearly exceeds a VM plus the time
to run it. Before committing, we should rehearse a restore from a
`pg_dump`, since backups are still ours.

## Still pending

As of 2026-10-26, 18:30 UTC:

- **HTTPS at nickchabot.com:** the certificate isn't issued (Railway
  support request next).
- **`/admin` sign-in and contact-form emails:** the Supabase and Resend
  variables aren't set on Railway (they were empty on the VM too).
- **Database outage check on the live site:** done on a local production
  build ([database-outage.md](evidence/database-outage.md)), not on Railway.
- Remove the Postgres TCP proxy once nothing on the laptop needs the
  database.
- Retire or keep the Azure VM, when the instructor says.
