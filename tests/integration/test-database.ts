// @vitest-environment node

import { afterEach, beforeAll } from "vitest";
import { migrate } from "drizzle-orm/libsql/migrator";
import { db, databaseClient } from "@/lib/db/client";

// Children are listed before parents so foreign keys never block a delete.
const tables = [
  "application_activity",
  "application_document",
  "application_contact",
  "job_application",
  "contact_message",
  "social_link",
  "resume_document",
  "project",
  "skill",
  "education",
  "experience",
  "profile",
];

let databaseReady: Promise<void> | undefined;

function requireTestDatabaseUrl() {
  if (!process.env.DATABASE_URL?.includes("test")) {
    throw new Error(
      "Integration tests delete every row after each test. Set DATABASE_URL to a dedicated test database (for example file:./data/career_platform.test.db) or run pnpm test:integration.",
    );
  }
}

async function ensureDatabaseReady() {
  if (!databaseReady) {
    databaseReady = migrate(db, { migrationsFolder: "drizzle" });
  }

  await databaseReady;
}

beforeAll(async () => {
  requireTestDatabaseUrl();
  await ensureDatabaseReady();
}, 30_000);

afterEach(async () => {
  await databaseClient.batch(
    tables.map((table) => `DELETE FROM ${table}`),
    "write",
  );
}, 30_000);
