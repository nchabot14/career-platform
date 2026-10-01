# Operations

How the career platform runs in production, and how to set it up, update it,
back it up, and restore it.

## How it runs

- One Azure VM (`vm-career-platform`, resource group `rg-career-platform`)
  runs the Next.js production server as the systemd service
  `career-platform`, listening on `127.0.0.1:3000`.
- Data lives in one SQLite file, `/home/azureuser/career-platform/data/career_platform.db`.
- Uploaded files (resume PDFs, application documents) live on disk under
  `FILE_STORAGE_DIR`, by default `data/files/` in the app directory.
- Supabase is used **only** for owner sign-in (magic-link email). Resend sends
  contact-form alerts. Umami (optional) provides cookieless page counts.

First-time server setup is in
`docs/superpowers/plans/2026-09-24-azure-vm-migration.md`.

## Environment variables

Set these in `/home/azureuser/career-platform/.env` (mode `600`). Variables
starting with `NEXT_PUBLIC_` are fixed when the site is **built**, so rebuild
after changing them.

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | `file:/home/azureuser/career-platform/data/career_platform.db` |
| `FILE_STORAGE_DIR` | No | Upload folder. Default `data/files` (relative to the app directory). |
| `NEXT_PUBLIC_SITE_URL` | Yes, once public | Public base URL, e.g. `https://example.com`. Used for canonical URLs, the sitemap, and sign-in links. |
| `NEXT_PUBLIC_SUPABASE_URL` | For `/admin` | Supabase project URL. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | For `/admin` | Supabase anon (public) key. |
| `OWNER_EMAIL` | For `/admin` | The only email address allowed into the dashboard. |
| `RESEND_API_KEY` | For email alerts | Resend API key. Without it, messages are still saved. |
| `CONTACT_NOTIFICATION_EMAIL` | For email alerts | Where contact-form alerts go. |
| `CONTACT_FROM_EMAIL` | Recommended | Sender on your verified Resend domain, e.g. `Career Platform <alerts@example.com>`. |
| `RATE_LIMIT_SECRET` | Recommended | Random string used to hash visitor IPs for rate limiting. Generate with `openssl rand -hex 32`. |
| `NEXT_PUBLIC_UMAMI_WEBSITE_ID` | No | Umami website ID. Analytics load only when both Umami values are set. |
| `NEXT_PUBLIC_UMAMI_SCRIPT_URL` | No | Umami script URL, e.g. `https://cloud.umami.is/script.js`. |

## Supabase sign-in setup

1. Create a free project at <https://supabase.com>. No database or storage
   setup is needed; only Auth is used.
2. **Authentication → Providers → Email:** enable email sign-in with magic
   links. Password sign-in isn't used.
3. **Authentication → URL Configuration:**
   - Site URL: your `NEXT_PUBLIC_SITE_URL`.
   - Redirect URLs: add `<NEXT_PUBLIC_SITE_URL>/auth/callback`. While using the
     SSH tunnel, also add `http://localhost:3000/auth/callback`.
4. **Project Settings → API:** copy the project URL and anon key into `.env`,
   set `OWNER_EMAIL`, then rebuild and restart (see "Deploying an update").
5. Sign in at `/login` with the owner email and follow the emailed link.

Supabase's built-in email sender is rate-limited. For reliable sign-in emails,
configure custom SMTP in Supabase (Resend provides SMTP credentials).

## Resend setup

1. In Resend, add and verify your sending domain (it gives you DNS records).
2. Create an API key with sending access and set `RESEND_API_KEY`.
3. Set `CONTACT_FROM_EMAIL` to an address on the verified domain and
   `CONTACT_NOTIFICATION_EMAIL` to the inbox that should receive alerts.

Until this is done, contact messages are still saved and visible at
`/admin/messages`, marked "email alert failed".

## Deploying an update

On the VM, in `/home/azureuser/career-platform`:

