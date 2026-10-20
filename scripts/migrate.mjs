// Applies pending migrations from drizzle/. Railway runs this before each
// deploy goes live; a failure stops the deploy and leaves the old one serving.
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

const sql = postgres(url, { max: 1, onnotice: () => {} });

try {
  await migrate(drizzle(sql), { migrationsFolder: "drizzle" });
  console.log("Migrations applied.");
} finally {
  await sql.end();
}
