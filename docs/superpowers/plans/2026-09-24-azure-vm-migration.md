# Azure VM Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Run the career platform on the Azure VM `vm-career-platform`, serving
the site from the SQLite database copied from the owner's laptop.

**Architecture:** One Linux VM runs the Next.js production server under
systemd, bound to `127.0.0.1:3000`. The app reads its SQLite file at
`/home/azureuser/career-platform/data/career_platform.db`. The owner reaches the site
through an SSH tunnel, so no new network security group (NSG) rules are needed.

**Tech Stack:** Azure VM (Standard_B2ats_v2, North Central US, Linux),
Node.js 24 + pnpm 11.24.0, Next.js 16, SQLite via `@libsql/client`, uv +
Python 3.14 (tooling only), systemd.

**Spec:** The owner's eight-step migration table (Server → Verify), reproduced
as this plan's sections in the same order.

## Global Constraints

- VM: `vm-career-platform` in resource group `rg-career-platform`.
- VM public IP: `<VM_PUBLIC_IP>`. Look it up with
  `az vm show -d -g rg-career-platform -n vm-career-platform --query publicIps -o tsv`.
  This public repo uses the placeholders `<VM_PUBLIC_IP>` and `<LAPTOP_IP>`
  (the laptop's public IP) instead of real addresses.
- SSH user: `azureuser`. SSH key: `~/.ssh/isba4775_azure`.
- SSH command: `ssh -i ~/.ssh/isba4775_azure azureuser@<VM_PUBLIC_IP>`
- App directory on the VM: `/home/azureuser/career-platform`.
- Database on the VM: `/home/azureuser/career-platform/data/career_platform.db`. `DATABASE_URL` is `file:/home/azureuser/career-platform/data/career_platform.db`, the same path with `file:` in front. The **Data** step copies to exactly this path.
- The real database comes from the laptop. Never run `pnpm db:migrate`, `drizzle-kit`, a seed script or any other schema or data setup on the VM. (This project uses Drizzle, not Alembic.)
- Node.js 24.x and pnpm 11.24.0 (`package.json` `packageManager`). Python 3.14 (`.python-version`).
- The NSG allows inbound SSH (22) only from `<LAPTOP_IP>`. This plan opens no other ports.

## Before you start

The table you gave me doesn't fully match the repository. Each item below
says how this plan handles the mismatch. Settle them before running anything.

1. **The VM's public IP is not the laptop's public IP.** The address first
   given for the VM was the laptop's own public IP, as reported by ipify and
   ifconfig.me. Azure reports the VM's address separately (see Global
   Constraints), and an SSH test to it succeeded on 2026-10-01. Every step
   below uses `<VM_PUBLIC_IP>`.
2. **The app is Next.js, so nothing for uvicorn to run.** uvicorn serves Python
   ASGI apps, and this repo has no Python app; `pyproject.toml` has no
   dependencies. The **Python** section still installs uv and runs `uv sync` as
   you asked, but the site is built with `pnpm build` and served with
   `next start` (see **Processes**). The **Packages** section adds Node.js 24
   and pnpm for this.
3. **The SQLite code isn't on `main` yet.** It lives on `feat/sqlite-database`
   (pushed, not merged). The `pyproject.toml`, `uv.lock` and `.python-version`
   files are uncommitted on `chore/python-uv`. **Code** step 1 merges both
   into `main` before cloning. Otherwise the VM would get the old PostgreSQL
   code and no lockfile. The two branches merge with no conflicts.
4. **The local database is empty.** `data/career_platform.db` has all 12 tables
   but 0 rows (checked 2026-10-01). No page reads the database yet either. So
   **Verify** checks the data with `sqlite3` on the VM, not in a browser.
   "Shows my data" in the browser needs a page that queries the database,
   which this plan doesn't build.
5. **The VM has 1 GiB of RAM.** `next build` can run out of memory with that
   little RAM, so **Packages** step 2 adds a 2 GiB swap file first.

## Review Focus

