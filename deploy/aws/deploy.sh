#!/usr/bin/env bash
# Deploys one git ref of career-platform on the EC2 server:
#   sudo /srv/career-platform/repo/deploy/aws/deploy.sh [ref]   (default: main)
#
# Each release is built in its own directory, so a failed build leaves the
# live site untouched. After a good build it applies migrations, points
# /srv/career-platform/current at the new release, and restarts the two
# copies one at a time. If a copy fails its health check, current goes back
# to the previous release. Migrations stay applied, so each one must keep
# working with the previous release's code.
set -euo pipefail

ref="${1:-main}"
app=/srv/career-platform
repo="$app/repo"
user=career-platform
ports=(8000 8001)
keep=3

if [[ $EUID -ne 0 ]]; then
  echo "Run with sudo." >&2
  exit 1
fi

as_app() { runuser -u "$user" -- "$@"; }

as_app git -C "$repo" fetch --prune origin
sha=$(as_app git -C "$repo" rev-parse --verify "origin/$ref^{commit}")
# A new directory every time, so redeploying the live commit (for example
# after changing a NEXT_PUBLIC_* value) never builds inside the live release.
release="$app/releases/$sha-$(date -u +%Y%m%dT%H%M%SZ)"
echo "Deploying $ref at $sha"

as_app git -C "$repo" worktree add --detach "$release" "$sha"
as_app ln -sf "$app/shared/.env" "$release/.env"

cd "$release"
as_app pnpm install --frozen-lockfile
as_app env NODE_OPTIONS=--max-old-space-size=1536 pnpm build

# The admin URL is read only here, in a shell that exits after migrating.
as_app bash -c 'set -a; . /srv/career-platform/shared/migrate.env; set +a
  NODE_EXTRA_CA_CERTS=/etc/ssl/rds/global-bundle.pem exec node scripts/migrate.mjs'

point_current() {
  as_app ln -sfn "$1" "$app/current.tmp"
  as_app mv -T "$app/current.tmp" "$app/current"
}

healthy() {
  for _ in $(seq 1 30); do
    curl -fsS "http://127.0.0.1:$1/api/health" > /dev/null 2>&1 && return 0
    sleep 2
  done
  return 1
}

previous=$(readlink -f "$app/current" 2> /dev/null || true)
point_current "$release"

for port in "${ports[@]}"; do
  systemctl restart "career-platform@$port"
  if ! healthy "$port"; then
    echo "career-platform@$port failed /api/health; rolling back." >&2
    if [[ -n $previous && $previous != "$release" ]]; then
      point_current "$previous"
    fi
    systemctl restart "${ports[@]/#/career-platform@}"
    exit 1
  fi
done

mapfile -t releases < <(ls -1dt "$app"/releases/*/ | tail -n +$((keep + 1)))
for dir in "${releases[@]}"; do
  dir="${dir%/}"
  [[ $dir == "$release" || $dir == "$previous" ]] && continue
  as_app git -C "$repo" worktree remove --force "$dir"
done

echo "Deployed $sha"
