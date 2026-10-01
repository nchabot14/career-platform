// Rebuilds the throwaway end-to-end database and file store with fixed
// fixtures before the Playwright web server starts. Never point this at a
// real database: it deletes the target first.
import fs from "node:fs/promises";
import path from "node:path";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";

const databaseUrl = process.env.DATABASE_URL ?? "";
const filesDir = process.env.FILE_STORAGE_DIR ?? "";

if (!databaseUrl.includes("e2e") || !filesDir.includes("e2e")) {
  throw new Error("Refusing to prepare a database or file store without 'e2e' in its path.");
}

const databasePath = databaseUrl.replace(/^file:/, "");
await fs.rm(databasePath, { force: true });
await fs.rm(filesDir, { recursive: true, force: true });

const client = createClient({ url: databaseUrl });
await migrate(drizzle(client), { migrationsFolder: "drizzle" });

const now = Date.now();
const row = (values) => ({ id: crypto.randomUUID(), created_at: now, updated_at: now, ...values });

async function insert(table, values) {
  const record = row(values);
  const columns = Object.keys(record);
  await client.execute({
    sql: `INSERT INTO ${table} (${columns.join(", ")}) VALUES (${columns.map(() => "?").join(", ")})`,
    args: Object.values(record),
  });
}

await insert("profile", {
  name: "Ada Lovelace",
  headline: "Analyst of engines",
  summary: "Writes programs for machines that do not exist yet.",
  location: "London",
  availability: "Open to roles",
  visibility: "public",
  publication_state: "published",
});
await insert("experience", {
  employer: "Analytical Engines Ltd",
  title: "Programmer",
  start_date: "1842-01-01",
  end_date: null,
  description: "Wrote the first published algorithm.",
  highlights: JSON.stringify(["Note G"]),
  sort_order: 0,
  publication_state: "published",
});
await insert("project", {
  title: "Engine Notes",
  slug: "engine-notes",
  summary: "Annotated translation.",
  body: "Paragraph one.\n\n- First point\n- Second point",
  role: "Author",
  technologies: JSON.stringify(["Punch cards"]),
  links: JSON.stringify([]),
  sort_order: 0,
  publication_state: "published",
});
await insert("project", {
  title: "Secret Draft",
  slug: "secret-draft",
  summary: "Not ready.",
  body: "Hidden.",
  technologies: "[]",
  links: "[]",
  sort_order: 1,
  publication_state: "draft",
});

const pdf = new TextEncoder().encode("%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n");
await fs.mkdir(path.join(filesDir, "resumes"), { recursive: true });
await fs.writeFile(path.join(filesDir, "resumes", "e2e.pdf"), pdf);
await insert("resume_document", {
  storage_key: "resumes/e2e.pdf",
  filename: "ada.pdf",
  mime_type: "application/pdf",
  size: pdf.byteLength,
  is_current: 1,
  publication_state: "published",
});

client.close();
console.log("e2e database ready");
