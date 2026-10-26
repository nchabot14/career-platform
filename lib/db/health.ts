import { sql } from "drizzle-orm";
import { db } from "@/lib/db/client";

// A slow answer counts as down, so a hung connection can't hold a page
// request open for the driver's 30-second connect timeout.
export async function databaseIsReachable(timeoutMs = 2000): Promise<boolean> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("database check timed out")), timeoutMs);
  });

  try {
    await Promise.race([db.execute(sql`select 1`), timeout]);
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}
