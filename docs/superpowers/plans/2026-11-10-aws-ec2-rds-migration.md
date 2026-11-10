# Move to AWS (EC2 + RDS) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** https://nickchabot.com is served from one EC2 t3.micro running the Next.js app, with all data in a Single-AZ RDS PostgreSQL 18 database. Railway is retired.

**Architecture:** nginx on the EC2 instance terminates HTTPS (Certbot) and forwards to two copies of `next start`, the systemd units `career-platform@8000` and `@8001`. They run as the unprivileged user `career-platform` from `/srv/career-platform/current`, a symlink to the active release. A tracked deploy script builds each release in its own directory and only then migrates, switches the symlink and restarts the copies one at a time; it rolls back if a health check fails. RDS sits in the default VPC with no public access. Only the instance's security group can reach it, and every connection is TLS with the certificate verified (`sslmode=verify-full`, plus Amazon's CA bundle through `NODE_EXTRA_CA_CERTS`). The app connects as a role that can only read and write rows; migrations use the admin role.

**Tech Stack:** AWS CLI 2.39 (profile `isba-4775`), EC2 (Ubuntu 24.04 x86_64), RDS PostgreSQL 18.6, nginx, Certbot, systemd, Node.js 24, pnpm 11.24.0, Next.js 16.3.7, postgres.js 3.4, Drizzle, Cloudflare DNS, Railway CLI (final dump only), Docker (laptop-side `pg_dump`).

**Spec:** No separate spec file. The requirements come from the user's decisions in the "aws-migration" session, 2026-10-29 to 2026-11-10:
- EC2 + RDS, chosen to learn server operations without managing the database.
- `career-platform` names and the domain `nickchabot.com`.
- A t3.micro, built on the server.
- The site stays down until AWS is live, with no Railway changes before then.
- Work on a new branch so Railway doesn't redeploy from `main`.
- Create nothing until the plan is approved.

The other recommendations, accepted by default, cover secrets, a separate database login for the app, Certbot after the DNS switch, SSH access and monitoring.

## What exists today (checked 2026-11-10)

| | |
|---|---|
| Site | **Down.** nickchabot.com answers Railway's 404 "Application not found". The web service's latest deployment is FAILED (`Missing Supabase environment variables`), and its certificate is now valid. |
| Data | Railway Postgres 18 holds: `profile` 1, `project` 1, `education` 2, `experience` 2, `skill` 5, and `drizzle.__drizzle_migrations` 2. Every other table has 0 rows, including `stored_file`. A restore-tested dump from 2026-10-29 is in `~/backups/career-platform/`. |
| Secrets | **None are known anywhere.** The laptop `.env` has only `RAILWAY_DATABASE_URL` and the GA ID. Supabase URL, anon key and Resend key must come from their dashboards. |
| DNS | Cloudflare. `@` is a CNAME to Railway (DNS only). `www` is **proxied by Cloudflare**, which itself answers 301 → `https://nickchabot.com/`. MX records are Zoho. |
| AWS account | User `isba-student`, `us-east-1`, default VPC only, no EC2 or RDS resources. Policy `ISBA4775EC2Migration` denies `RunInstances` except for **t3.micro / t3.small**. Dry runs pass for security groups and Elastic IPs. IAM, budgets, Free Tier, pricing, Secrets Manager listing and S3 listing are all denied. RDS can't be dry-run. |
| Laptop tools | AWS CLI 2.39.3, Railway CLI 5.71 (`railway connect --tunnel-only` works without the public proxy), Docker. There's no local `psql`/`pg_dump`, so steps use the `postgres:18` image. |
| Repo | Public. `railway.json` and `tests/unit/deploy-does-not-seed.test.ts` reference Railway's pre-deploy command. The privacy page still names **Microsoft Azure** and has two `[CONFIRM: …]` placeholders. |

## Global Constraints

