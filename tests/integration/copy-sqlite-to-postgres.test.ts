// @vitest-environment node

import "@/tests/integration/test-database";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createClient, type Client } from "@libsql/client";
import { asc, eq } from "drizzle-orm";
import postgres from "postgres";
import { afterEach, beforeEach, expect, it } from "vitest";
import { db } from "@/lib/db/client";
import {
  applicationActivities,
  contactMessages,
  experiences,
  profiles,
  resumeDocuments,
} from "@/lib/db/schema";
import { readStoredFile } from "@/lib/storage/files";
import { copySqliteToPostgres } from "@/scripts/copy-sqlite-to-postgres.mjs";

let dir: string;
let sqlite: Client;
let sql: postgres.Sql;
const quiet = () => {};
const created = Date.UTC(2026, 8, 1, 12, 0, 0, 123);
const applicationId = "6a0c3d5e-1111-4222-8333-944445555666";
const resumeBytes = new TextEncoder().encode("%PDF-1.7\nresume\n");
const docBytes = new TextEncoder().encode("Notes for the interview ✓\n");
const docKey = `application-documents/owner/${applicationId}/d1-notes.txt`;

async function row(table: string, values: Record<string, unknown>) {
  const record = { id: crypto.randomUUID(), created_at: created, updated_at: created, ...values };
  const columns = Object.keys(record);
  await sqlite.execute({
    sql: `INSERT INTO ${table} (${columns.join(", ")}) VALUES (${columns.map(() => "?").join(", ")})`,
    args: Object.values(record) as never,
  });
}

beforeEach(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), "copy-sqlite-"));
  sqlite = createClient({ url: `file:${path.join(dir, "source.db")}` });
  await sqlite.executeMultiple(await fs.readFile("scripts/sqlite-legacy-schema.sql", "utf8"));
  sql = postgres(process.env.DATABASE_URL!, { max: 1, onnotice: () => {} });

  await row("profile", {
    name: "Zoë Ångström", headline: "Analyst — “quoted” 🚀", summary: "Summary",
    location: null, availability: null, visibility: "public", publication_state: "published",
  });
  await row("experience", {
    employer: "Pioneer", title: "Intern", start_date: "2026-05-01", end_date: null,
    description: "Built things", highlights: JSON.stringify(["One", "Two ✓"]),
    sort_order: 0, publication_state: "published",
  });
  await row("resume_document", {
    storage_key: "resumes/r1.pdf", filename: "résumé.pdf", mime_type: "application/pdf",
    size: resumeBytes.byteLength, is_current: 1, publication_state: "published",
  });
  await row("contact_message", {
    sender_name: "Renée", sender_email: "renee@example.com", subject: "Hi 👋",
    message: "Ça va?", submitted_at: created, status: "unread", notification_status: "sent",
  });
  await row("job_application", {
    id: applicationId, company: "Acme", role: "Analyst", status: "applied",
    applied_at: created, notes: null,
  });
  for (const note of ["first", "second", "third"]) {
    await row("application_activity", {
      application_id: applicationId, type: "note", occurred_at: created, note,
    });
  }
  await row("application_document", {
    application_id: applicationId, storage_key: docKey, filename: "notes.txt",
    mime_type: "text/plain", size: docBytes.byteLength, category: "Notes",
  });

  await fs.mkdir(path.join(dir, "files/resumes"), { recursive: true });
  await fs.writeFile(path.join(dir, "files/resumes/r1.pdf"), resumeBytes);
  await fs.mkdir(path.join(dir, "files", path.dirname(docKey)), { recursive: true });
  await fs.writeFile(path.join(dir, "files", docKey), docBytes);
});

afterEach(async () => {
  sqlite.close();
  await sql.end();
  await fs.rm(dir, { recursive: true, force: true });
});

it("copies every row and file with types converted", async () => {
  await copySqliteToPostgres({ sqlite, sql, filesDir: path.join(dir, "files"), log: quiet });

  const [profile] = await db.select().from(profiles);
  expect(profile.name).toBe("Zoë Ångström");
  expect(profile.headline).toBe("Analyst — “quoted” 🚀");
  expect(profile.createdAt).toEqual(new Date(created));

  const [experience] = await db.select().from(experiences);
  expect(experience.highlights).toEqual(["One", "Two ✓"]);
  expect(experience.startDate).toBe("2026-05-01");

  const [resume] = await db.select().from(resumeDocuments);
  expect(resume.isCurrent).toBe(true);
  expect(resume.filename).toBe("résumé.pdf");

  const [message] = await db.select().from(contactMessages);
  expect(message.subject).toBe("Hi 👋");
  expect(message.submittedAt).toEqual(new Date(created));

  const activities = await db
    .select()
    .from(applicationActivities)
    .where(eq(applicationActivities.applicationId, applicationId))
    .orderBy(asc(applicationActivities.occurredAt), asc(applicationActivities.sequence));
  expect(activities.map((activity) => activity.note)).toEqual(["first", "second", "third"]);

  expect(await readStoredFile("resumes/r1.pdf")).toEqual(resumeBytes);
  expect(await readStoredFile(docKey)).toEqual(docBytes);
});

it("refuses to copy into a database that already has data", async () => {
  await copySqliteToPostgres({ sqlite, sql, filesDir: path.join(dir, "files"), log: quiet });

  await expect(
    copySqliteToPostgres({ sqlite, sql, filesDir: path.join(dir, "files"), log: quiet }),
  ).rejects.toThrow(/not empty/i);
  expect(await db.select().from(profiles)).toHaveLength(1);
});

it("replaces existing data when asked", async () => {
  await copySqliteToPostgres({ sqlite, sql, filesDir: path.join(dir, "files"), log: quiet });
  await copySqliteToPostgres({ sqlite, sql, filesDir: path.join(dir, "files"), replace: true, log: quiet });

  expect(await db.select().from(profiles)).toHaveLength(1);
  expect(await db.select().from(applicationActivities)).toHaveLength(3);
});

it("changes nothing when an uploaded file is missing", async () => {
  await copySqliteToPostgres({ sqlite, sql, filesDir: path.join(dir, "files"), log: quiet });
  await sqlite.execute({ sql: "UPDATE profile SET name = ?", args: ["Changed"] });
  await fs.rm(path.join(dir, "files", docKey));

  await expect(
    copySqliteToPostgres({ sqlite, sql, filesDir: path.join(dir, "files"), replace: true, log: quiet }),
  ).rejects.toThrow(docKey);
  expect((await db.select().from(profiles))[0].name).toBe("Zoë Ångström");
});
