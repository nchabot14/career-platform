# AWS Migration Notes

A running log of the move from Railway to AWS (EC2 + RDS), following
[the plan](docs/superpowers/plans/2026-11-10-aws-ec2-rds-migration.md).
Each entry says what was done. A **Deviation** is anything that differs from
the plan, with the reason and what it costs.

This repo is public, so addresses, IDs and the account number are
placeholders: `<EIP>`, `<RDS_ENDPOINT>`, `<LAPTOP_IP>`, `<ACCOUNT_ID>`. The
real values are in `~/.config/career-platform/aws-ids.env` on the owner's
laptop.

## Deviations

| # | Task | Plan said | What happened | Why | Cost if wrong |
|---|---|---|---|---|---|
| 1 | 0 | Create nothing on AWS until the instructor answers (Step 1) and the secrets are in hand (Step 3). | RDS and EC2 were created on 2026-11-10 with both still open. | The owner asked for the database, then the server, to be created. | Resources may need recreating if the course limits differ, for example if RDS must be `db.t3.micro`. |
| 2 | 2–4 | Task order 1 → 2 → 3 → 4. | Order was 0 (partly) → 3 (with Task 2's security groups) → 2 (key pair) → 4 → 1. | It followed the owner's requests. Nothing in Tasks 2–4 depends on Task 1. | None. |
| 3 | 3 | `--backup-retention-period 7`. | **1 day.** | AWS rejected 7 with `FreeTierRestrictionError`: the account is on the AWS **Free plan**. 1 is the lowest value that keeps automated backups and point-in-time restore. | Point-in-time restore only covers the last 24 hours. Longer recovery relies on manual snapshots (Task 8) and `pg_dump` files. Raise it with `aws rds modify-db-instance --backup-retention-period 7 --apply-immediately` if the account plan changes. Task 9's privacy text must say 1 day, not 7. |
| 4 | 3 | RDS class from the instructor's answer. | `db.t4g.micro` (the plan's default). | No answer yet. | Recreate as `db.t3.micro` if only t3 is allowed. |
| 5 | 0 | Task 1 before any AWS resources. | Task 1 was written after RDS and EC2 existed. | The owner's request order. | None; Task 1 touches only the repo. |
| 6 | 5 | Final dump through `railway connect Postgres --tunnel-only`. | Not possible. | The tunnel needs an SSH key registered on the Railway account (a Railway change, which needs the owner's OK). The fallback, `DATABASE_PUBLIC_URL`, was also tried and failed: see #7. | None. |
| 7 | 5 | Fresh dump from Railway on the day of the move. | **Used the 2026-10-29 dump** (`railway-career-platform-20261029T220141Z.dump`), restore-tested that day. | Railway's Postgres service **was shut down on 2026-11-08 at 21:05 UTC** ("received smart shutdown request"), and all its deployments show REMOVED. The web service had been FAILED since 2026-10-26, so nothing could write to the database between the 10/29 dump and the shutdown. Restarting it would be a Railway change. | Low. Rows written to Railway by hand (not through the app) after 10/29 would be missing. Railway's volume still exists if a check is ever needed. |
| 8 | 5 | Compare against a fingerprint taken from Railway on the day. | Compared against the **10/29 fingerprint**, rebuilt from the 10/29 restore-test record, where every table matched live Railway. The scratch copy had been cleared. | Railway was offline (#7). | None. RDS matches it exactly. |
| 9 | 5 | Steps 5–6 read `deploy/aws/app-role.sql` and `scripts/db-fingerprint.sql` from `/srv/career-platform/repo`. | Read them with `git show origin/feat/aws-ec2-rds:<path>` into `~/migration`. | `/srv/career-platform` is mode 750, so `ubuntu` can't read it, and the server's clone has `main` checked out, where these files don't exist yet. | None. |
| 10 | 5 | Step 6.5: the postgres.js check with and without `NODE_EXTRA_CA_CERTS`. | Moved to Task 6, after the first deploy. | It needs the app's `node_modules`, and installing them into the git clone would leave about 500 MB there. The deploy installs them in the release anyway. | None. |
| 11 | 5 | Steps 1–4 run by hand. | Run as one script over SSH, with secrets sent through stdin (never in argv or shell history). Supabase, Resend and email values are **left empty** in `shared/.env`. | Task 0, Step 3 is still open. | `/admin` sign-in and contact-form email won't work until the owner fills them in and redeploys (`NEXT_PUBLIC_*` are fixed at build time). |
| 12 | 6 | Run `/srv/career-platform/repo/deploy/aws/deploy.sh` (from the clone's checkout). | The clone was switched to `feat/aws-ec2-rds` (`git checkout -B feat/aws-ec2-rds origin/feat/aws-ec2-rds`). | The clone had `main` checked out, which has no `deploy/aws/` until the merge. | Switch it back to `main` after Task 9's merge, or the server keeps running the branch's copy of `deploy.sh`. |
| 13 | 6 | Rollback-drill branch `test/broken-build`. | `drill/broken-build`. | GitHub refused the name: a branch called `test` already exists, and Git can't have both `test` and `test/…`. | None; deleted after the drill. |
| 14 | 8 | CloudWatch alarm `career-platform-recover` (run early, during Task 6). | **Not created.** | `AccessDenied` on `cloudwatch:PutMetricAlarm`. The plan says to record it and skip. | No alarm-driven recovery. EC2's built-in simplified automatic recovery is on (`AutoRecovery: default`) and covers host failures. Add the alarm if the instructor grants the permission. |
| 15 | 1/6 | `deploy.sh` reuses `releases/<sha>` if it exists. | **Fixed:** each deploy now builds in a new `releases/<sha>-<UTC stamp>` directory (test `deploy builds every release in a new directory, even for the same commit`, which failed first, then passed). | Found while planning the secrets step. Redeploying the live commit (needed after changing `NEXT_PUBLIC_*` values) would have rebuilt *inside the live release*, and a failed build would have broken the running site. | None. Uses a little more disk; old releases are pruned to 3. |
| 16 | 6 | Run `deploy.sh` from `/srv/career-platform/repo`. | Before each deploy, fast-forward the clone: `sudo -u career-platform git -C /srv/career-platform/repo pull --ff-only`. | `deploy.sh` runs from the clone's working copy, and `git fetch` (which the script does) doesn't update that copy, so changes to `deploy.sh` don't reach the server otherwise. | Running an old `deploy.sh`. Task 9's `docs/operations.md` must include this step. |
| 17 | 7 | Change only the `@` record in Cloudflare. | Added an extra record, `aws.nickchabot.com` (A → `<EIP>`, DNS only, comment "career-platform EC2 Elastic IP (AWS migration)"). `@` is unchanged and still points at Railway. | The owner asked for it, via the Cloudflare CLI (`cf` 0.15). | None. nginx answers it with 404 (only `server_name nickchabot.com` serves the site), so it doesn't expose the site under a second name. Remove it with `cf dns records delete` if it isn't needed after the switch. |
| 18 | 7 | Certbot for `nickchabot.com` after the DNS switch; nginx serves only `server_name nickchabot.com`. | Certificate issued **first for `aws.nickchabot.com`** (owner's request), with `--redirect`. `aws.nickchabot.com` added to the site's `server_name` (test `nginx also serves the aws.nickchabot.com preview name`, which failed first, then passed). | The owner wanted HTTPS checked on the server before the switch. | At the switch, expand the same certificate instead of issuing a new one: `sudo certbot --nginx --cert-name aws.nickchabot.com --expand -d aws.nickchabot.com -d nickchabot.com --redirect`. Until then, `nickchabot.com` over HTTP **on this server** gets 404 (Certbot's port-80 block only redirects `aws`). Harmless while DNS points at Railway. |
| 19 | 1/7 | Bare IP and unknown hostnames get 404 (Review Focus). | Added a default HTTPS server with `ssl_reject_handshake on` (test `nginx refuses HTTPS for a bare IP or unknown hostname`, which failed first, then passed). Inserted into the live config next to Certbot's edits, after a backup and `nginx -t`. | Once Certbot added a 443 block, `https://<EIP>/` served **the site (200)**: nginx falls back to its only TLS server. | None. HTTPS by IP or another name now fails the TLS handshake (curl exit 35). |
| 20 | 7 | `certbot … -m <OWNER_EMAIL>`. | `--register-unsafely-without-email`. | `OWNER_EMAIL` isn't set yet, and Let's Encrypt stopped sending expiry emails in 2025, so an address adds nothing. It also keeps the owner's email from going to a third party without asking. | No account-recovery contact at Let's Encrypt. Add one with `certbot update_account -m …` if wanted. |
| 21 | 7 | Before the switch: a fresh Railway backup, restored into RDS from the instance, with row counts compared (owner's request). | **Not taken.** The owner chose to keep the 2026-10-29 dump. | Railway's Postgres was still shut down (rechecked 2026-11-10: no running deployment, last log "database system is shut down" from 2026-11-08, connections dropped). A fresh dump would need Railway's service redeployed, which is a Railway change. Nothing could write to it after 10/29: the web service has been FAILED since 10/26. | Low. Only rows written to Railway by hand after 10/29 would be missing. RDS matches the 10/29 dump in every table (Step 10, 2.1), and Railway's volume still exists if a check is ever needed. |
| 22 | 7 | Step 2: the owner changes the Cloudflare `@` record in the dashboard. | Changed with the Cloudflare CLI (`cf dns records update`, an in-place PUT from CNAME to A), at the owner's request. Snapshot of all records first (copy in `~/backups/career-platform/`), then a dry run. | The owner asked. | None. A before/after diff shows only `@` changed. Undo: `cf dns records update <id>` back to `CNAME l3la2mgf.up.railway.app`. |
| 23 | 7 | Steps 1 and 5 (Supabase URL settings, magic-link sign-in, contact email) happen during the switch. | The switch happened **with the Supabase, Resend and email values still empty** (#11). The owner chose to go live first and fill them in after. | nickchabot.com was showing Railway's 404, so the public site going live was strictly better. | `/admin` is 500, and contact messages save with no email alert until the values are filled in and redeployed, and Supabase's Site URL and redirect list are checked. |

## Log

### 2026-11-10

- **Task 0:**
  - Step 2: credentials work (`isba-student`).
  - Step 4: both database passwords generated into `~/.config/career-platform/` (mode 600).
  - Step 5: Railway untouched; its last deployment is still FAILED.
  - Steps 1 and 3 are open: the instructor's answers and the app secrets.
- **Task 2:**
  - Security groups created:
    - `career-platform-web`: 80 and 443 from anywhere (IPv4 and IPv6), 22 from `<LAPTOP_IP>/32`.
    - `career-platform-db`: 5432 from `career-platform-web` only.
  - Key pair `career-platform`: ed25519, generated on the laptop, with only the public half uploaded. The fingerprints match.
- **Task 3:**
  - DB subnet group `career-platform` covers all 6 default subnets.
  - RDS `career-platform` is available: db.t4g.micro, PostgreSQL 18.6, Single-AZ in `us-east-1a`, not public, encrypted 20 GB gp3, deletion protection on, `default.postgres18` with `rds.force_ssl = 1`, CA `rds-ca-rsa2048-g1`.
  - The server reaches port 5432. The laptop times out, as intended.
- **Task 4:**
  - Dry run passed.
  - EC2 `career-platform` is running: t3.micro, Ubuntu 24.04.5 (x86_64), `us-east-1a`, IMDSv2 required, standard CPU credits, 20 GB encrypted gp3. An Elastic IP is attached.
  - The SSH host key was verified against the instance's console output. ED25519 is `SHA256:ioWCyxP3cWtJn42JXqkZaHs5xGt7MNZsPimQnn09NPc`, matching the console, `ssh-keyscan` and `known_hosts`.
- **Task 1:** deploy files and 5 tests written test-first (5 failed for the right reason, then passed). Suite 115/115, lint and typecheck clean. Commit `0cc6ec3`, branch pushed; Railway didn't deploy it (it builds only `main`).
- **Task 5:**
  - Steps 1–3:
    - `apt upgrade` done; unattended-upgrades enabled.
    - 2 GiB swap, kept across reboots.
    - journald keeps logs 14 days; nginx's logrotate keeps 14.
    - Installed Node v24.22.2, pnpm 11.24.0, PostgreSQL 18.6 client, nginx 1.24, Certbot 2.9, and the RDS CA bundle (114 certificates).
  - Step 4:
    - System user `career-platform` with `/srv/career-platform` (mode 750), plus `repo/` (a clone), `releases/` and `shared/` (700).
    - `shared/.env` and `shared/migrate.env` are mode 600.
  - Steps 5–6:
    - Dump checksum OK; RDS was empty before the restore; `pg_restore --exit-on-error` OK; the `career_platform_app` role was created.
    - **Fingerprint: all 14 tables identical** to Railway's: `profile` 1, `project` 1, `education` 2, `experience` 2, `skill` 5, migrations 2, everything else 0.
    - TLS: `sslmode=disable` is refused ("no pg_hba.conf entry … no encryption"); the admin session uses TLSv1.3.
    - App role: reads rows and can update them (rolled back); `create table` gives "permission denied for schema public"; not superuser, can't create roles or databases.
- **Task 6, Step 1:** unit installed and enabled for `@8000` and `@8001` (`systemd-analyze verify` clean). The nginx site is installed, the default site removed, `nginx -t` OK, and nginx reloaded and enabled.
- **Task 6, Step 2:** first deploy of `feat/aws-ec2-rds` (`0cc6ec3`) succeeded in 483 s: build OK, `Migrations applied.` (nothing new), both copies restarted and healthy. No out-of-memory kills; swap peaked around 65 MiB.
- **Task 6, Step 3:**
  - On the server:
    - Both copies answer `{"status":"ok"}`, listen on `127.0.0.1` only, and run as `career-platform`, with 0 restarts.
    - postgres.js (deviation #10): with `NODE_EXTRA_CA_CERTS` it connects as `career_platform_app` with `ssl true`; **without it, `SELF_SIGNED_CERT_IN_CHAIN`**. The certificate really is verified.
  - From the laptop:
    - `Host: nickchabot.com` gives health ok and the site title. A bare IP and `Host: example.com` both get **404**.
    - `/privacy`, `/login`, `/projects/soccer-data-analytics-pipeline` and `/sitemap.xml` return 200.
    - `/resume` returns 404, expected: no resume is uploaded (`stored_file` is empty).
    - `/admin` returns **500**, expected until the Supabase values are filled in (journal: "Missing Supabase environment variables"; deviation #11).
- **Task 6, Step 4 (rollback drill):** deployed `drill/broken-build` (a type error in `lib/site-url.ts`).
  - It failed after 510 s with TS2322 ("Failed to type check"), not memory, and **no migrations ran**.
  - `current` stayed on `0cc6ec3`; both copies stayed healthy with 0 restarts.
  - The drill's release directory and the branch (local and GitHub) were removed afterwards.
- **Records check:** row counts and every row of `profile`, `project`, `education`, `experience` and `skill` in RDS are byte-identical to the 10/29 backup file. Migrations: 2, same hashes.
- **Cloudflare (owner's request):** added `aws.nickchabot.com` A → `<EIP>`, DNS only, with a dry run first. A before/after diff of all records: 10 → 11, **1 added, 0 removed, 0 changed** (every existing record's `modified_on` is unchanged). Resolves to the Elastic IP on 1.1.1.1 and 8.8.8.8. `http://aws.nickchabot.com/api/health` gives 404 from nginx's default server, as designed.
- **HTTPS for `aws.nickchabot.com` (owner's request):**
  - Certificate:
    - Staging dry run OK, then one real request. Let's Encrypt (issuer YE1) issued it; SAN `aws.nickchabot.com`; valid 2026-11-10 → **2027-02-08**; verifies from the laptop (`Verify return code: 0`).
    - Certbot changed the site block to `listen 443 ssl` and added a port-80 block that 301s `aws.nickchabot.com`.
  - Behaviour:
    - `http://aws.nickchabot.com/some/path?x=1` gives **301** → `https://aws.nickchabot.com/some/path?x=1`.
    - HTTPS health ok, page title correct, HSTS header present.
    - Bare IP: HTTP 404, HTTPS handshake refused.
    - `Host: example.com`: HTTP 404, HTTPS refused.
  - Renewal:
    - `certbot.timer` is enabled and active.
    - The first `certbot renew --dry-run` **failed** (`malformed :: Unable to update challenge`). It ran while nginx was being edited, right after a staging authorization for the same name. Two later attempts sat in Certbot's random pre-renewal delay (up to about 10 min) and hit the command timeout.
    - Rerun with `--no-random-sleep-on-renew`: **"all simulated renewals succeeded"**.
- **Testing at `https://aws.nickchabot.com`** (owner's request):
  - **HTTP:**
    - `/`, `/privacy`, `/login`, `/projects/soccer-data-analytics-pipeline`, `/sitemap.xml`, `/robots.txt`, `/api/health` and `/favicon.ico` return 200, in 0.27–0.50 s.
    - Unknown pages return 404.
    - Expected failures: `/resume` 404 (nothing uploaded) and `/admin` 500 (Supabase not configured, #11).
    - Security headers are all present (X-Frame-Options, CSP `frame-ancestors`, Referrer-Policy, nosniff, Permissions-Policy, HSTS). `X-Robots-Tag: noindex` is on `/login` and `/api/*`.
    - Database content renders: name, education, experience, project and skills.
    - Canonical URL and sitemap use `https://nickchabot.com`, so the preview name isn't indexed as a duplicate.
  - **Links:** all 18 internal links and assets return 200. The GitHub project link returns 200; LinkedIn returns 999, its bot block.
  - **Contact form:**
    - Bad JSON gives 400; an invalid form gives 422 with field errors, and nothing is saved.
    - One valid test message gave **202** ("saved, email alert failed", since Resend isn't configured). The row was confirmed in RDS (`notification_status = failed`), then **deleted** by id; `contact_message` is back to 0 rows.
    - It used 2 of this network's 5 contact-form attempts per hour on whichever copy served them.
  - **Browser (Playwright + axe, read-only, run from the git-ignored `.superpowers/`):** home, project, login and privacy pages render with **no console errors** and **no serious or critical accessibility violations**; the contact form's 4 fields are labelled.
  - **Resilience:** with `career-platform@8000` stopped, 20 of 20 requests returned 200 (nginx retried on `@8001`). `@8000` was healthy 2 s after starting again.
  - **Server:** about 490 MiB memory available, 122 MiB swap used, low load.
  - **Logs:** no unexpected application errors. Requests from internet scanners show up as "Server Reference ID did not match" (Railway's logs had the same).
  - **Not tested yet** (needs the owner's secrets): magic-link sign-in and `/admin`, contact-form email delivery, resume upload and download.
  - **Possible hardening (not done):** `Server: nginx/1.24.0 (Ubuntu)` and `X-Powered-By: Next.js` reveal software versions. Fix with `server_tokens off;` in nginx and `poweredByHeader: false` in `next.config.ts`.

## Step 10: Verification on `aws.nickchabot.com` (2026-11-10, 20:10–20:25 UTC)

Status key: **Pass**, **Fail**, **Blocked** (waits on something still open), **N/A** (the check assumes something that isn't true here). Every result below was observed during this run.

| # | Check | Expected | Actual result | Status |
|---|---|---|---|---|
| 1.1 | `nslookup aws.nickchabot.com` | The Elastic IP | Resolves to the Elastic IP (1.1.1.1 and 8.8.8.8 agree) | Pass |
| 1.2 | `curl -I http://aws.nickchabot.com` | 301 to `https://` | `301 Moved Permanently`, `Location: https://aws.nickchabot.com/`; path and query string are kept | Pass |
| 1.3 | `curl -I https://aws.nickchabot.com` | 200 | `200 OK`, with HSTS `max-age=31536000; includeSubDomains` | Pass |
| 1.4 | Certificate issuer and expiry | Let's Encrypt; a future expiry | Issuer `Let's Encrypt, CN=YE1`; subject `aws.nickchabot.com`; expires **2027-02-08 19:03 UTC**; `openssl` verify code 0. **Browser:** Chrome's site-info panel for `aws.nickchabot.com` reads "Connection is secure" with the site loaded ([screenshot](docs/evidence/aws-https-padlock.png), owner, 2026-11-10 12:22 PT). The screenshot shows the padlock, not the issuer or expiry; those come from `openssl` above. | Pass |
| 1.5 | `sudo certbot renew --dry-run` | Simulated renewal succeeds | "all simulated renewals succeeded"; `certbot.timer` enabled and active. Needs `--no-random-sleep-on-renew` to avoid a wait of up to 10 min. | Pass |
| 2.1 | Row counts, RDS vs the Step 2 (10/29) restore | Same count per table | All 14 tables match: `profile` 1, `project` 1, `education` 2, `experience` 2, `skill` 5, migrations 2, 8 others 0. The per-row hash also matches for every table. | Pass |
| 2.2 | Specific records to check | Recognisable records | `profile`: Nicholas Chabot, Los Angeles, CA. `project`: Soccer Data Analytics Pipeline (`soccer-data-analytics-pipeline`, published). `experience`: Pioneer Circuits, AI Knowledge Base Development Intern; USAV, Volleyball Official. `skill`: Excel, SQL Database, Python, Copilot and Claude Code, Git and GitHub. All are shown on `https://aws.nickchabot.com/`. Earlier today every row of these 5 tables was byte-identical to the backup file. | Pass |
| 2.3 | Same pages side by side on `nickchabot.com` (Railway) | Content matches | **Not possible.** `nickchabot.com` returns Railway's 404 "Application not found" (down since 2026-10-26), and Railway's database was shut down on 2026-11-08. The 10/29 backup stands in as the reference (2.1, 2.2). | N/A |
| 3.1 | Every main page loads | 200, no errors | `/`, `/privacy`, `/login`, `/projects/soccer-data-analytics-pipeline` and `/api/health` return 200. Playwright: no console errors, no serious or critical axe violations, contact fields labelled. All 18 internal links and assets return 200. | Pass |
| 3.2 | Login works | Magic-link sign-in reaches `/admin` | `/admin` returns **500**: "Missing Supabase environment variables". | Blocked: Supabase values (#11) |
| 3.3 | A write to the database, with a fake record deleted afterwards | Saved, then removed | Contact form: bad JSON gives 400 and an invalid form gives 422, with nothing saved. A valid "AWS smoke test" message gave 202 and was found in RDS by its id, then deleted (`contact_message` back to 0). Profile edits and new entries need `/admin`. | Pass (contact form); Blocked (admin edits) |
| 3.4 | Uploaded files display | Resume and documents served | `/resume` returns 404: nothing is uploaded (`stored_file` 0 rows, as on Railway). An upload needs `/admin`. | Blocked: needs 3.2 |
| 3.5 | External APIs and email | Alerts sent | Resend isn't configured: the message is saved with `notification_status = failed` (handled gracefully, 202). Supabase isn't configured either (3.2). The GA tag script is referenced on the page. | Blocked: Resend and Supabase values (#11) |
| 4.1 | `nc -vz -w 5 <rds-endpoint> 5432` from the laptop | Hangs or fails | `Operation timed out`. The endpoint resolves to a private 172.31.x.x address, and `PubliclyAccessible: False`. | Pass |
| 4.2 | Inbound security group rules | 22 from the owner's IP only; 80 and 443 public; no app port; no public 5432 | `career-platform-web`: 22 from `<LAPTOP_IP>/32` (the current laptop IP); 80 and 443 from `0.0.0.0/0` and `::/0`. `career-platform-db`: 5432 from security group `career-platform-web` only. The server listens publicly on 22, 80 and 443 only; the app is on `127.0.0.1:8000/8001`. | Pass |
| 4.3 | No passwords, keys, `.env` files or dumps tracked in Git | None | The only tracked `.env*` is `.env.example` (placeholders: `localhost`, `postgres:postgres`). No `.env`, `.dump`, `.pem` or key file was ever committed. None of the 4 real secrets (both RDS passwords, Railway's Postgres password, the URL password in the local `.env`) appears in any commit. Branch commits contain no AWS keys, private keys, Resend or Supabase tokens, credentialed URLs, account ID or RDS endpoint; the only hits were `127.0.0.1`, the resolvers, and the public CA URL `truststore.pki.rds.amazonaws.com`. `.env` and `.superpowers/` are ignored. | Pass |
| 5 | Reboot, then the site returns on its own | Back without help | `aws ec2 reboot-instances` at 20:20:10Z; the boot time changed from 19:20:04 to 20:20:22. HTTPS health returned 200 again **25 s** after the request. nginx, both app copies, `certbot.timer` and unattended-upgrades are enabled and active; swap is on; both copies logged "Ready" in this boot. | Pass |
| 6.1 | `nickchabot.com` still loads from Railway | Railway serves the site | Still served by Railway's edge (`server: railway-hikari`) at the same address as before, but the response is **404 "Application not found"**, as it was before this migration began. Nothing on Railway was changed: web service still FAILED (last deployment 2026-10-26, REMOVED), Postgres stopped on 2026-11-08. | Unchanged (was already down) |
| 6.2 | Cloudflare records other than `aws` unchanged | No changes | A diff against the snapshot taken before `aws` was added shows 10 → 11 records: **1 added (`aws`, A, DNS only), 0 removed, 0 changed**; every other record's `modified_on` is the same. | Pass |

**Summary:** 14 Pass, 4 Blocked, 1 N/A, 1 Unchanged, 0 Fail (3.3 counts once as Pass and once as Blocked). Every Blocked row waits on the Supabase and Resend values in `shared/.env` (deviation #11). Fill them in, redeploy, then rerun 3.2–3.5.

## Cutover: nickchabot.com → AWS (2026-11-10, 20:27 UTC)

- **DNS:** Cloudflare `@` changed from `CNAME l3la2mgf.up.railway.app` to `A <EIP>` (DNS only, TTL Auto) at **20:27:28 UTC**. A full before/after diff: 11 → 11 records, **1 changed (`@`), 0 added, 0 removed**. `www`, MX, SPF, DKIM, DMARC, Zoho, `_railway-verify` and `aws` are unchanged. Cloudflare's authoritative nameservers and 8.8.8.8 returned the new address within about 10 s; 1.1.1.1 served the cached CNAME for a few minutes (TTL).
- **Certificate:** staging dry run OK, then **one** real `certbot --nginx --cert-name aws.nickchabot.com --expand -d aws.nickchabot.com -d nickchabot.com --redirect`. SAN is now `aws.nickchabot.com, nickchabot.com`; issuer Let's Encrypt YE1; expires 2027-02-08 19:29 UTC; verifies for `nickchabot.com` (code 0). Certbot added the `nickchabot.com` → HTTPS redirect. The nginx config before it is saved at `/etc/nginx/sites-available/career-platform.pre-cutover`.
- **Checks (from the laptop, normal DNS):**
  - Redirects: `http://nickchabot.com/projects/…?x=1` gives **301** to the same HTTPS URL. `https://www.nickchabot.com/` gives **301** to `https://nickchabot.com/` (Cloudflare redirect, unchanged).
  - HTTPS: `/api/health` returns `{"status":"ok"}`; `/` returns 200 with HSTS and the correct title; `/privacy`, `/login`, the project page, `/sitemap.xml` and `/robots.txt` return 200.
  - Expected failures: `/admin` 500 and `/resume` 404 (#23, #11).
  - `/auth/callback` without a code redirects to `https://nickchabot.com/login?error=callback`, so it stays on the domain.
  - `aws.nickchabot.com` still works. The bare IP's HTTPS is refused (curl exit 35).
  - `certbot renew --dry-run` covers both names: "all simulated renewals succeeded".
- **Task 8, Step 3:** RDS snapshot `career-platform-after-cutover` is **available** (created 20:29:04 UTC, 20 GB, encrypted, 18.6).
- **Still open:**
  - Task 7, Step 1 (Supabase Site URL and redirect `https://nickchabot.com/auth/callback`) and the secrets (#11); then rerun Step 10 rows 3.2–3.5.
  - Task 7, Step 5 browser checks by the owner: padlock on `nickchabot.com`, sign-in, contact email, a 9–10 MiB resume upload.
  - Task 8, Step 2: an uptime monitor on `https://nickchabot.com/api/health` (owner).
  - Task 9: no sooner than 2026-11-13 (≥3 days of clean uptime).