- **SSH from a different public IP:** if `ssh` times out, the laptop's outbound IP no longer matches the NSG rule (`<LAPTOP_IP>`). Fix the rule; don't open port 22 to everyone.
- **App started before `.env` exists:** `NEXT_PUBLIC_*` values are baked in at build time, so **Config** must come before `pnpm build` in **Processes**.
- **Database copied while the app is running:** stop the service before copying a database file over the VM's copy (see **Data** step 1).
- **Service not surviving a reboot:** **Verify** step 4 reboots the VM and checks the site comes back.
- **Running out of memory during `pnpm build`:** **Packages** step 2 adds swap; if the build still dies with "Killed" or a JavaScript heap error, check `free -h`.

---

Each step lists **Where** it runs (laptop, VM or portal), **Run** (what to run
or click), **Why**, **Check** (how to confirm it worked) and **Undo** (how to
reverse it). "VM" means: in a shell opened with the SSH command from Global
Constraints.

## Server ✅ Already done

The VM already exists. Both steps below were completed on 2026-10-01; don't
repeat them.

- [x] **Step 1: The VM exists and is running**
  - **Where:** laptop
  - **Run:** (done) `az vm show -d -g rg-career-platform -n vm-career-platform --query "{power:powerState, ip:publicIps, size:hardwareProfile.vmSize}" -o table`
  - **Why:** Every later step connects to this VM, and it must be running.
  - **Check:** Returned `VM running`, `<VM_PUBLIC_IP>`, `Standard_B2ats_v2`. If a later step can't connect, run the command again; if the VM is stopped, start it in the portal (VM → **Start**).
  - **Undo:** Nothing to undo; this step only read the VM's state. The VM was created outside this plan, so this plan never deletes it.

- [x] **Step 2: SSH to the VM works**
  - **Where:** laptop
  - **Run:** (done) `ssh -i ~/.ssh/isba4775_azure -o BatchMode=yes azureuser@<VM_PUBLIC_IP> 'echo connected'`
  - **Why:** Every VM step runs over this connection.
  - **Check:** Printed `connected`.
  - **Undo:** The test only added the VM's host key to the laptop's `~/.ssh/known_hosts`. To remove it: `ssh-keygen -R <VM_PUBLIC_IP>`.

## Packages

- [x] **Step 1: Check the OS, memory and disk space**
  - **Where:** laptop, then VM
  - **Run:**
    ```bash
    ssh -i ~/.ssh/isba4775_azure azureuser@<VM_PUBLIC_IP>
    # then, on the VM:
    lsb_release -ds; uname -m; free -h; df -h ~
    ```
  - **Why:** The next steps assume Ubuntu on x86_64 and need about 3 GB of free disk space.
  - **Check:** An Ubuntu release, `x86_64`, about 1 GiB of memory, and at least 3 GB available on `~`. If the OS isn't Ubuntu or Debian, stop: the `apt-get` steps won't apply.
  - **Undo:** `exit` closes the session.

- [x] **Step 2: Add a 2 GiB swap file**
  - **Where:** VM
  - **Run:**
    ```bash
    sudo fallocate -l 2G /swapfile
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
    ```
  - **Why:** `next build` can need more than the VM's 1 GiB of RAM.
  - **Check:** `swapon --show` lists `/swapfile` with size `2G`, and `free -h` shows `Swap: 2.0Gi`.
  - **Undo:**
    ```bash
    sudo swapoff /swapfile
    sudo sed -i '\|^/swapfile none swap sw 0 0$|d' /etc/fstab
    sudo rm /swapfile
    ```

- [x] **Step 3: Install git and sqlite3**
  - **Where:** VM
  - **Run:**
    ```bash
    apt-mark showmanual | grep -xE 'git|sqlite3' > ~/preinstalled-packages.txt || true
    sudo apt-get update
    sudo apt-get install -y git sqlite3
    ```
  - **Why:** git clones the code; sqlite3 lets you inspect the database on the VM. The first line records which of the two were already installed, so Undo removes only what this step added.
  - **Check:** `git --version` and `sqlite3 --version` both print versions.
  - **Undo:** Remove only the packages missing from `~/preinstalled-packages.txt`:
    ```bash
    for p in git sqlite3; do grep -qx "$p" ~/preinstalled-packages.txt || sudo apt-get remove -y "$p"; done
    ```

