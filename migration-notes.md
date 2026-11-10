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
