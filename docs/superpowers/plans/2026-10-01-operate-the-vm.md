# Operate the VM Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Visitors reach the site at `http://<VM_PUBLIC_IP>` (no port), and it keeps running without anyone starting it by hand.

**Architecture:** systemd runs two copies of the app as `azureuser`, on `127.0.0.1:8000` and `127.0.0.1:8001`. nginx listens on port 80 and forwards each visitor to whichever copy is up. If one copy crashes, nginx sends traffic to the other while systemd restarts the crashed one.

**Tech Stack:** Ubuntu, systemd, nginx, Node.js 24 + Next.js 16, SQLite. All of it is already in `~/career-platform` except nginx.

**Spec:** No separate spec file. The requirements are the user's request of 2026-10-01, listed under Global Constraints.

## VM details (from `az` and SSH, checked 2026-10-08)

This public repo uses the placeholders `<VM_PUBLIC_IP>` (the VM's public IP) and `<LAPTOP_IP>` (your laptop's public IP) instead of real addresses. Before running a command, replace each placeholder with the real value. Get the VM's with `az vm show -d -g rg-career-platform -n vm-career-platform --query publicIps -o tsv`, and your laptop's with `curl -4 -s https://ifconfig.me`.

| | |
|---|---|
| VM | `vm-career-platform`, resource group `rg-career-platform`, `northcentralus`, Ubuntu 24.04, Standard_B2ats_v2 (2 vCPU, 1 GiB RAM), running |
| Public IP | `<VM_PUBLIC_IP>` (no DNS name) |
| SSH | `ssh -i ~/.ssh/isba4775_azure azureuser@<VM_PUBLIC_IP>` (key only; password login is off) |
| Firewall (NSG `vm-career-platformNSG`) | `Allow-SSH-Laptop` (300, port 22, from `<LAPTOP_IP>/32` only, your home IPv4 as of 2026-10-08) and `Allow-HTTP-80` (310, port 80, from anywhere). There's no rule for port 8000. |
| What's running now | `next-server` (PID 670) on `127.0.0.1:8000`. Nothing on port 80. From the laptop, both `:80` and `:8000` time out. |
| App folder | `/home/azureuser/career-platform` (code, `.env`, `.venv`, `data/career_platform.db`) |

## Before you start: four things to know

1. **`Allow-HTTP-80` at priority 310 already exists.** It allows port 80 from anywhere, which is exactly the rule you planned to add. Azure won't accept a second rule with that name, so leave it as it is. Task 5 only checks it.
2. **The app is Node.js. Python isn't part of running it.** The site runs on `next start`. `pyproject.toml` lists no dependencies and the service doesn't use `.venv`. This plan leaves `.venv` as it is.
3. **The current copy may not really be hand-started.** PID 670 is a very low number and the VM has been up 6 days, so something probably started it at boot, such as an older `career-platform.service`. That's why Task 1 turns off any old service *before* killing processes. Otherwise systemd would just restart what you killed.
4. **The service is called `career-platform@8000` and `career-platform@8001`.** You asked that any service be named `career-platform`. Since "one crash doesn't take the whole site down" needs two running copies, this plan uses one systemd *template* named `career-platform@.service` and runs it twice. The `@8000` or `@8001` part is the port each copy uses.

## Global Constraints

- Visitors use `http://<VM_PUBLIC_IP>`, with no port number.
- The site starts at boot, restarts after a crash, and one crash doesn't take the whole site down.
- Port 8000 stays closed to the Internet. The app listens only on `127.0.0.1`.
- The app runs as `azureuser`, not root.
- Use the code, `.venv`, and database already in `~/career-platform`. No new clone and no database setup. Never run `pnpm db:migrate`.
- Don't change any file tracked in the repo, and don't add tests. (This plan edits `.env`, which git ignores, and rebuilds `.next/`, which is build output.)
- No crash or reboot tests. You'll run those yourself.
- On the VM, every `pnpm build` needs `NODE_OPTIONS=--max-old-space-size=1536`, or it runs out of memory.

## Review Focus