- **Create nothing on AWS until Task 0's gates pass, and confirm with the user before each step marked ⚠ (it creates a billed or public resource).**
- AWS commands run from the laptop with `export AWS_PROFILE=isba-4775 AWS_REGION=us-east-1` set first. zsh doesn't word-split option strings, so don't put options in a variable.
- Names: EC2 `Name` tag, key pair, Elastic IP tag, RDS identifier and subnet group are all `career-platform`. Security groups are `career-platform-web` and `career-platform-db`. Linux user is `career-platform`. Database is `career_platform`, with roles `career_platform_admin` (owner, migrations) and `career_platform_app` (the site). Every AWS resource also gets the tag `Project=career-platform`.
- The domain is `nickchabot.com` only. `www` stays a Cloudflare-proxied redirect. Change only the `@` record; never touch MX, TXT (SPF/DKIM/DMARC, Resend) or `_railway-verify` until Task 9.
- EC2 instance: `t3.micro`, Ubuntu 24.04 x86_64, CPU credits **standard** (no surplus charges), IMDSv2 required, 20 GB gp3 encrypted root volume.
- RDS: PostgreSQL `18.6`, `db.t4g.micro` (or `db.t3.micro` if the instructor allows only t3), Single-AZ, 20 GB gp3, encrypted, **not publicly accessible**, 7-day automated backups, deletion protection on.
- Every app connection uses `sslmode=verify-full`, with `NODE_EXTRA_CA_CERTS=/etc/ssl/rds/global-bundle.pem`. Never use `sslmode=require`: postgres.js then encrypts without checking the certificate.
- The app process never sees the admin password. It lives only in `/srv/career-platform/shared/migrate.env` (mode 600), which only `deploy.sh` reads.
- Every `pnpm build` on the server runs with `NODE_OPTIONS=--max-old-space-size=1536`.
- No changes on Railway until Task 9, and only with the user's approval. Don't merge to `main` until Railway can no longer deploy it.
- This repo is public. Tracked files use placeholders (`<EIP>`, `<RDS_ENDPOINT>`, `<LAPTOP_IP>`, `<ACCOUNT_ID>`) instead of real addresses, endpoints, the account ID or any password.
- Deploys never seed data (existing rule, enforced by `tests/unit/deploy-does-not-seed.test.ts`). The only rows in RDS come from the Railway dump.
- Local-only state (never committed) lives in `~/.config/career-platform/` (mode 700): `aws-ids.env`, `rds-admin-password`, `rds-app-password`.

## Review Focus

- **TLS that encrypts but doesn't verify:** `sslmode=require` would connect fine and look correct. With `verify-full` and no CA bundle, the site must fail to connect, not quietly fall back. Task 5, Step 6 checks both directions.
- **A visitor sending their own `X-Real-IP` to dodge the contact-form limit:** nginx must overwrite it with `$remote_addr` (`clientIp` trusts it first). This is pinned by the Task 1 nginx test.
- **A deploy that fails halfway on a 1 GiB machine:** a build killed for lack of memory or a copy failing its health check must leave the previous release serving. Task 1's test pins the order (build → migrate → switch → restart), and Task 6, Step 4 is a rollback drill.
- **A request by bare IP or another hostname:** it must get 404, not the site, as on Azure. This is pinned by the Task 1 nginx test and checked in Task 7.
- **10 MiB resume upload:** nginx's default limit is 1 MiB, and `next.config.ts` allows 11 MB. This is pinned by the Task 1 nginx test and checked by hand in Task 7.

---

**Where things run:** *Laptop* = your Mac's Terminal (with the AWS variables exported). *Server* = after `ssh -i ~/.ssh/career-platform ubuntu@<EIP>`. *Console* = a web dashboard (AWS, Cloudflare, Supabase, Resend).

### Task 0: Gates and inputs (nothing is created)

- [ ] **Step 1: Instructor answers.** Record them here before going on: allowed RDS class (`db.t4g.micro` or `db.t3.micro`), spending limit and who sees the bill, when access ends, and whether CloudWatch alarms are allowed. **Stop if RDS isn't allowed.**
- [ ] **Step 2: Credentials.** *Laptop:* `aws sts get-caller-identity` → `arn:aws:iam::<ACCOUNT_ID>:user/isba-student`. If it fails, run `aws login --profile isba-4775` in another terminal.
- [ ] **Step 3: Secrets in hand** (the user fetches these; keep them out of chat):
  - Supabase: Project Settings → API gives `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
  - Resend: create a new API key for `RESEND_API_KEY`.
  - `OWNER_EMAIL`, `CONTACT_NOTIFICATION_EMAIL`, and `CONTACT_FROM_EMAIL` (on the verified Resend domain).
  - `NEXT_PUBLIC_GA_MEASUREMENT_ID` comes from the laptop `.env`.
  - Generate `RATE_LIMIT_SECRET` with `openssl rand -hex 32`.
- [ ] **Step 4: Local state folder.** *Laptop:* `mkdir -p ~/.config/career-platform && chmod 700 ~/.config/career-platform`, then generate the two database passwords into it: `openssl rand -hex 24 > …/rds-admin-password` and `openssl rand -hex 24 > …/rds-app-password`, both `chmod 600`. Hex keeps them URL-safe.
- [ ] **Step 5: Railway is unchanged.** *Laptop:* `railway status --json` still shows `career-platform` FAILED. Don't fix or redeploy it.

### Task 1: Deploy files, tested (repo only)

**Files:**
- Create: `deploy/aws/career-platform@.service`, `deploy/aws/nginx-career-platform.conf`, `deploy/aws/deploy.sh` (mode 755), `deploy/aws/app-role.sql`, `scripts/db-fingerprint.sql`
- Test: `tests/unit/aws-deploy-config.test.ts` (`// @vitest-environment node`, reads files like `deploy-does-not-seed.test.ts`)

