// @vitest-environment node

import { afterEach, beforeAll } from "vitest";
import { sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { db } from "@/lib/db/client";

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
      "Integration tests delete every row after each test. Set DATABASE_URL to a dedicated test database (for example postgres://postgres:postgres@localhost:5432/career_platform_test) or run pnpm test:integration.",
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
  await db.execute(sql.raw(`TRUNCATE TABLE ${tables.join(", ")} RESTART IDENTITY CASCADE`));
}, 30_000);