- [x] **Step 4: Install Node.js 24 from NodeSource**
  - **Where:** VM
  - **Run:**
    ```bash
    curl -fsSL https://deb.nodesource.com/setup_24.x -o /tmp/nodesource_setup.sh
    sudo bash /tmp/nodesource_setup.sh
    sudo apt-get install -y nodejs
    ```
  - **Why:** The app is Next.js and needs Node.js 24. Ubuntu's own `nodejs` package is older.
  - **Check:** `node -v` prints `v24.x.x`, and `which node` prints `/usr/bin/node`.
  - **Undo:**
    ```bash
    sudo apt-get remove -y nodejs
    sudo rm -f /etc/apt/sources.list.d/nodesource.* /etc/apt/keyrings/nodesource.gpg
    sudo apt-get update
    ```

- [x] **Step 5: Enable pnpm with Corepack**
  - **Where:** VM
  - **Run:**
    ```bash
    sudo corepack enable pnpm
    ```
  - **Why:** The repo pins `pnpm@11.24.0` in `package.json`. Corepack installs exactly that version the first time `pnpm` runs inside the project.
  - **Check:** `which pnpm` prints `/usr/bin/pnpm`. (`pnpm -v` gets checked after the clone, in **Python** step 3.)
  - **Undo:** `sudo corepack disable pnpm`

## Code

- [x] **Step 1: Put the SQLite code and Python files on `main`**
  - **Where:** laptop, in `~/isba-4715/career-platform`
  - **Run:**
    ```bash
    git switch chore/python-uv
    git add pyproject.toml uv.lock .python-version
    git commit -m "chore: add uv project with Python 3.14"
    git push -u origin chore/python-uv
    gh pr create --base main --head feat/sqlite-database --fill
    gh pr create --base main --head chore/python-uv --fill
    ```
    Review and merge both pull requests on GitHub, then run `git switch main && git pull --ff-only`.
  - **Why:** The VM clones `main`. Without this step it would get the old PostgreSQL code and no `uv.lock` (see "Before you start" item 3).
  - **Check:** `git ls-tree --name-only origin/main | grep -E 'uv.lock|pyproject.toml'` prints both names, and `git show origin/main:lib/db/client.ts | head -1` shows `@libsql/client`.
  - **Undo:** On GitHub, use **Revert** on each merged pull request. Or locally: `git revert -m 1 <merge-commit>` for each merge, then `git push`.

- [x] **Step 2: Clone the repository on the VM**
  - **Where:** VM
  - **Run:**
    ```bash
    cd ~
    git clone https://github.com/nchabot14/career-platform.git
    cd career-platform
    ```
  - **Why:** Puts the code on the VM. The repository is public, so no GitHub credentials are needed on the VM.
  - **Check:** The commit IDs on the laptop and the VM are identical.
    - Laptop: `git fetch origin && git rev-parse origin/main`
    - VM: `git -C ~/career-platform rev-parse HEAD`

    Both print the same 40-character ID. Also, on the VM, `ls data/.gitkeep pyproject.toml uv.lock` lists all three files.
  - **Undo:** `rm -rf ~/career-platform`

## Python

- [x] **Step 1: Install uv**
  - **Where:** VM
  - **Run:**
    ```bash
    curl -LsSf https://astral.sh/uv/install.sh | sh
    source ~/.local/bin/env
    ```
  - **Why:** The project's Python setup is managed with uv.
  - **Check:** `uv --version` prints a version.
  - **Undo:**
    ```bash
    uv cache clean
    rm -rf ~/.local/share/uv ~/.local/bin/uv ~/.local/bin/uvx
    ```
    Then delete the line the installer added to `~/.profile` or `~/.bashrc` (the one containing `.local/bin/env`).

