import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { storedFiles } from "@/lib/db/schema";

// Uploaded files live in Postgres, so a deploy never loses them and one
// database backup covers everything. Keys are server-generated,
// slash-separated paths such as "resumes/<uuid>.pdf".
const safeKeyPattern = /^[A-Za-z0-9_-][A-Za-z0-9._-]*(?:\/[A-Za-z0-9_-][A-Za-z0-9._-]*)*$/;

function assertSafeKey(key: string) {
  if (!safeKeyPattern.test(key)) {
    throw new Error(`Invalid storage key: ${JSON.stringify(key)}`);
  }
}

export async function writeStoredFile(key: string, bytes: Uint8Array) {
  assertSafeKey(key);
  const now = new Date();

  await db
    .insert(storedFiles)
    .values({ key, bytes, createdAt: now, updatedAt: now })
    .onConflictDoUpdate({ target: storedFiles.key, set: { bytes, updatedAt: now } });
}

export async function readStoredFile(key: string): Promise<Uint8Array | null> {
  assertSafeKey(key);
  const [row] = await db
    .select({ bytes: storedFiles.bytes })
    .from(storedFiles)
    .where(eq(storedFiles.key, key))
    .limit(1);

  return row?.bytes ?? null;
}

export async function deleteStoredFile(key: string) {
  assertSafeKey(key);
  await db.delete(storedFiles).where(eq(storedFiles.key, key));
}
