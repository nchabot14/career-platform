import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { getDatabaseUrl } from "@/lib/db/database-url";
import * as schema from "@/lib/db/schema";

export const databaseClient = postgres(getDatabaseUrl(), { max: 10, onnotice: () => {} });

export const db = drizzle(databaseClient, { schema });
