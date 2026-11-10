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
