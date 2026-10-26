# Project 1 Tasks

Audit against the Project 1 requirements, first on 2026-10-20 and updated on
2026-10-26. Evidence links are in
[docs/project-1-submission.md](docs/project-1-submission.md).

## Blocked by Railway

- [ ] HTTPS certificate for `nickchabot.com`: Railway reports a Let's Encrypt rate limit and won't retry, even after the domain was removed and re-added. Next: a Railway Help Station request. Then check the padlock, and record the certificate in `docs/evidence/domain-and-https.md`.
- [ ] Repeat the live checks at `https://nickchabot.com` once it has a certificate: the LinkedIn change (`docs/evidence/reviewed-change.md`) and a GA4 page view.

## Needs Nick

- [ ] Real change to the original data: name the record edited on the VM before the copy, or confirm the "Git and GitHub" skill is the change (`docs/railway-migration.md`).
- [ ] Confirm the SQLite and Zoho decision write-ups match your own reasons (`README.md` Decisions).
- [ ] Write the reflection (`README.md`).
- [ ] Optional: stop Railway Postgres briefly to repeat the outage check on the live site.
- [ ] Remove the Postgres TCP proxy; delete the old Railway projects `caring-comfort` and `thorough-trust`.
- [ ] Fill in the final commit SHA in `docs/project-1-submission.md`, and submit the repository URL, live URL and SHA in Brightspace.

## Done

- [x] Before-MX message recorded: "Test 00", sent 10:33, delivered 11:06 after MX was published (`docs/evidence/ex06.md`)
- [x] PR #12 merged and deployed (`b807b73f`, 2026-10-26 18:31 UTC); PR #13 merged
- [x] GA4 on the live site: page view and outbound click in Realtime, 2026-10-26 (`docs/evidence/ex06.md#live-site-check`)
- [x] Homepage keeps the profile, shows "Projects temporarily unavailable." and returns 503 when the database fails; recovers on refresh (`docs/evidence/database-outage.md`, PR #12)
- [x] Empty projects table shows a message; error page hides raw error text
- [x] Initial database choice explained (`README.md` Decisions)
- [x] Railway migration plan, data comparison, cutover record, responsibilities table, rollback (`docs/railway-migration.md`)
- [x] Merge `feat/railway-postgres` into `main` (PR #11)
- [x] Final DNS record table and verification, `www` redirects, certificate investigation (`docs/evidence/domain-and-https.md`)
- [x] Reviewed change linked to its commit and Railway deployment (`docs/evidence/reviewed-change.md`)
- [x] Mail DNS records explained (`docs/evidence/ex06.md`)
- [x] How browser activity reaches GA4, and why the click event is useful (`docs/evidence/ex06.md`)
- [x] Diagrams with email and analytics paths (`docs/request-path.md`)
- [x] README: live address, rollback, decisions, failures, limitations, costs and cleanup
- [x] Submission index with all eight evidence groups