```bash
git pull --ff-only
pnpm install --frozen-lockfile
# Back up first if the update includes new files in drizzle/ (a migration):
~/bin/backup-career-platform        # see "Backups"
pnpm db:migrate                     # applies only migrations not yet applied
pnpm build
sudo systemctl restart career-platform
curl -s http://127.0.0.1:3000/api/health   # expect {"status":"ok"}
```

`pnpm db:migrate` changes the schema only. It never seeds data. Run it from the
app directory so it finds `data/career_platform.db`.

## Making the site public

The service listens only on `127.0.0.1`. To publish it:

1. Point a domain's DNS `A` record at the VM's public IP.
2. Install a reverse proxy that handles HTTPS, for example Caddy, with this
   `/etc/caddy/Caddyfile`:

   ```
   example.com {
       reverse_proxy 127.0.0.1:3000
   }
   ```

   Caddy obtains certificates automatically and sets `X-Forwarded-For`, which
   the contact-form rate limit needs to tell visitors apart. Without a proxy
   that sets it, all visitors share one limit of five messages per hour.
3. In the NSG `vm-career-platformNSG`, allow inbound TCP 80 and 443 from any
   source. Keep port 22 restricted.
4. Set `NEXT_PUBLIC_SITE_URL=https://example.com`, update the Supabase URL
   configuration, then rebuild and restart.

## Health checks

- `GET /api/health` returns `200 {"status":"ok"}` when the database answers
  and `503 {"status":"degraded"}` when it doesn't. Point an uptime monitor at
  it once the site is public.
- Service state: `systemctl status career-platform`.
- Logs: `journalctl -u career-platform -n 100 --no-pager`. Server errors are
  one-line JSON objects with secrets and personal data removed.

## Backups

Back up the database **and** the uploads folder together. SQLite's `.backup`
command is safe while the site is running.

Create `~/bin/backup-career-platform`:

```bash
#!/usr/bin/env bash
set -euo pipefail
app=/home/azureuser/career-platform
dest=/home/azureuser/backups
stamp=$(date -u +%Y%m%dT%H%M%SZ)
mkdir -p "$dest"
sqlite3 "$app/data/career_platform.db" ".backup '$dest/career_platform-$stamp.db'"
sqlite3 "$dest/career_platform-$stamp.db" "PRAGMA integrity_check;" | grep -qx ok
tar -czf "$dest/files-$stamp.tar.gz" -C "$app/data" files 2>/dev/null || true
# Keep the 14 most recent of each.
ls -1t "$dest"/career_platform-*.db | tail -n +15 | xargs -r rm --
ls -1t "$dest"/files-*.tar.gz 2>/dev/null | tail -n +15 | xargs -r rm --
```

Then `chmod +x ~/bin/backup-career-platform` and schedule it daily with
`crontab -e`:

```
15 3 * * * /home/azureuser/bin/backup-career-platform
```

Backups on the VM don't survive losing the VM. Copy them off regularly, for
example from the laptop:

```bash
scp -i ~/.ssh/isba4775_azure 'azureuser@20.25.246.180:backups/*' ~/career-platform-backups/
```

## Restoring

```bash
sudo systemctl stop career-platform
cd /home/azureuser/career-platform
cp data/career_platform.db ~/career_platform.db.before-restore   # keep the current copy
cp ~/backups/career_platform-<stamp>.db data/career_platform.db
sqlite3 data/career_platform.db "PRAGMA integrity_check;"         # must print ok
rm -rf data/files && tar -xzf ~/backups/files-<stamp>.tar.gz -C data
sudo systemctl start career-platform
curl -s http://127.0.0.1:3000/api/health
```

## Continuous integration

`.github/workflows/ci.yml` runs on every push to `main` and every pull request:
install, lint, typecheck, unit tests, integration tests (against a throwaway
SQLite file), and Playwright browser tests including accessibility checks.
CI needs no secrets.