**Interfaces:**
- Produces:
  - `sudo /srv/career-platform/repo/deploy/aws/deploy.sh <git-ref>` (used in Tasks 6–9).
  - `psql -v app_password=… -f deploy/aws/app-role.sql` (Task 5).
  - `psql -qAt -F' | ' -f scripts/db-fingerprint.sql` prints one line per table, `schema.table | rows | md5`, sorted (Task 5).
- Server layout every file assumes:
  - `/srv/career-platform/repo`: clone of `https://github.com/nchabot14/career-platform`
  - `releases/<sha>/`: one directory per release
  - `current`: symlink to the live release
  - `shared/.env`: app settings, symlinked into each release
  - `shared/migrate.env`: admin `DATABASE_URL`, read only by `deploy.sh`
  - All of it is owned by the user `career-platform`.

- [ ] **Step 1: Write the failing tests** in `tests/unit/aws-deploy-config.test.ts`:
  - `systemd unit runs the app unprivileged on loopback`: the file contains `User=career-platform`, `WorkingDirectory=/srv/career-platform/current`, `Environment=NODE_EXTRA_CA_CERTS=/etc/ssl/rds/global-bundle.pem`, `Restart=always` and `next start -H 127.0.0.1 -p %i`, and doesn't match `/EnvironmentFile=.*migrate\.env/`.
  - `nginx overwrites client IP headers and serves only nickchabot.com`: contains `proxy_set_header X-Real-IP $remote_addr;`, `proxy_set_header X-Forwarded-For $remote_addr;`, `client_max_body_size 11m;`, `server_name nickchabot.com;`, `server 127.0.0.1:8000` and `server 127.0.0.1:8001`. Its `default_server` block contains `return 404;`. No `$proxy_add_x_forwarded_for`.
  - `deploy builds before it migrates, and migrates before it switches`: in `deploy.sh`, `indexOf("pnpm build") < indexOf("scripts/migrate.mjs") < indexOf("ln -sfn")`. Also contains `set -euo pipefail`, `NODE_OPTIONS=--max-old-space-size=1536`, `pnpm install --frozen-lockfile`, `migrate.env` and `/api/health`. Doesn't match `/seed|prepare-database|copy-sqlite/i`. `bash -n deploy/aws/deploy.sh` exits 0 (`execFileSync`).
  - `app role can only read and write rows`: `app-role.sql` contains `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO career_platform_app` and `ALTER DEFAULT PRIVILEGES FOR ROLE career_platform_admin`. Doesn't match `/SUPERUSER|CREATEDB|CREATEROLE|ALL PRIVILEGES|GRANT CREATE/i`.
  - `fingerprint skips temporary schemas`: `db-fingerprint.sql` matches `/pg_temp/` inside a `NOT LIKE` filter. (The 2026-10-29 restore test showed its own temp table as a false difference.)
