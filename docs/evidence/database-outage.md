# Database Outage, Empty Table and Recovery

Requirement 1: when the database fails, the profile stays visible, the page
says "Projects temporarily unavailable." and returns HTTP 503. A refresh
after the database recovers brings the projects back without restarting the
app. No sample content replaces a failed query.

## How it works

- `proxy.ts` runs before the homepage renders and checks the database with
  `select 1` (`lib/db/health.ts`, 2-second limit). If that fails, the
  response status is 503. A Next.js page can't set its own status once
  rendering starts, which is why the check lives in the proxy.
- `app/(public)/page.tsx` catches a failed content query and renders the
  fallback profile from `lib/fallback-profile.ts`: name, introduction,
  location, education and the LinkedIn link, none of which needs the
  database. The Projects section says "Projects temporarily unavailable."
  and lists nothing.
- Both checks run on every request, and postgres.js reconnects on its own,
  so recovery needs only a refresh.
- An empty projects table shows "No projects published yet." instead of
  hiding the section.
- The error page no longer shows the raw error message, which could carry
  database details.

## Check: stop and restart the database

Date: 2026-10-26, 18:17 UTC. Run on the laptop against a production build
(`pnpm build`, then `next start`) of branch `feat/db-outage-503`, with the
local PostgreSQL container from `compose.yaml` holding a copy of the site's
data. The database was stopped with `docker compose stop postgres` and
started again with `docker compose start postgres`. The server process kept
running throughout.

`grep -c` counts how often each phrase appears in the returned HTML.

```
== 1. database up (18:17:03Z)
GET / -> HTTP 200
  Nicholas Chabot                    2
  Loyola Marymount University        2
  Projects temporarily unavailable   0
  Soccer Data Analytics Pipeline     2
  LinkedIn                           2
/api/health -> 200 {"status":"ok"}

== 2. database stopped (18:17:04Z)
GET / -> HTTP 503
  Nicholas Chabot                    1
  Loyola Marymount University        1
  Projects temporarily unavailable   1
  Soccer Data Analytics Pipeline     0
  LinkedIn                           1
/api/health -> 503 {"status":"degraded"}

== 3. database restarted, same server process, refresh (18:17:05Z)
GET / -> HTTP 200
  Nicholas Chabot                    1
  Loyola Marymount University        1
  Projects temporarily unavailable   0
  Soccer Data Analytics Pipeline     1
  LinkedIn                           1
/api/health -> 200 {"status":"ok"}
```

During the outage the server logged `public_page_database_failed` (twice:
page metadata and page body) and `health_check_failed`, as one-line JSON
with no connection details.

## Tests

- `tests/unit/homepage-status.test.ts`: 200 when the database answers, 503
  when it doesn't, recovery on the next request, and no check on form posts.
- `tests/integration/database-health.test.ts`: the check against a real
  database, a failed query and a query that never answers.
- `tests/unit/public-page.test.tsx`: the fallback profile with "Projects
  temporarily unavailable.", fallback page metadata, and the empty-projects
  message.
- `tests/unit/error-page.test.tsx`: the error page hides the error's text.

Run on 2026-10-26: `pnpm test` 110 passed, `pnpm test:integration` 33
passed, `pnpm lint` 0 errors, `pnpm typecheck` clean, `pnpm build`
succeeded.

## Not checked

- **The live site.** Repeating this on Railway means stopping the Railway
  Postgres service, which takes the real site's database down. It hasn't
  been done.
- **An empty table in a running build.** Covered by the unit test only,
  since emptying the table would mean deleting the site's real project.
