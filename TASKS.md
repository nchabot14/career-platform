# Project 1 Tasks

Gaps found in the 2026-10-20 audit against the Project 1 requirements. Due 2026-10-22, 1:45 PM.

## 1. Profile and project data

- [ ] Home page shows the profile, "Projects temporarily unavailable", and HTTP 503 when the database fails: `app/(public)/page.tsx`, `lib/services/public-profile.ts`
- [ ] Profile stays visible during a database outage (needs a source that doesn't depend on the database): `lib/services/public-profile.ts`
- [ ] Error page stops showing raw `error.message` to visitors: `app/error.tsx`
- [ ] Empty projects table shows a deliberate message instead of hiding the section: `app/(public)/page.tsx`
- [ ] Tests for 200 when healthy, 503 on failure, and recovery on refresh without a restart: `tests/integration/`
- [ ] Recorded check: stop the database, load the page (503), restore it, refresh (200, projects back), with dates and output
- [ ] Recorded check of live content: education, links, and a labeled "this website, in progress" project
- [ ] Explain the initial database choice (SQLite) and why: `README.md` decisions section (spec still says Supabase/Vercel)

## 2. Azure deployment

- [ ] Record the HTTPS change: port 443 / `Allow-HTTPS` NSG rule and the Nginx TLS and `server_name` config: `docs/superpowers/plans/2026-10-01-operate-the-vm.md` or a new evidence file
- [ ] Redact the VM's public IP consistently, or decide to keep it: `docs/evidence/ex03.md`, `docs/evidence/dns-before-zoho.md`
- [ ] Recorded check that the VM is still running and SSH works (SSH timed out on 2026-10-20)

## 3. Domain and HTTPS

- [ ] Point the bare domain at Railway and record Railway's certificate (hostname, validity, renewal): new evidence file
- [ ] Add the Cloudflare redirect rule on a proxied `www` record and record it
- [ ] Recorded check: `curl -Iv` for `http://www` and `https://www` both land on `https://nickchabot.com` with a valid certificate
- [ ] Final DNS record table with the purpose of each record: new evidence file
- [ ] Resolve the `www` contradiction (DNS-only A record in `docs/evidence/dns-before-zoho.md` vs. proxied in the Railway plan)

## 4. Railway and PostgreSQL migration

- [ ] Add the Railway migration spec: `docs/superpowers/specs/`
- [ ] State honestly that the plan (`2edd994`) was committed after the code commits, and what existed before the deployment changed: `docs/superpowers/plans/2026-10-08-railway-postgres-migration.md`
- [ ] Make one real change to the source data before the copy, and record it
- [ ] Recorded source vs. target comparison: row counts, record content, and the rendered page
- [ ] Record Railway project details, secrets set (names only), and pre-cutover tests on the Railway address
- [ ] Record the cutover and post-cutover checks with dates and output
- [ ] Azure vs. Railway responsibility comparison (OS, runtime, web entry, TLS, code, config, database software, data, DNS): `README.md`
- [ ] Merge `feat/railway-postgres` into `main`
- [ ] Link the spec and plan from `README.md` and `docs/project-1-submission.md`

## 5. Reviewed change through Railway

- [ ] Confirm which branch Railway deploys from, and fix it (the bot's railpack fixes went to `main`, which has no `Dockerfile`/`railway.json`)
- [ ] Get one successful Railway deployment: Railway build and deploy logs
- [ ] Recorded check linking a reviewed commit SHA to its Railway deployment and the change seen at nickchabot.com
- [ ] Rollback section for code and database changes: `README.md`

## 6. Zoho email

- [ ] Add the before-MX message line and what happened to it: `docs/evidence/ex06.md`
- [ ] Record the published MX, SPF, DKIM, and DMARC values and explain each: new evidence file or `docs/evidence/ex06.md`
- [ ] Confirm the reply showed `nick@nickchabot.com` as the sender: `docs/evidence/ex06.md`
- [ ] Note that Test 04 was sent through the Zoho MCP server and Test 02 through Zoho webmail: `docs/evidence/ex06.md`
- [ ] Link `docs/evidence/ex06.md` and `docs/evidence/zoho-header-check.md` from `README.md` and `docs/project-1-submission.md`

## 7. GA4

- [ ] Recorded check on the live site: a page view and an outbound click in Realtime or DebugView: `docs/evidence/ex06.md`
- [ ] Say whether Realtime or DebugView was used: `docs/evidence/ex06.md`
- [ ] Explain how browser activity reaches GA4 and what the checks show: `docs/evidence/ex06.md`
- [ ] Expand why the click event is useful: `docs/evidence/ex06.md`

## 8. Engineering record

- [ ] What the site does, the live address, and setup/update steps (now PostgreSQL): `README.md`
- [ ] Azure and Railway architecture diagrams with locations, protocols, ports, data flow, email, and analytics: `README.md` or a diagrams file
- [ ] How the migration preserved current data and which responsibilities moved: `README.md`
- [ ] Two decisions with alternatives and reasons (Railway migration, managed vs. self-hosted email): `README.md`
- [ ] Investigated failures linking `docs/evidence/ex03.md` and `docs/evidence/ex05.md` (labeled simulation), plus remaining limitations: `README.md`
- [ ] Reflection: `README.md`
- [ ] Costs, credits, Railway trial end date, and cleanup plan: `README.md`
- [ ] Update to match the Nginx + `@8000`/`@8001` setup, or point to Railway: `docs/operations.md`
- [ ] Repository URL, live HTTPS URL, final commit SHA, and links for all eight submission items: `docs/project-1-submission.md`