- [ ] **Step 2: Run** `pnpm test tests/unit/aws-deploy-config.test.ts`. Expected: FAIL (files missing).
- [ ] **Step 3: Write the five files.**
  - **Unit:** the Azure template from `docs/superpowers/plans/2026-10-01-operate-the-vm.md` Task 3, with `User`/`Group=career-platform`, the new `WorkingDirectory`, the CA variable, `After=network-online.target`/`Wants=network-online.target`, and hardening: `NoNewPrivileges=true`, `ProtectSystem=strict`, `ReadWritePaths=/srv/career-platform`, `PrivateTmp=true`. `next start` reads `.env` from the working directory, so no `EnvironmentFile`.
  - **nginx:** Azure Task 4's upstream and `location /`, split into a `listen 80 default_server; server_name _; return 404;` block and a `server_name nickchabot.com;` block with `client_max_body_size 11m;`. Certbot adds the 443 parts in Task 7.
  - **`deploy.sh`:** must run as root, takes one argument (the ref, default `main`), and runs every non-systemctl command with `runuser -u career-platform --`. In order:
    1. `git -C repo fetch --prune origin` and resolve `origin/<ref>` to a sha.
    2. `git worktree add --detach releases/<sha>` (reused if it exists).
    3. Symlink `shared/.env` into it.
    4. `pnpm install --frozen-lockfile`.
    5. `NODE_OPTIONS=--max-old-space-size=1536 pnpm build`. On failure, exit 1 with `current` untouched.
    6. `node scripts/migrate.mjs` with `shared/migrate.env` and `NODE_EXTRA_CA_CERTS` loaded in a subshell.
    7. Remember the old `current` target, then `ln -sfn releases/<sha> current.tmp && mv -T current.tmp current`.
    8. For 8000, then 8001: `systemctl restart career-platform@<port>`, then poll `curl -fsS http://127.0.0.1:<port>/api/health` for up to 60 s. On failure, point `current` back at the old target, restart both ports and exit 1. Migrations already applied stay applied, so a migration must keep working with the previous release's code (add columns and tables; drop them only in a later release).
    9. Remove releases beyond the newest 3, never `current` or the old target (`git worktree remove --force`).
    10. Print the deployed sha.
  - **`app-role.sql`:** `CREATE ROLE career_platform_app LOGIN PASSWORD :'app_password';`, then `GRANT CONNECT` on the database, `USAGE` on `public`, the row grant above, `USAGE, SELECT ON ALL SEQUENCES`, and two `ALTER DEFAULT PRIVILEGES FOR ROLE career_platform_admin IN SCHEMA public …` lines (tables and sequences) so future migrations' tables are covered. It also grants `USAGE` on schema `drizzle` and `SELECT` on its tables (read-only).
  - **`db-fingerprint.sql`:** the 2026-10-29 script: a `DO` block that writes `count(*)` and the `md5` of `string_agg(t::text, E'\n' ORDER BY t::text)` per table into a temp table, then selects it. It loops over `pg_tables` where `schemaname NOT IN ('pg_catalog','information_schema') AND schemaname NOT LIKE 'pg_temp%'`.
- [ ] **Step 4: Run** `pnpm test`. Expected: all pass, the 5 new tests included.
- [ ] **Step 5: Lint, typecheck, commit.** Run `pnpm lint && pnpm typecheck`, then `git add deploy/aws scripts/db-fingerprint.sql tests/unit/aws-deploy-config.test.ts`, then `git commit -m "feat: add EC2 deploy files for the AWS move"`, then `git push -u origin feat/aws-ec2-rds`. Railway only builds `main`. Run `railway status --json` afterwards to confirm no new deployment started.

### Task 2: Network and access ⚠

**Interfaces:** Produces `KEY_NAME`, `WEB_SG`, `DB_SG`, `SUBNET_ID` and `AZ` in `~/.config/career-platform/aws-ids.env` (one `NAME=value` line each; later tasks `source` it).

- [ ] **Step 1: Key pair, with the private key never leaving the laptop.** *Laptop:* `ssh-keygen -t ed25519 -f ~/.ssh/career-platform -C career-platform -N ''`, then `aws ec2 import-key-pair --key-name career-platform --public-key-material fileb://~/.ssh/career-platform.pub --tag-specifications 'ResourceType=key-pair,Tags=[{Key=Project,Value=career-platform}]'`.
- [ ] **Step 2: Pick the subnet.** Use the default VPC's default subnet in `us-east-1a`: `aws ec2 describe-subnets --filters Name=default-for-az,Values=true Name=availability-zone,Values=us-east-1a --query 'Subnets[0].SubnetId' --output text`. Save `SUBNET_ID` and `AZ=us-east-1a`.
- [ ] **Step 3: `career-platform-web`.** Create it in the default VPC (tagged). Allow inbound TCP 80 and 443 from `0.0.0.0/0` and `::/0`, and TCP 22 from `<LAPTOP_IP>/32` only (`curl -4 -s https://ifconfig.me`). Save `WEB_SG`.
- [ ] **Step 4: `career-platform-db`.** Create it (tagged), with one inbound rule: TCP 5432 with `--source-group $WEB_SG`. No CIDR rules. Save `DB_SG`.
- [ ] **Check:** `aws ec2 describe-security-groups --group-ids $WEB_SG $DB_SG --query 'SecurityGroups[].[GroupName,IpPermissions]'` shows exactly those rules, and `describe-key-pairs --key-names career-platform` returns one key.
- **Undo:** `delete-security-group` for both (db first), then `delete-key-pair --key-name career-platform`.