- **Contact-form rate limit:** The limit is kept in each copy's memory (`lib/security/rate-limit.ts`). With two copies, a visitor can send up to 10 messages an hour instead of 5. This is acceptable for now. Just be aware of it.
- **Two copies writing to one SQLite file:** SQLite allows this, but if two writes land at the same moment, one may fail with "database is locked". This is unlikely at this traffic level. If it happens, `journalctl` will show it.
- **Visitors faking their IP:** nginx must *replace* any `X-Forwarded-For` header a visitor sends, not add to it. Otherwise a visitor could get around the rate limit. Task 4's config uses `$remote_addr` for this.
- **Uploads up to 10 MiB:** nginx's default upload limit is 1 MiB. Task 4 raises it to `11m` to match `next.config.ts`.
- **Running out of memory:** Two copies on 1 GiB of RAM is tight. Task 3 checks `free -h`. If swap use keeps climbing, go back to one copy.

---

**Where things run:** "Laptop" means your Mac's Terminal. "VM" means after you've SSHed in (`azureuser@vm-career-platform:~$`). "Portal" means portal.azure.com.

### Task 1: Find and stop the copy that's running now (≈3 min)

**Why:** Only one program can use a given port at a time. The running copy also uses memory the build in Task 2 needs. This task only looks, then stops things. It changes nothing else.

- [ ] **Step 1: SSH in.** *Laptop:* `ssh -i ~/.ssh/isba4775_azure azureuser@<VM_PUBLIC_IP>`
- [ ] **Step 2: Look at what's running.** *VM:*
  ```bash
  sudo ss -ltnp | grep -E ':(80|3000|8000|8001)\b'
  ps -u azureuser -o pid,lstart,cmd | grep -E 'next|node' | grep -v grep
  systemctl list-unit-files 'career-platform*' --no-pager
  systemctl status <PID> --no-pager | head -3     # use a PID from the line above
  which node
  ```
  Then save what you saw, so you can put it back later if needed:
  ```bash
  { date; sudo ss -ltnp; ps -ef --forest | grep -B3 -E 'next|node' | grep -v grep; systemctl list-unit-files 'career-platform*' --no-pager; dpkg -s nginx 2>&1 | grep -E '^Status|not installed'; } > ~/before-operate-vm.txt
  ```
  **What you'll see:** which program holds each port, the PID and start time of any `next` process, and any existing `career-platform` unit. The `systemctl status <PID>` line names the unit that started the process. If it names a `.service`, systemd started it. If it names a `session-N.scope`, someone started it by hand over SSH. The last line shows Node's path (expected: `/usr/bin/node`). Write down the PIDs.
- [ ] **Step 3: Turn off any older `career-platform.service` first.** Your docs describe one on port 3000. Do this before killing anything, because a service with `Restart=always` would bring a killed process straight back. *VM:*
  ```bash
  sudo systemctl disable --now career-platform.service 2>/dev/null
  [ -f /etc/systemd/system/career-platform.service ] && sudo mv /etc/systemd/system/career-platform.service ~/career-platform.service.old
  sudo systemctl daemon-reload
  ```
- [ ] **Step 4: Stop anything still running.** *VM:* rerun Step 2's `ps` line. For each `next` PID still listed, run `kill <PID>`. If it was started in a `tmux` or `screen` window, you can also go to that window and press Ctrl+C.
- [ ] **Check:** Run Step 2's first two commands again. Nothing should be listening on 3000, 8000 or 8001, and there should be no `next` process. The site is now down until Task 3.
- **Undo (VM):** this puts back whichever way the site ran before, as recorded in `~/before-operate-vm.txt`. Undo Task 3 first, or the old copy can't get port 8000.
  - If an old service was moved to your home folder, put it back and start it:
    ```bash
    sudo mv ~/career-platform.service.old /etc/systemd/system/career-platform.service
    sudo systemctl daemon-reload && sudo systemctl enable --now career-platform
    ```
  - If it was started by hand, start it the same way. It was listening on `127.0.0.1:8000`:
    ```bash
    cd ~/career-platform && nohup node_modules/.bin/next start -H 127.0.0.1 -p 8000 > ~/next-manual.log 2>&1 &
    ```
  - **Check:** `curl -s http://127.0.0.1:8000/api/health; echo` prints `{"status":"ok"}`, and `sudo ss -ltnp | grep 8000` matches the line saved in `~/before-operate-vm.txt`.

