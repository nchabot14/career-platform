// One-off copy of the SQLite database and uploaded files from the Azure VM
// into PostgreSQL. Column names are identical in both schemas; only types
// change. Everything happens in one transaction, so a failure changes nothing.
//
// Usage:
//   TARGET_DATABASE_URL=postgres://... node scripts/copy-sqlite-to-postgres.mjs <career_platform.db> <files-dir> [--replace]
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@libsql/client";
import postgres from "postgres";

// Parents before children, so foreign keys are satisfied as rows arrive.
const tables = [
  "profile",
  "experience",
  "education",
  "skill",
  "project",
  "resume_document",
  "social_link",
  "contact_message",
  "job_application",
  "application_contact",
  "application_document",
  "application_activity",
];
const timestampColumns = new Set([
  "created_at",
  "updated_at",
  "submitted_at",
  "applied_at",
  "next_follow_up_at",
  "occurred_at",
]);
const booleanColumns = new Set(["is_current"]);
const jsonColumns = new Set(["highlights", "technologies", "links"]);

function convertRow(columns, values, sql) {
  const row = {};

  columns.forEach((column, index) => {
    const value = values[index];
    if (value === null || value === undefined) row[column] = null;
    else if (timestampColumns.has(column)) row[column] = new Date(Number(value));
    else if (booleanColumns.has(column)) row[column] = Number(value) === 1;
    else if (jsonColumns.has(column)) row[column] = sql.json(JSON.parse(String(value)));
    else row[column] = value;
  });

  return row;
}

export async function copySqliteToPostgres({ sqlite, sql, filesDir, replace = false, log = console.log }) {
  await sql.begin(async (tx) => {
    const nonEmpty = [];
    for (const table of [...tables, "stored_file"]) {
      const [{ count }] = await tx`SELECT count(*)::int AS count FROM ${tx(table)}`;
      if (count > 0) nonEmpty.push(`${table} (${count})`);
    }

    if (nonEmpty.length > 0 && !replace) {
      throw new Error(`Target database is not empty: ${nonEmpty.join(", ")}. Re-run with --replace to overwrite it.`);
    }
    if (replace) {
      await tx.unsafe(`TRUNCATE TABLE ${[...tables, "stored_file"].join(", ")} RESTART IDENTITY CASCADE`);
    }

    for (const table of tables) {
      // Activities keep their original order; Postgres numbers them as they arrive.
      const order = table === "application_activity" ? " ORDER BY occurred_at, rowid" : "";
      const result = await sqlite.execute(`SELECT * FROM ${table}${order}`);

      for (const values of result.rows) {
        const row = convertRow(result.columns, values, sql);
        await tx`INSERT INTO ${tx(table)} ${tx(row)}`;
      }
      log(`${table}: ${result.rows.length}`);
    }

    const keys = [];
    for (const table of ["resume_document", "application_document"]) {
      const result = await sqlite.execute(`SELECT storage_key FROM ${table}`);
      keys.push(...result.rows.map((values) => String(values[0])));
    }

    const missing = [];
    for (const key of keys) {
      let bytes;
      try {
        bytes = await fs.readFile(path.join(filesDir, key));
      } catch (error) {
        if (error.code === "ENOENT") {
          missing.push(key);
          continue;
        }
        throw error;
      }
      const now = new Date();
      await tx`INSERT INTO stored_file ${tx({ key, bytes, created_at: now, updated_at: now })}`;
    }

    if (missing.length > 0) {
      throw new Error(`Uploaded files are missing, so nothing was copied: ${missing.join(", ")}`);
    }
    log(`stored_file: ${keys.length}`);
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [sqlitePath, filesDir] = process.argv.slice(2).filter((arg) => !arg.startsWith("--"));
  const replace = process.argv.includes("--replace");
  const targetUrl = process.env.TARGET_DATABASE_URL;

  if (!sqlitePath || !filesDir || !targetUrl) {
    console.error(
      "Usage: TARGET_DATABASE_URL=postgres://... node scripts/copy-sqlite-to-postgres.mjs <career_platform.db> <files-dir> [--replace]",
    );
    process.exit(1);
  }

  const sqlite = createClient({ url: `file:${path.resolve(sqlitePath)}` });
  const sql = postgres(targetUrl, { max: 1, onnotice: () => {} });

  try {
    await copySqliteToPostgres({ sqlite, sql, filesDir: path.resolve(filesDir), replace });
    console.log("Copy complete.");
  } finally {
    sqlite.close();
    await sql.end();
  }
}