- [x] **Step 2: `uv sync` from the lockfile**
  - **Where:** VM, in `~/career-platform`
  - **Run:**
    ```bash
    uv sync --locked --no-dev
    ```
  - **Why:** Installs Python 3.14 and creates `.venv` exactly as the committed `uv.lock` specifies, without development dependencies. The lockfile is made on the laptop and committed; never run `uv lock` on the VM. `--locked` makes `uv sync` fail instead of rewriting `uv.lock` if the lockfile is out of date. In that case, fix it on the laptop, commit, and pull. Right now this installs no packages (see "Before you start" item 2).
  - **Check:** `uv run --no-sync python --version` prints `Python 3.14.x`, and `git status --porcelain uv.lock` prints nothing, which means the lockfile on the VM is unchanged.
  - **Undo:** `rm -rf ~/career-platform/.venv` and `uv python uninstall 3.14`

- [x] **Step 3: Install the Node dependencies the site actually runs on**
  - **Where:** VM, in `~/career-platform`
  - **Run:**
    ```bash
    pnpm install --frozen-lockfile
    ```
  - **Why:** This is the step that installs what the site needs, from `pnpm-lock.yaml`. It's here because it's the "install dependencies from the lockfile" step.
  - **Check:** `pnpm -v` prints `11.24.0`. The install ends with `Done`, and `ls node_modules/@libsql/client` succeeds.
  - **Undo:** `rm -rf ~/career-platform/node_modules`

## Config

- [x] **Step 1: Create `.env` from `.env.example`**
  - **Where:** VM, in `~/career-platform`
  - **Run:**
    ```bash
    cp -n .env.example .env
    chmod 600 .env
    nano .env
    ```
    In the editor, set:
    - `DATABASE_URL=file:/home/azureuser/career-platform/data/career_platform.db`
    - `OWNER_EMAIL=` your email, if you'll use `/admin`.
    - `NEXT_PUBLIC_SUPABASE_URL=` and `NEXT_PUBLIC_SUPABASE_ANON_KEY=`, only if you'll use `/admin` or `/login`.

    Leave the rest blank for now.
  - **Why:** Next.js reads `.env` when it builds and starts. `DATABASE_URL` uses the absolute path, so the database location doesn't depend on which directory the app starts in, and it matches the **Data** step's copy destination character for character. `/admin` requires the Supabase values and `OWNER_EMAIL`; the home page doesn't. `-n` keeps `cp` from overwriting an existing `.env`. `chmod 600` keeps the file readable only by `azureuser`.
  - **Check:** `grep -c '' .env` prints the same line count as `grep -c '' .env.example`, `ls -l .env` shows `-rw-------`, and `grep ^DATABASE_URL= .env` prints exactly `DATABASE_URL=file:/home/azureuser/career-platform/data/career_platform.db`.
  - **Undo:** `rm ~/career-platform/.env`

## Data

> **For the agent executing this plan:** The real database comes from the
> owner's laptop. Don't create, migrate or seed a database on the VM: no
> `pnpm db:migrate`, no `drizzle-kit`, no Alembic, no seed script. If the copy
> fails, stop and report; don't make an empty database to fill the gap.

- [x] **Step 1: Copy the SQLite database from the laptop**
  - **Where:** laptop, in `~/isba-4715/career-platform`
  - **Run:**
    ```bash
    ls data/career_platform.db-* 2>/dev/null   # should print nothing
    shasum -a 256 data/career_platform.db
    scp -i ~/.ssh/isba4775_azure data/career_platform.db \
      azureuser@<VM_PUBLIC_IP>:/home/azureuser/career-platform/data/career_platform.db
    ```
  - **Why:** Moves your data to the VM. The first line makes sure no `-wal` or `-journal` file is holding changes that haven't been written into the `.db` yet. If one exists, close anything using the database and check again. The service isn't running yet on a first migration. On later re-copies, run `sudo systemctl stop career-platform` on the VM first. The destination `/home/azureuser/career-platform/data/career_platform.db` is `DATABASE_URL` with `file:` removed. Confirm with `grep ^DATABASE_URL= ~/career-platform/.env | sed 's/^DATABASE_URL=file://'` on the VM, which must print the same path.
  - **Check:** On the VM:
    ```bash
    sha256sum /home/azureuser/career-platform/data/career_platform.db
    sqlite3 /home/azureuser/career-platform/data/career_platform.db "PRAGMA integrity_check;"
    ```
    The hash matches the laptop's, and `integrity_check` prints `ok`.
  - **Undo:** `rm /home/azureuser/career-platform/data/career_platform.db` on the VM. The laptop copy is untouched.

