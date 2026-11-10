// @vitest-environment node

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { expect, it } from "vitest";

// The EC2 server is set up from these tracked files. Each test pins a
// property the site depends on and that would only fail in production.
const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), "utf8");

it("systemd unit runs the app unprivileged on loopback", () => {
  const unit = read("deploy/aws/career-platform@.service");

  expect(unit).toContain("User=career-platform");
  expect(unit).toContain("WorkingDirectory=/srv/career-platform/current");
  expect(unit).toContain("Environment=NODE_EXTRA_CA_CERTS=/etc/ssl/rds/global-bundle.pem");
  expect(unit).toContain("Restart=always");
  expect(unit).toContain("next start -H 127.0.0.1 -p %i");
  expect(unit).not.toMatch(/EnvironmentFile=.*migrate\.env/);
});

it("nginx overwrites client IP headers and serves only nickchabot.com", () => {
  const config = read("deploy/aws/nginx-career-platform.conf");

  expect(config).toContain("proxy_set_header X-Real-IP $remote_addr;");
  expect(config).toContain("proxy_set_header X-Forwarded-For $remote_addr;");
  expect(config).not.toContain("$proxy_add_x_forwarded_for");
  expect(config).toContain("client_max_body_size 11m;");
  expect(config).toContain("server_name nickchabot.com;");
  expect(config).toContain("server 127.0.0.1:8000");
  expect(config).toContain("server 127.0.0.1:8001");

  const defaultServer = config.match(/server\s*\{[^}]*default_server[^}]*\}/)?.[0] ?? "";
  expect(defaultServer).toContain("return 404;");
});

it("deploy builds before it migrates, and migrates before it switches", () => {
  const script = read("deploy/aws/deploy.sh");
  const build = script.indexOf("pnpm build");
  const migrate = script.indexOf("scripts/migrate.mjs");
  const switchRelease = script.indexOf("ln -sfn");

  expect(build).toBeGreaterThan(-1);
  expect(migrate).toBeGreaterThan(build);
  expect(switchRelease).toBeGreaterThan(migrate);

  expect(script).toContain("set -euo pipefail");
  expect(script).toContain("NODE_OPTIONS=--max-old-space-size=1536");
  expect(script).toContain("pnpm install --frozen-lockfile");
  expect(script).toContain("migrate.env");
  expect(script).toContain("/api/health");
  expect(script).not.toMatch(/seed|prepare-database|copy-sqlite/i);

  expect(() => execFileSync("bash", ["-n", "deploy/aws/deploy.sh"])).not.toThrow();
});

it("deploy builds every release in a new directory, even for the same commit", () => {
  const script = read("deploy/aws/deploy.sh");

  // Redeploying the live commit (to pick up new NEXT_PUBLIC_* values) must
  // not rebuild inside the release that is serving traffic.
  expect(script).toMatch(/^release="\$app\/releases\/\$sha-\$\(date -u \+%Y%m%dT%H%M%SZ\)"$/m);
  expect(script).not.toMatch(/if \[\[ ! -d \$release \]\]/);
});

it("app role can only read and write rows", () => {
  const sql = read("deploy/aws/app-role.sql");

  expect(sql).toContain(
    "GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO career_platform_app",
  );
  expect(sql).toContain("ALTER DEFAULT PRIVILEGES FOR ROLE career_platform_admin");
  expect(sql).not.toMatch(/SUPERUSER|CREATEDB|CREATEROLE|ALL PRIVILEGES|GRANT CREATE/i);
});

it("fingerprint skips temporary schemas", () => {
  expect(read("scripts/db-fingerprint.sql")).toMatch(/NOT LIKE\s+'pg_temp/);
});
