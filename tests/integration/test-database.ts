// @vitest-environment node

import { afterEach, beforeAll } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { sql } from "drizzle-orm";
import { db, databaseClient } from "@/lib/db/client";

const migrationPath = path.join(
  process.cwd(),
  "drizzle/0000_initial_schema.sql",
);

let databaseReady: Promise<void> | undefined;

function requireDatabaseUrl() {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL is required to run integration tests. Set DATABASE_URL before running pnpm test:integration.",
    );
  }
}

async function ensureDatabaseReady() {
  if (!databaseReady) {
    databaseReady = (async () => {
      const migrationSql = fs.readFileSync(migrationPath, "utf8");
      await databaseClient.unsafe(migrationSql);
    })();
  }

  await databaseReady;
}

beforeAll(async () => {
  requireDatabaseUrl();
  await ensureDatabaseReady();
}, 30_000);

afterEach(async () => {
  await db.execute(sql.raw(`
    TRUNCATE TABLE
      application_activity,
      application_document,
      application_contact,
      job_application,
      contact_message,
      social_link,
      resume_document,
      project,
      skill,
      education,
      experience,
      profile
    RESTART IDENTITY CASCADE
  `));
}, 30_000);