## Processes

uvicorn is replaced by the Next.js production server here (see "Before you
start" item 2).

- [x] **Step 1: Build the site**
  - **Where:** VM, in `~/career-platform`
  - **Run:**
    ```bash
    pnpm build
    ```
  - **Why:** `next start` serves only a production build. It runs after **Config** because `NEXT_PUBLIC_*` values are fixed at build time.
  - **Check:** The output ends with the route table (`○ /`), and `ls .next/BUILD_ID` succeeds. If it prints `Killed`, check `free -h` and **Packages** step 2.
  - **Undo:** `rm -rf ~/career-platform/.next`

- [x] **Step 2: Create a systemd service for the site**
  - **Where:** VM
  - **Run:**
    ```bash
    sudo tee /etc/systemd/system/career-platform.service > /dev/null <<'EOF'
    [Unit]
    Description=Career platform (Next.js)
    After=network.target

    [Service]
    User=azureuser
    WorkingDirectory=/home/azureuser/career-platform
    Environment=NODE_ENV=production
    ExecStart=/usr/bin/node node_modules/next/dist/bin/next start -H 127.0.0.1 -p 3000
    Restart=on-failure

    [Install]
    WantedBy=multi-user.target
    EOF
    sudo systemctl daemon-reload
    sudo systemctl enable --now career-platform
    ```
  - **Why:** Keeps the site running after you log out, restarts it if it crashes, and starts it at boot. Binding to `127.0.0.1` keeps it off the public internet even if the NSG changes later.
  - **Check:** `systemctl is-active career-platform` prints `active`, and `journalctl -u career-platform -n 20 --no-pager` shows `Ready`.
  - **Undo:**
    ```bash
    sudo systemctl disable --now career-platform
    sudo rm /etc/systemd/system/career-platform.service
    sudo systemctl daemon-reload
    ```

## Verify

- [x] **Step 1: The site answers on the VM**
  - **Where:** VM
  - **Run:**
    ```bash
    curl -sS -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3000/
    curl -sS http://127.0.0.1:3000/ | grep -o 'Career Platform' | head -1
    ```
  - **Why:** Confirms the server is up and serving the home page.
  - **Check:** Prints `200`, then `Career Platform`.
  - **Undo:** Nothing to undo; this step only reads.

- [x] **Step 2: The VM serves your actual data**
  - **Where:** laptop and VM
  - **Run:**
    1. Row counts for every table. Run on the laptop from `~/isba-4715/career-platform` with `DB=data/career_platform.db`, and on the VM with `DB=/home/azureuser/career-platform/data/career_platform.db`:
       ```bash
       for t in profile experience education skill project resume_document social_link \
                contact_message job_application application_contact application_document application_activity; do
         printf '%s ' "$t"; sqlite3 "$DB" "SELECT count(*) FROM $t;"
       done
       ```
    2. A content fingerprint of every row. Run on both machines with the same `DB` values:
       ```bash
       sqlite3 "$DB" .dump | grep -v '__drizzle_migrations' | shasum -a 256   # laptop
       sqlite3 "$DB" .dump | grep -v '__drizzle_migrations' | sha256sum      # VM
       ```
    3. Confirm the running app is configured for that same file. On the VM:
       ```bash
       sudo cat /proc/$(systemctl show -p MainPID --value career-platform)/cwd/.env | grep ^DATABASE_URL=
       ```
  - **Why:** An HTTP 200 only proves the server is up. These checks prove the VM holds the same rows and values as the laptop, and that the running service points at that file. The `.dump` fingerprint compares every value in every table, not just row counts. No page displays this data yet (see "Before you start" item 4); once one does, also load it through the tunnel in Step 3 and compare a known value, such as your profile headline.
  - **Check:** (1) The 12 counts are identical on both machines. (2) The two fingerprints are identical. (3) Prints `DATABASE_URL=file:/home/azureuser/career-platform/data/career_platform.db`. If the laptop database still has 0 rows, all counts are 0. That's a correct copy but proves little, so add your data on the laptop and redo **Data** step 1 first.
  - **Undo:** Nothing to undo; these commands only read.

- [x] **Step 3: View the site from the laptop through an SSH tunnel**
  - **Where:** laptop
  - **Run:**
    ```bash
    ssh -i ~/.ssh/isba4775_azure -N -L 3000:127.0.0.1:3000 azureuser@<VM_PUBLIC_IP>
    ```
    Leave it running and open http://localhost:3000 in a browser.
  - **Why:** Lets you see the site without opening ports 80 or 443 in the NSG.
  - **Check:** The home page loads with the Career Platform header and footer.
  - **Undo:** Press Ctrl-C in that terminal to close the tunnel.

- [x] **Step 4: The site comes back after a reboot**
  - **Where:** portal or laptop
  - **Run:** Portal: VM → **Restart**. Or from the laptop: `az vm restart -g rg-career-platform -n vm-career-platform`. When it's back up, repeat **Verify** step 1.
  - **Why:** Proves systemd starts the site (and swap comes back) without anyone logging in.
  - **Check:** Verify step 1 prints `200` and `Career Platform`, and `swapon --show` lists `/swapfile`.
  - **Undo:** Nothing to undo. A restart changes no configuration.

## Verification results

Verify ran twice on 2026-10-01:

- **Run A (first migration):** the laptop database was empty, with all 12 tables at 0 rows.
- **Run B (after loading the resume):** the database held the owner's resume data and was re-copied with the **Data** step.

Run B repeated only steps 1 and 2.1–2.2. The other steps were not repeated.

| Check | What it tested | Run A result | Run B result |
|---|---|---|---|
| Verify 1: site answers on the VM | `curl http://127.0.0.1:3000/` on the VM returns HTTP 200, and the page contains "Career Platform" | ✅ `200`, "Career Platform" | ✅ `200` |
| Verify 2.1: row counts | Row counts for all 12 tables match between the laptop and the VM | ✅ Identical; every table 0 | ✅ Identical: profile 1, experience 2, education 2, project 1, skill 4, other 7 tables 0 |
| Verify 2.2: content fingerprint | SHA-256 of `sqlite3 .dump` (excluding `__drizzle_migrations`) matches between the laptop and the VM | ✅ Identical (`b27d1269…`) | ⚠️ False mismatch (laptop `772ecefa…`, VM `a43e2ca4…`). The files are identical: file SHA-256 `c0cd661e…` on both, and `project.body` bytes `ce3a4d04…` on both. The laptop's `sqlite3` 3.51.0 dumps a line break as `unistr('\u000a')`; the VM's 3.45.1 dumps it as `replace(…,char(10))`. |
| Verify 2.3: service uses that file | The running service's `.env` has `DATABASE_URL=file:/home/azureuser/career-platform/data/career_platform.db` | ✅ Exact match | Not repeated |
| Verify 3: SSH tunnel | Through `ssh -L 3000:127.0.0.1:3000`, the laptop's `http://localhost:3000/` serves the site | ✅ `200`, `<title>Career Platform</title>` (tested with `curl`, not a browser) | Not repeated |
| Verify 4: survives reboot | After `az vm restart`, the site and swap come back without anyone logging in | ✅ VM running; `200`, "Career Platform"; service `active`; `/swapfile` 2G on | Not repeated |

**Not covered:** no check shows the data on a web page, because no page
reads the database yet. Verify 2 proves the VM has the data and the service
points at it, not that the site displays it.

**Fix for Verify 2.2:** the dump fingerprint only works when both machines
run the same `sqlite3` version. Comparing the file's SHA-256 with the service
stopped (as in the **Data** step's Check) is reliable across versions.
