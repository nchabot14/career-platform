import { defineConfig } from "drizzle-kit";
import { getDatabaseUrl } from "./lib/db/database-url";

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: getDatabaseUrl(),
  },
  verbose: true,
  strict: true,
});