### Task 3: RDS database ⚠

**Interfaces:** Consumes `DB_SG`, `AZ`. Produces `RDS_ENDPOINT` in `aws-ids.env`.

- [ ] **Step 1: Subnet group.** `aws rds create-db-subnet-group --db-subnet-group-name career-platform --db-subnet-group-description career-platform --subnet-ids <all default-VPC default subnets> --tags Key=Project,Value=career-platform`. RDS requires at least two AZs even for Single-AZ.
- [ ] **Step 2: Create the instance.**
  - Run `create-db-instance` with: `--db-instance-identifier career-platform --engine postgres --engine-version 18.6 --db-instance-class <class from Task 0> --allocated-storage 20 --storage-type gp3 --storage-encrypted --no-multi-az --availability-zone $AZ --no-publicly-accessible --db-subnet-group-name career-platform --vpc-security-group-ids $DB_SG --db-name career_platform --master-username career_platform_admin --master-user-password "$(cat ~/.config/career-platform/rds-admin-password)" --backup-retention-period 7 --deletion-protection --copy-tags-to-snapshot --auto-minor-version-upgrade --tags Key=Project,Value=career-platform`.
  - Don't use `--manage-master-user-password`, because its 7-day rotation would break the admin login on the server.
  - **If AccessDenied:** decode the message with `aws sts decode-authorization-message`, record the denying statement in Task 0, and ask the user before changing any setting.
- [ ] **Step 3: Wait** (≈10–15 min): `aws rds wait db-instance-available --db-instance-identifier career-platform`, then save the endpoint as `RDS_ENDPOINT` (`describe-db-instances --query 'DBInstances[0].Endpoint.Address'`).
- [ ] **Check:** `describe-db-instances` shows `PubliclyAccessible: false`, `MultiAZ: false`, `StorageEncrypted: true`, `BackupRetentionPeriod: 7`, `DeletionProtection: true` and `EngineVersion: 18.6`, plus the parameter group's `rds.force_ssl` = `1` (`describe-db-parameters --db-parameter-group-name <group> --query "Parameters[?ParameterName=='rds.force_ssl'].ParameterValue"`).
- **Undo:** `modify-db-instance --no-deletion-protection --apply-immediately`, then `delete-db-instance --final-db-snapshot-identifier career-platform-final`, then `delete-db-subnet-group`.

### Task 4: EC2 instance and address ⚠

**Interfaces:** Consumes `WEB_SG`, `SUBNET_ID`. Produces `INSTANCE_ID`, `EIP_ALLOC`, `EIP` in `aws-ids.env`.

- [ ] **Step 1: Launch.**
  - AMI: `aws ssm get-parameter --name /aws/service/canonical/ubuntu/server/24.04/stable/current/amd64/hvm/ebs-gp3/ami-id --query Parameter.Value --output text`.
  - Run `run-instances` with `--instance-type t3.micro --key-name career-platform --subnet-id $SUBNET_ID --security-group-ids $WEB_SG --credit-specification CpuCredits=standard --metadata-options HttpTokens=required,HttpEndpoint=enabled --block-device-mappings 'DeviceName=/dev/sda1,Ebs={VolumeSize=20,VolumeType=gp3,Encrypted=true,DeleteOnTermination=true}' --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=career-platform},{Key=Project,Value=career-platform}]' 'ResourceType=volume,Tags=[{Key=Name,Value=career-platform},{Key=Project,Value=career-platform}]'`.
  - Run the same command with `--dry-run` first. Expected: `DryRunOperation`.