#### Results (ran 2026-10-08, ~16:50 UTC)

**Done.** The site is now intentionally down until Task 3 starts the new services.

- **Step 1 (Laptop):** SSH worked with the key, from home IP `<LAPTOP_IP>`.
- **Step 2 (VM):** what was running before:
  - **Port 8000:** `next-server (v16.3.7)`, PID 670, listening on `127.0.0.1:8000` only. Nothing was on 80, 3000 or 8001.
  - **What started it:** `systemctl status 670` named **`career-platform.service`**, which was enabled and active since Thu 2026-10-01 21:03 UTC, i.e. started at boot. Nobody had started it by hand.
  - **The old unit's settings:** it already ran as `User=azureuser` with `next start -H 127.0.0.1 -p 8000` and `Restart=on-failure`. It was one copy only, with nothing on port 80.
  - **Node:** `which node` printed `/usr/bin/node`, which matches Task 3's `ExecStart`.
  - **The saved record:** `~/before-operate-vm.txt` was written. It shows the port-8000 line, `career-platform.service enabled`, and **nginx: not installed**. That last fact means Task 4's undo should purge nginx.
- **Step 3 (VM):** `systemctl disable --now career-platform.service` printed `Removed ".../multi-user.target.wants/career-platform.service"`. The unit file is now at `~/career-platform.service.old`, owned by root and 313 bytes. `daemon-reload` ran.
- **Step 4 (VM):** no `next` process was left, so nothing needed killing.
- **Check (VM):**
  - `ss` shows nothing listening on 80, 3000, 8000 or 8001.
  - `ps` shows no `next` process.
  - `systemctl list-unit-files 'career-platform*'` lists 0 unit files.
- **Undo, if needed:** use the first undo option, "old service was moved", because a service had been running it.

### Task 2: Give the site its public address and rebuild (≈6 min)

**Why:** The app uses `NEXT_PUBLIC_SITE_URL` for links, the sitemap and sign-in emails. Next.js bakes `NEXT_PUBLIC_*` values in when it *builds*, so changing the value means rebuilding.

- [ ] **Step 1: Set the address.** *VM:* the first line saves a copy of `.env` for the undo.
  ```bash
  cd ~/career-platform
  cp -p .env ~/env.before-operate-vm
  grep -q '^NEXT_PUBLIC_SITE_URL=' .env \
    && sed -i 's|^NEXT_PUBLIC_SITE_URL=.*|NEXT_PUBLIC_SITE_URL=http://<VM_PUBLIC_IP>|' .env \
    || echo 'NEXT_PUBLIC_SITE_URL=http://<VM_PUBLIC_IP>' >> .env
  grep -E '^(NEXT_PUBLIC_SITE_URL|DATABASE_URL)=' .env
  ```
  **Check:** It prints `NEXT_PUBLIC_SITE_URL=http://<VM_PUBLIC_IP>` and your existing `DATABASE_URL`, which should point at `data/career_platform.db`. Don't change `DATABASE_URL`.
- [ ] **Step 2: Build.** *VM:* `NODE_OPTIONS=--max-old-space-size=1536 pnpm build`
  **Check:** The output ends with the route table, and `ls .next/BUILD_ID` succeeds. If you see `Killed`, run `free -h` and make sure nothing from Task 1 is still running.
