// Rebuilds the throwaway end-to-end database with fixed fixtures before the
// Playwright web server starts. Never point this at a real database: it
// drops every table first.
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";

const databaseUrl = process.env.DATABASE_URL ?? "";

if (!new URL(databaseUrl).pathname.includes("e2e")) {
  throw new Error("Refusing to prepare a database without 'e2e' in its name.");
}

// Migrations run on their own connection: drizzle() swaps a client's date
// and JSON serializers for pass-through ones, which breaks the raw inserts
// below if they share it.
const migrationClient = postgres(databaseUrl, { max: 1, onnotice: () => {} });
await migrationClient`DROP SCHEMA IF EXISTS drizzle CASCADE`;
await migrationClient`DROP SCHEMA IF EXISTS public CASCADE`;
await migrationClient`CREATE SCHEMA public`;
await migrate(drizzle(migrationClient), { migrationsFolder: "drizzle" });
await migrationClient.end();

const sql = postgres(databaseUrl, { max: 1, onnotice: () => {} });

const now = new Date();

async function insert(table, values) {
  const record = { id: crypto.randomUUID(), created_at: now, updated_at: now, ...values };
  await sql`INSERT INTO ${sql(table)} ${sql(record)}`;
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
  highlights: sql.json(["Note G"]),
  sort_order: 0,
  publication_state: "published",
});
await insert("project", {
  title: "Engine Notes",
  slug: "engine-notes",
  summary: "Annotated translation.",
  body: "Paragraph one.\n\n- First point\n- Second point",
  role: "Author",
  technologies: sql.json(["Punch cards"]),
  links: sql.json([]),
  sort_order: 0,
  publication_state: "published",
});
await insert("project", {
  title: "Secret Draft",
  slug: "secret-draft",
  summary: "Not ready.",
  body: "Hidden.",
  technologies: sql.json([]),
  links: sql.json([]),
  sort_order: 1,
  publication_state: "draft",
});

const pdf = new TextEncoder().encode("%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n");
await sql`INSERT INTO stored_file ${sql({ key: "resumes/e2e.pdf", bytes: Buffer.from(pdf), created_at: now, updated_at: now })}`;
await insert("resume_document", {
  storage_key: "resumes/e2e.pdf",
  filename: "ada.pdf",
  mime_type: "application/pdf",
  size: pdf.byteLength,
  is_current: true,
  publication_state: "published",
});

await sql.end();
console.log("e2e database ready");