- [ ] **Step 2: Elastic IP.** `allocate-address --domain vpc --tag-specifications 'ResourceType=elastic-ip,Tags=[{Key=Name,Value=career-platform},{Key=Project,Value=career-platform}]'`, then `aws ec2 wait instance-running` and `associate-address --instance-id $INSTANCE_ID --allocation-id $EIP_ALLOC`.
- [ ] **Check:** `ssh -i ~/.ssh/career-platform ubuntu@$EIP 'uname -m; lsb_release -ds; nproc; free -h'` prints `x86_64`, `Ubuntu 24.04…`, `2` and about 1 GiB total.
- **Undo:** `disassociate-address`, `release-address`, then `terminate-instances`. The public IPv4 charge stops only when the address is released.

### Task 5: Server setup and database load

**Interfaces:** Consumes `RDS_ENDPOINT`, both passwords, and Task 1's files. Produces a running RDS with Railway's data, the app role, and a ready (not yet deployed) `/srv/career-platform`.

- [ ] **Step 1: Base system.** *Server:*
  - `sudo apt-get update && sudo apt-get -y upgrade`. Check `unattended-upgrades` is enabled (`systemctl is-enabled unattended-upgrades` → enabled).
  - Add a 2 GiB swap file at `/swapfile` (`fallocate`, `chmod 600`, `mkswap`, `swapon`, plus an `/etc/fstab` line).
  - Set `MaxRetentionSec=14day` in `/etc/systemd/journald.conf`, then `sudo systemctl restart systemd-journald`. The privacy page promises 14-day logs, and Ubuntu's nginx logrotate already keeps 14 days.
- [ ] **Step 2: Packages.** *Server:*
  - Node 24 from NodeSource (`setup_24.x`), then `sudo npm install -g pnpm@11.24.0`.
  - `nginx`, `certbot` and `python3-certbot-nginx`.
  - PostgreSQL 18 client from the PGDG repo (`sudo apt-get install -y postgresql-common && sudo /usr/share/postgresql-common/pgdg/apt.postgresql.org.sh -y && sudo apt-get install -y postgresql-client-18`). Ubuntu's default client is 16, which can't read an 18 dump.
  - **Check:** `node -v` → `v24.*`, `pnpm -v` → `11.24.0`, `pg_restore --version` → `18.*`.
- [ ] **Step 3: RDS CA bundle.** *Server:* `sudo install -d /etc/ssl/rds && sudo curl -fsSo /etc/ssl/rds/global-bundle.pem https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem && sudo chmod 644 /etc/ssl/rds/global-bundle.pem`.
- [ ] **Step 4: App user and layout.** *Server:*
  - `sudo useradd --system --create-home --home-dir /srv/career-platform --shell /usr/sbin/nologin career-platform`.
  - As that user: `git clone https://github.com/nchabot14/career-platform /srv/career-platform/repo` and `mkdir releases shared`.
  - Write `shared/.env` (mode 600) with:
    - `DATABASE_URL=postgres://career_platform_app:<app pw>@<RDS_ENDPOINT>:5432/career_platform?sslmode=verify-full`
    - `NEXT_PUBLIC_SITE_URL=https://nickchabot.com`
    - every value from Task 0, Step 3.
  - Write `shared/migrate.env` (mode 600) with the same URL but `career_platform_admin` and its password.
  - Paste the secrets over SSH with `sudo -u career-platform tee`, never via a tracked file.
- [ ] **Step 5: Final dump from Railway.** *Laptop:*
  - Start `railway connect Postgres --tunnel-only` in one terminal; it prints a localhost port and credentials.
  - In another, dump with `postgres:18` (`--add-host=host.docker.internal:host-gateway`), as on 2026-10-29: `pg_dump --format=custom --no-owner --no-privileges`.
  - Save it to `~/backups/career-platform/railway-career-platform-<UTC stamp>.dump` with a `.sha256` file.
  - Also save Railway's fingerprint: run `scripts/db-fingerprint.sql` through the same tunnel into `~/backups/career-platform/railway-fingerprint-<stamp>.txt`.
  - `scp` the dump, its `.sha256`, and `~/.config/career-platform/rds-app-password` (as `~/app-pw`, then `chmod 600`) to `ubuntu@$EIP:~`.
