import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/lib/db/schema";

function getDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL is required for database access. Set it before running integration tests or using repositories.",
    );
  }

  return databaseUrl;
}

export const databaseClient = postgres(getDatabaseUrl(), {
  prepare: false,
});

export const db = drizzle(databaseClient, { schema });
