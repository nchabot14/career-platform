// @vitest-environment node

import fs from "node:fs";
import path from "node:path";
import { expect, it } from "vitest";

// Every real row in production comes from the VM through
// scripts/copy-sqlite-to-postgres.mjs. Nothing that runs on deploy may
// insert data of its own.
const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), "utf8");

it("migrations only change schema", () => {
  const migrations = fs.readdirSync("drizzle").filter((file) => file.endsWith(".sql"));
  expect(migrations.length).toBeGreaterThan(0);

  for (const file of migrations) {
    expect(read(`drizzle/${file}`), file).not.toMatch(/\b(INSERT\s+INTO|COPY\s+\w+\s+FROM|UPDATE\s+\w+\s+SET)\b/i);
  }
});

it("the pre-deploy command only applies migrations", () => {
  const config = JSON.parse(read("railway.json"));

  expect(config.deploy.preDeployCommand).toEqual(["node scripts/migrate.mjs"]);
  expect(read("scripts/migrate.mjs")).not.toMatch(/insert|seed|prepare-database/i);
});

it("the container only starts the server", () => {
  const commands = read("Dockerfile")
    .split("\n")
    .filter((line) => line.startsWith("CMD"));
  const command = commands.at(-1) ?? "";

  expect(command).toContain("start");
  expect(command).not.toMatch(/seed|migrate|prepare-database|copy-sqlite/i);
});

it("no package script seeds", () => {
  const { scripts } = JSON.parse(read("package.json")) as { scripts: Record<string, string> };

  for (const [name, command] of Object.entries(scripts)) {
    expect(`${name}: ${command}`).not.toMatch(/seed|prepare-database/i);
  }
});