- [ ] **Step 6: Load and lock down.** *Server* (as `ubuntu`, with a mode-600 `~/.pgpass` line for the admin role, and `PGSSLMODE=verify-full PGSSLROOTCERT=/etc/ssl/rds/global-bundle.pem` exported):
  1. `shasum -a 256 -c *.sha256` → OK.
  2. `pg_restore -h <RDS_ENDPOINT> -U career_platform_admin -d career_platform --no-owner --no-privileges --exit-on-error <dump>`.
  3. `psql … -v app_password="$(cat ~/app-pw)" -f /srv/career-platform/repo/deploy/aws/app-role.sql`, then `rm ~/app-pw`.
  4. `psql … -qAt -F' | ' -f /srv/career-platform/repo/scripts/db-fingerprint.sql > rds-fingerprint.txt`. `scp` it back and `diff` it against Railway's. **Expected: no differences.** Rows must be `profile` 1, `project` 1, `education` 2, `experience` 2, `skill` 5, migrations 2, everything else 0. If anything differs, stop and ask; don't re-run with `--clean`.
  5. TLS checks:
     - `psql "host=<RDS_ENDPOINT> dbname=career_platform user=career_platform_admin sslmode=disable" -c 'select 1'` must **fail** (`no pg_hba.conf entry … no encryption`).
     - As `career-platform`, in `repo/`, `node -e` a postgres.js `select 1` using `shared/.env`'s `DATABASE_URL`: it succeeds with `NODE_EXTRA_CA_CERTS=/etc/ssl/rds/global-bundle.pem` and **fails** (`self-signed certificate in certificate chain` or `unable to get local issuer certificate`) without it.
  6. App-role limits: `psql` as `career_platform_app`. `select count(*) from profile` → 1. `create table x(i int)` → `permission denied for schema public`.

### Task 6: First deploy and rollback drill

- [ ] **Step 1: Install units and nginx.** *Server:*
  - `sudo cp /srv/career-platform/repo/deploy/aws/career-platform@.service /etc/systemd/system/ && sudo systemctl daemon-reload && sudo systemctl enable career-platform@8000 career-platform@8001`. Enable only; `deploy.sh` starts them.
  - `sudo cp …/nginx-career-platform.conf /etc/nginx/sites-available/career-platform`, symlink it into `sites-enabled`, remove `default`, then `sudo nginx -t && sudo systemctl reload nginx`.
- [ ] **Step 2: Deploy the branch.** *Server:* `sudo /srv/career-platform/repo/deploy/aws/deploy.sh feat/aws-ec2-rds`. Watch `free -h` in a second SSH session. If the build is killed (`Killed` / exit 137), stop one copy, re-run, and record it here.
- [ ] **Step 3: Check before DNS changes.**
  - *Server:* `curl -s 127.0.0.1:8000/api/health` and `:8001` → `{"status":"ok"}`. `sudo ss -ltnp | grep -E ':800[01]\b'` shows `127.0.0.1` only. `ps -o user= -p $(systemctl show -p MainPID --value career-platform@8000)` → `career-platform`.
  - *Laptop:* `curl -s -H 'Host: nickchabot.com' http://$EIP/api/health` → ok. `curl -s -o /dev/null -w '%{http_code}' http://$EIP/` (no Host) → `404`. `curl -s -H 'Host: nickchabot.com' http://$EIP/ | grep -o '<title>[^<]*'` shows the site's title.
- [ ] **Step 4: Rollback drill.** Push a throwaway branch `test/broken-build` that adds `export const broken: number = "x";` to a page. Run `deploy.sh test/broken-build`. Expected: exit 1 at the build step, `readlink /srv/career-platform/current` unchanged, health still ok. Then delete the branch locally and on GitHub, and remove its release directory if one was left.

### Task 7: Cut over DNS and HTTPS ⚠ (user does the Cloudflare and Supabase changes)

