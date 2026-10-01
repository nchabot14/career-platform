import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { getDatabaseUrl } from "@/lib/db/database-url";
import * as schema from "@/lib/db/schema";

export const databaseClient = createClient({ url: getDatabaseUrl() });

export const db = drizzle(databaseClient, { schema });