- **Undo (VM):** put the saved `.env` back and rebuild, so the build uses the old address again. Stop the services first (Task 3's undo) so the build has enough memory.
  ```bash
  cd ~/career-platform
  cp -p ~/env.before-operate-vm .env
  NODE_OPTIONS=--max-old-space-size=1536 pnpm build
  ```
  **Check:** `diff ~/env.before-operate-vm .env` prints nothing, and the build ends with the route table.

#### Results (ran 2026-10-08, ~16:51–16:52 UTC)

**Done.** The new build is ready on disk. Nothing is serving it yet; Task 3 starts that.

- **Step 1 (VM):**
  - **Backup:** `.env` was copied to `~/env.before-operate-vm`. Both files are mode `600` and owned by `azureuser`.
  - **The address:** before, it was `NEXT_PUBLIC_SITE_URL=http://<VM_PUBLIC_IP>:8000`. Now it's `http://<VM_PUBLIC_IP>`.
  - **Check:** `diff` shows that one line as the only change. `DATABASE_URL` is unchanged at `file:/home/azureuser/career-platform/data/career_platform.db`.
- **Step 2 (VM):** ran `NODE_OPTIONS=--max-old-space-size=1536 pnpm build`, with the full log at `~/build-operate-vm.log`. Before the build, `free -h` showed 669 MiB available and 2 GiB of swap.
- **Check (VM):**
  - **Build:** exit code 0, and the output ends with the route table (24 routes, including `/api/health`). The log has no `Killed`.
  - **Build ID:** `.next/BUILD_ID` exists and contains `VrUH0qAOGGbBHvk9L-uQq`.
  - **The new address is built in:** `http://<VM_PUBLIC_IP>` appears in `.next/server/app/robots.txt.body`, and no file under `.next/server` or `.next/static` still contains `<VM_PUBLIC_IP>:8000`.
- **Undo, if needed:** as written above. The backup is at `~/env.before-operate-vm`.

### Task 3: Run two copies with systemd (≈4 min)

**Why:** systemd is Linux's service manager. A *unit file* tells it which program to run, as which user, and what to do when the program stops. `Restart=always` restarts the app after a crash, and `enable` starts it at boot. `-H 127.0.0.1` means the app only accepts connections from the VM itself, so port 8000 can't be reached from the Internet even if a firewall rule is wrong. `%i` is replaced with the text after `@`, which here is the port.

- [ ] **Step 1: Create the template.** *VM:*
  ```bash
  sudo tee /etc/systemd/system/career-platform@.service > /dev/null <<'EOF'
  [Unit]
  Description=Career platform (Next.js) on 127.0.0.1:%i
  After=network.target

  [Service]
  User=azureuser
  WorkingDirectory=/home/azureuser/career-platform
  Environment=NODE_ENV=production
  ExecStart=/usr/bin/node node_modules/next/dist/bin/next start -H 127.0.0.1 -p %i
  Restart=always
  RestartSec=3

  [Install]
  WantedBy=multi-user.target
  EOF
  sudo systemctl daemon-reload
  sudo systemctl enable --now career-platform@8000 career-platform@8001
  ```
  If `which node` in Task 1 printed something other than `/usr/bin/node`, use that path in `ExecStart`.
- [ ] **Check:** *VM:*
  ```bash
  systemctl is-active  career-platform@8000 career-platform@8001   # active, active
  systemctl is-enabled career-platform@8000 career-platform@8001   # enabled, enabled
  sudo ss -ltnp | grep -E ':800[01]\b'                             # both on 127.0.0.1 only
  ps -o user= -p "$(systemctl show -p MainPID --value career-platform@8000)"  # azureuser
  curl -s http://127.0.0.1:8000/api/health; echo                   # {"status":"ok"}
  curl -s http://127.0.0.1:8001/api/health; echo                   # {"status":"ok"}
  free -h                                                          # some memory still free
  ```
  If a copy isn't active, run `journalctl -u career-platform@8000 -n 50 --no-pager` to see why.
- **Undo (VM):** stop both copies, keep them from starting at boot, and delete the template.
  ```bash
  sudo systemctl disable --now career-platform@8000 career-platform@8001
  sudo rm /etc/systemd/system/career-platform@.service
  sudo systemctl daemon-reload
  ```
  **Check:** `systemctl list-unit-files 'career-platform*' --no-pager` no longer lists `career-platform@.service`, and `sudo ss -ltnp | grep -E ':800[01]\b'` prints nothing.

#### Results (ran 2026-10-08, ~16:53 UTC)

**Done.** The site is back up inside the VM as two copies. It isn't reachable from outside yet; Task 4 adds nginx.

- **Step 1 (VM):**
  - **The template:** wrote `/etc/systemd/system/career-platform@.service` exactly as above (`cat` confirmed it). `/usr/bin/node` matched Task 1's `which node`, so `ExecStart` didn't need changing.
  - **Starting both copies:** `daemon-reload` ran, then `enable --now` printed `Created symlink .../multi-user.target.wants/career-platform@8000.service` and the same for `@8001`.
- **Check (VM):**
  - **Running and starting at boot:** `is-active` shows `active` for both, and `is-enabled` shows `enabled` for both.
  - **Only reachable from inside the VM:** `ss` shows `127.0.0.1:8000` (PID 36956) and `127.0.0.1:8001` (PID 36957). Neither listens on `0.0.0.0`.
  - **Not root:** both processes run as `azureuser` (uid 1000).
  - **Health:** both copies answered `{"status":"ok"}` at `/api/health`.
  - **No crashes on startup:** `NRestarts=0` for both. The logs show each copy `✓ Ready in 217ms` at 16:53:44.
  - **Memory:** `free -h` shows 537 MiB still available, with only 29 MiB of the 2 GiB swap in use. That's enough for two copies.
- **Undo, if needed:** as written above.

### Task 4: Put nginx in front on port 80 (≈4 min)

**Why:** A web address without a port number means port 80. Only root can listen on ports below 1024, so instead of running the app as root, nginx takes port 80 and passes each request to the app. nginx's main process starts as root to claim the port, and its worker processes run as `www-data`. The app itself never runs as root. The `upstream` block lists both copies. If one doesn't answer, `proxy_next_upstream` retries the request on the other copy.

- [ ] **Step 1: Install nginx.** *VM:* `sudo apt-get update && sudo apt-get install -y nginx`
- [ ] **Step 2: Write the site config and turn off the default page.** *VM:*
  ```bash
  sudo tee /etc/nginx/sites-available/career-platform > /dev/null <<'EOF'
  upstream career_platform {
      server 127.0.0.1:8000 max_fails=1 fail_timeout=10s;
      server 127.0.0.1:8001 max_fails=1 fail_timeout=10s;
  }

  server {
      listen 80 default_server;
      listen [::]:80 default_server;
      server_name _;
      client_max_body_size 11m;

      location / {
          proxy_pass http://career_platform;
          proxy_next_upstream error timeout http_502;
          proxy_set_header Host $host;
          proxy_set_header X-Forwarded-For $remote_addr;
          proxy_set_header X-Real-IP $remote_addr;
          proxy_set_header X-Forwarded-Proto $scheme;
      }
  }
  EOF
  sudo ln -sf /etc/nginx/sites-available/career-platform /etc/nginx/sites-enabled/career-platform
  sudo rm -f /etc/nginx/sites-enabled/default
  sudo nginx -t && sudo systemctl reload nginx
  sudo systemctl enable nginx
  ```
- [ ] **Check:** *VM:*
  ```bash
  sudo nginx -t                                   # "syntax is ok" / "test is successful"
  systemctl is-enabled nginx                      # enabled
  curl -s http://127.0.0.1/api/health; echo       # {"status":"ok"}
  curl -s http://127.0.0.1/ | grep -o '<title>[^<]*' | head -1   # your site's title
  ```
- **Undo (VM):** turn off this site and bring back nginx's default page.
  ```bash
  sudo rm -f /etc/nginx/sites-enabled/career-platform /etc/nginx/sites-available/career-platform
  sudo ln -sf /etc/nginx/sites-available/default /etc/nginx/sites-enabled/default
  sudo nginx -t && sudo systemctl reload nginx
  ```
  Then check `~/before-operate-vm.txt`. If it says nginx was **not installed** before, remove it completely, which also frees port 80:
  ```bash
  sudo apt-get purge -y nginx nginx-common && sudo apt-get autoremove -y
  ```
  **Check:** `curl -s http://127.0.0.1/ | grep -o '<title>[^<]*'` shows `Welcome to nginx` if you kept nginx. If you purged it, `curl` fails with "Connection refused" and `sudo ss -ltnp | grep ':80\b'` prints nothing.

#### Results (ran 2026-10-08, ~16:55 UTC)

**Done.** On the VM itself, port 80 now serves the site through nginx. Task 5 checks it from the Internet.

- **Step 1 (VM):**
  - **Install:** `apt-get update && apt-get install -y nginx` exited 0. It reported `2 newly installed` (`nginx` and `nginx-common`, version `1.24.0-2ubuntu7.18`), and the log is at `~/apt-operate-vm.log`.
  - **nginx is new to this VM:** Task 1 recorded that it wasn't installed before, so Task 4's undo should use the full purge.
- **Step 2 (VM):**
  - **The config:** wrote `/etc/nginx/sites-available/career-platform` exactly as above and linked it into `sites-enabled`.
  - **The default page:** removed `sites-enabled/default`, so `sites-enabled` now holds only `career-platform`.
  - **Turning it on:** `nginx -t` passed, nginx reloaded, and `systemctl enable nginx` ran.
- **Check (VM):**
  - **The config:** `nginx -t` printed `syntax is ok` and `test is successful`.
  - **Running and starting at boot:** nginx is `enabled` and `active`.
  - **Health through nginx:** `curl http://127.0.0.1/api/health` returned `{"status":"ok"}`.
  - **The home page through nginx:** the page title is `Nicholas Chabot — Information Systems &amp; Business Analytics student at Loyola Marymount University`.
  - **Ports:** `ss` shows nginx on `0.0.0.0:80` and `[::]:80`. The app is still only on `127.0.0.1:8000` and `127.0.0.1:8001`.
  - **Who runs what:** the nginx master process runs as `root`, and its 2 worker processes run as `www-data`. The app processes are unchanged and still run as `azureuser`.
- **Undo, if needed:** as written above, including the `apt-get purge` step, because nginx was not installed before.

### Task 5: Open port 80 and check from outside (≈3 min)

**Why:** Azure's firewall (the NSG) sits in front of the VM. Until it allows port 80, visitors can't reach nginx.

- [ ] **Step 1: Firewall rule.** *Portal:* open `vm-career-platformNSG` → Inbound security rules and confirm that `Allow-HTTP-80` (priority 310, port 80, source Any, Allow) is there. It already existed on 2026-10-08, so you have nothing to add unless someone deleted it. In that case, add it back with exactly those values. Don't add any rule for port 8000.
- [ ] **Check:** *Laptop:*
  ```bash
  az network nsg rule list -g rg-career-platform --nsg-name vm-career-platformNSG \
    --query "[].{name:name,prio:priority,port:destinationPortRange,src:sourceAddressPrefix}" -o table
  curl -s http://<VM_PUBLIC_IP>/api/health; echo                                    # {"status":"ok"}
  curl -s -o /dev/null -w '%{http_code}\n' --max-time 5 http://<VM_PUBLIC_IP>:8000  # 000 (unreachable)
  ```
  Then open `http://<VM_PUBLIC_IP>` in a browser. The table should list port 80 from `*` and nothing for 8000.
- **Undo (Portal):** usually there's nothing to undo, because this task only checks a rule that already existed. Only if you added `Allow-HTTP-80` back in Step 1 should you delete it: `vm-career-platformNSG` → Inbound security rules → `Allow-HTTP-80` → Delete. While it's gone, nobody on the Internet can reach the site.
  **Check (Laptop):** the `az network nsg rule list` command above no longer lists `Allow-HTTP-80`, and `curl --max-time 5 http://<VM_PUBLIC_IP>/` times out.

#### Results (ran 2026-10-08, ~16:57 UTC)

**Done.** The site is public at `http://<VM_PUBLIC_IP>`.

- **Step 1 (checked with `az` from the laptop, read-only, instead of the Portal):**
  - **`Allow-HTTP-80`:** priority 310, Inbound, Allow, port 80, source `*`. It's still there, so nothing needed adding.
  - **`Allow-SSH-Laptop`:** priority 300, port 22, source `<LAPTOP_IP>/32`.
  - **Port 8000:** no rule exists for it.
  - **Changes:** none were made in Azure during this task.
- **Check (Laptop):**
  - **Health:** `curl http://<VM_PUBLIC_IP>/api/health` returned `{"status":"ok"}`.
  - **The home page:** `http://<VM_PUBLIC_IP>/` returned HTTP `200` with the page title `Nicholas Chabot — Information Systems &amp; Business Analytics student at Loyola Marymount University`.
  - **Ports 8000 and 8001 are closed:** `curl --max-time 5 http://<VM_PUBLIC_IP>:8000` printed `000`, meaning it timed out and was unreachable. `:8001` printed `000` too.
  - **Extra check, links use the new address:** `robots.txt` says `Sitemap: http://<VM_PUBLIC_IP>/sitemap.xml`, and the sitemap's links are `http://<VM_PUBLIC_IP>/...`, with no `:8000`.
  - **Still to do yourself:** open `http://<VM_PUBLIC_IP>` in a browser.
- **Undo, if needed:** nothing. This task changed nothing.

## Restart check (after your reboot)

**Why:** this shows the site comes back on its own after the VM restarts, with nobody logging in to start it. The reboot itself was yours; these checks only look and change nothing.

**Where and how:**
- **VM:**
  ```bash
  uptime -s; who -b; last -x reboot | head -3
  systemctl show -p ActiveEnterTimestamp,ActiveState,NRestarts,MainPID career-platform@8000 career-platform@8001 nginx
  curl -s -D - -o /tmp/home.html http://127.0.0.1/ | grep -iE '^(HTTP|server)'; grep -o 'Nicholas Chabot' /tmp/home.html | head -1
  ```
- **Laptop:**
  ```bash
  curl -s -D - -o home.html http://<VM_PUBLIC_IP>/ | grep -iE '^(HTTP|server)'; grep -o '<title>[^<]*' home.html
  ```

#### Results (checked 2026-10-08, 16:59 UTC)

| What | Result |
|---|---|
| VM last booted | **2026-10-08 16:58:23 UTC**. `uptime -s` and `who -b` agree. `last -x reboot` shows the previous boot ran from Oct 1 21:03 to Oct 8 16:58. |
| `career-platform@8000` started | **16:58:34 UTC** (11 s after boot). `active`, PID 668, `NRestarts=0` |
| `career-platform@8001` started | **16:58:34 UTC**. `active`, PID 669, `NRestarts=0` |
| `nginx` started | **16:58:35 UTC**. `active`, PID 754 |
| Through nginx on the VM (`http://127.0.0.1/`) | `HTTP/1.1 200 OK`, `Server: nginx/1.24.0 (Ubuntu)`, and the page contains `Nicholas Chabot` |
| Through nginx from the laptop (`http://<VM_PUBLIC_IP>/`) | `HTTP/1.1 200 OK`, `Server: nginx/1.24.0 (Ubuntu)`, and the title is `Nicholas Chabot — Information Systems &amp; Business Analytics student at Loyola Marymount University` |

**What this shows:** the app and nginx started at boot by themselves, as `enable` intended. The `Server: nginx` header shows visitors are reaching the app through nginx, not directly. The old `career-platform.service` didn't come back: only the `career-platform@.service` template is listed.

### Crash check: `kill -9` one copy

**Why:** this shows that one crash doesn't take the site down. The site has no Uvicorn and no main-plus-workers setup: it's Next.js, and each copy is a single `next-server` process. So the test kills one whole copy (`career-platform@8001`) while the other keeps serving. There's also no plain `career-platform` unit any more, so status uses `career-platform@*`.

**Where and how (VM):**
```bash
P=$(systemctl show -p MainPID --value career-platform@8001); kill -9 $P
sleep 1; curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1/; systemctl is-active career-platform@8001
sleep 4; systemctl show -p NRestarts,MainPID career-platform@8000 career-platform@8001
curl -s http://127.0.0.1:8001/api/health; echo
systemctl status 'career-platform@*' --no-pager -n 4
```

#### Results (ran 2026-10-08, 17:03 UTC)

| What | Result |
|---|---|
| Killed | PID **669** (`career-platform@8001`) with `kill -9` at **17:03:28** |
| 1 s later, the site through nginx | **`200`**. The other copy served it. `@8001` showed `activating`. |
| `@8001` back | **17:03:31** (3 s, the `RestartSec=3`) with new PID **1367**, `NRestarts=1`, `Ready in 143ms`, and `/api/health` returned `{"status":"ok"}` |
| `@8000` | Untouched: PID 668, `NRestarts=0`, active since 16:58:34 |
| From the laptop afterwards | `http://<VM_PUBLIC_IP>/` returned `200` |

## Record: ports, addresses and firewall (2026-10-08, 17:05 UTC)

**Why:** this is a snapshot of how the VM looks after the plan. Later, you can compare against it to spot anything that changed or got opened by mistake. "Listening" means a program is waiting for connections on that port. The *address* says who can reach it: `127.0.0.x` means only the VM itself, while `0.0.0.0` or `[::]` means any network the VM is on, though Azure's firewall still decides what gets through from the Internet.

### Listening ports

**Where and how (VM):** `sudo ss -ltnp`

| Address : port | Program (PID) | Reachable from | Why it's there |
|---|---|---|---|
| `0.0.0.0:80`, `[::]:80` | `nginx` (754 master, 755/756 workers) | Internet (NSG allows 80) | Serves the site to visitors and forwards to the app (Task 4) |
| `0.0.0.0:22`, `[::]:22` | `sshd` (1035), with socket held by `systemd` (1) | Only your laptop's IP (NSG) | Remote login for admin work |
| `127.0.0.1:8000` | `next-server` (668), `career-platform@8000` | The VM only | App copy 1 (Task 3) |
| `127.0.0.1:8001` | `next-server` (1367), `career-platform@8001` | The VM only | App copy 2 (Task 3). PID changed after the crash check. |
| `127.0.0.53%lo:53`, `127.0.0.54:53` | `systemd-resolve` (492) | The VM only | Ubuntu's built-in DNS helper. It looks up domain names for programs on the VM. |

Nothing else is listening. PIDs change after restarts; the addresses and programs shouldn't.

### IP addresses

**Where and how (Laptop):** `az vm list-ip-addresses -g rg-career-platform -n vm-career-platform -o table`. The VM also shows its private IP with `ip -4 -br addr`.

| | Address | What it is |
|---|---|---|
| Private IP | `10.0.0.4` (on `eth0`, subnet `/24`) | The VM's address inside its Azure virtual network. It can't be reached from the Internet. |
| Public IP | `<VM_PUBLIC_IP>` | The address visitors and SSH use. Get the real value with `az vm show -d -g rg-career-platform -n vm-career-platform --query publicIps -o tsv`. |

### Inbound firewall rules (NSG `vm-career-platformNSG`)

**Where and how (Laptop):** `az network nsg rule list -g rg-career-platform --nsg-name vm-career-platformNSG --include-default -o table`. Rules are checked from the lowest priority number up, and the first match wins.

| Priority | Name | Allows | From | Why it exists |
|---|---|---|---|---|
| 300 | `Allow-SSH-Laptop` | TCP 22 (SSH) | `<LAPTOP_IP>/32` only | So you can log in to manage the VM, from your own machine and nowhere else. Update it when your IP changes. |
| 310 | `Allow-HTTP-80` | TCP 80 (HTTP) | Any | So anyone on the Internet can view the site through nginx |
| 65000 | `AllowVnetInBound` | All | Azure virtual network | Azure default. Lets machines in the same private network talk to each other. |
| 65001 | `AllowAzureLoadBalancerInBound` | All | Azure load balancer | Azure default. Lets Azure's health probes reach the VM. |
| 65500 | `DenyAllInBound` | Nothing (Deny) | Any | Azure default. Blocks everything not allowed above, which is why ports 8000 and 8001 are closed. |

The three 65000+ rules are built into every NSG and can't be deleted, only overridden by lower-numbered rules.

## Undoing the whole plan

**Why the order matters:** each task builds on the one before it. Task 1 frees port 8000, Task 3 takes it, and Task 4 depends on Task 3. Undo in reverse order, **5 → 4 → 3 → 2 → 1**, using each task's **Undo** above. Otherwise two things will fight over the same port, or the build will run out of memory. If you only want to undo part of the plan, start at Task 5 and stop after the task you want to remove.

When you've finished, check that everything is back where it was. *VM:* run `sudo ss -ltnp` and compare it with the first part of `~/before-operate-vm.txt`. The same ports should be in use. You can then delete the backups: `rm ~/before-operate-vm.txt ~/env.before-operate-vm`.

## Not in this plan

- Crash and reboot tests (you're running them).
- HTTPS and a domain name. Browsers will show "Not secure" until you add them.
- Supabase sign-in: add `http://<VM_PUBLIC_IP>/auth/callback` to Supabase's Redirect URLs, or the emailed sign-in link won't work at the new address.
- `docs/operations.md` still says the app runs on port 3000. Update it later, since this plan doesn't touch repo files.