- [ ] **Step 1: Supabase.** Authentication → URL Configuration: Site URL `https://nickchabot.com`; redirect URLs include `https://nickchabot.com/auth/callback`.
- [ ] **Step 2: Cloudflare.** Replace the `@` CNAME (Railway) with an `A` record → `<EIP>`, **DNS only**, TTL Auto. Leave `www`, MX and TXT records alone. *Laptop:* wait until `dig +short nickchabot.com @1.1.1.1` prints `<EIP>`.
- [ ] **Step 3: Certificate.** *Server:* `sudo certbot --nginx -d nickchabot.com --redirect -m <OWNER_EMAIL> --agree-tos --no-eff-email`. Run it **once**; on failure, read the error and ask before retrying (Let's Encrypt rate limits). Then `sudo certbot renew --dry-run`.
- [ ] **Step 4: Checks.** *Laptop:*
  - `curl -sI http://nickchabot.com` → 301 to https.
  - `curl -s https://nickchabot.com/api/health` → ok.
  - `curl -sI https://www.nickchabot.com` → 301 `location: https://nickchabot.com/`.
  - `curl -sI https://nickchabot.com | grep -i strict-transport` is present.
- [ ] **Step 5: Checks in a browser (user):**
  - The padlock shows.
  - Magic-link sign-in at `/login` reaches `/admin`.
  - A contact-form message arrives by email.
  - Uploading a resume PDF between 9 and 10 MiB succeeds, and `/resume` serves it.

### Task 8: Monitoring and a safety snapshot

- [ ] **Step 1: Auto-recovery.** *Laptop:* `aws cloudwatch put-metric-alarm --alarm-name career-platform-recover --namespace AWS/EC2 --metric-name StatusCheckFailed_System --dimensions Name=InstanceId,Value=$INSTANCE_ID --statistic Maximum --period 60 --evaluation-periods 2 --threshold 1 --comparison-operator GreaterThanOrEqualToThreshold --alarm-actions arn:aws:automate:us-east-1:ec2:recover`. If AccessDenied, record it and skip. t3 instances also have simplified automatic recovery by default.
- [ ] **Step 2: Uptime check (user).** Create a free UptimeRobot (or similar) HTTPS monitor on `https://nickchabot.com/api/health` with a 5-minute interval and an email alert to the owner. Test it by stopping nginx for 6 minutes, then start nginx again.
- [ ] **Step 3: Snapshot.** `aws rds create-db-snapshot --db-instance-identifier career-platform --db-snapshot-identifier career-platform-after-cutover --tags Key=Project,Value=career-platform`, then wait for `available`.

### Task 9: Retire Railway and update the repo (after ≥3 days of clean uptime; ask the user first)

**Files:**
- Delete: `railway.json`
- Modify: `tests/unit/deploy-does-not-seed.test.ts` (the pre-deploy test), `app/(public)/privacy/page.tsx:107-108,128-129,141-142`
- Modify: `README.md` ("How the site runs", the Railway lines near the top), `docs/operations.md` (rewrite for EC2 + RDS)
- Create: `docs/aws-migration.md` (what was done, with placeholders for IDs and addresses)
- Test: `tests/unit/privacy-page.test.tsx`

- [ ] **Step 1: Write the failing tests.**
  - `privacy-page.test.tsx`: renders the page; text includes `Amazon Web Services`, `7 days` (backups) and `14 days` (logs); excludes `Microsoft Azure`, `Railway` and `[CONFIRM`.
  - In `deploy-does-not-seed.test.ts`, replace `the pre-deploy command only applies migrations` with `the deploy script only applies migrations`: `deploy/aws/deploy.sh` contains `scripts/migrate.mjs`, and `scripts/migrate.mjs` doesn't match `/insert|seed|prepare-database/i`.
- [ ] **Step 2: Run** `pnpm test`. Expected: FAIL on the privacy assertions only.
- [ ] **Step 3: Make them pass.**
  - Privacy page: AWS hosts the server and database; RDS keeps automatic backups for 7 days; server logs are kept for 14 days.
  - Delete `railway.json`.
  - Rewrite `docs/operations.md` around the EC2/RDS layout, `deploy.sh`, restore from an RDS snapshot, and the Task 3/4 undo commands.
  - Update `README.md`.
  - Write `docs/aws-migration.md` from this plan's results.
- [ ] **Step 4: Run** `pnpm lint && pnpm typecheck && pnpm test`. Expected: all pass. Then commit (`docs: move hosting docs and privacy page to AWS`).
- [ ] **Step 5: Retire Railway (user approves first).** Take one last fingerprint and confirm it is unchanged since Task 5. Then delete the Railway project `fabulous-recreation`, and in Cloudflare remove `_railway-verify`.
- [ ] **Step 6: Merge.** Open a PR from `feat/aws-ec2-rds`; CI must pass. The user merges it. Then *Server:* `sudo /srv/career-platform/repo/deploy/aws/deploy.sh main` and check `/api/health`.

## Not in this plan

- Moving uploads to S3 or a CDN. Files stay in Postgres; at this size it's fine.
- Bumping CI's and `compose.yaml`'s `postgres:17` to 18 to match production.
- A budget alert. The user can't create one; the instructor's answer in Task 0 decides who watches spending.
- Tearing everything down at the end of the course. Use each task's **Undo**, newest first, after a final `pg_dump`.
