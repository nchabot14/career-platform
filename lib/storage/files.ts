import fs from "node:fs/promises";
import path from "node:path";

// Uploaded files live on the server's disk next to the SQLite database.
// Keys are server-generated, slash-separated relative paths such as
// "resumes/<uuid>.pdf"; anything that could escape the root is rejected.
const safeKeyPattern = /^[A-Za-z0-9_-][A-Za-z0-9._-]*(?:\/[A-Za-z0-9_-][A-Za-z0-9._-]*)*$/;

export function getStorageRoot() {
  return path.resolve(/* turbopackIgnore: true */ process.env.FILE_STORAGE_DIR || "data/files");
}

function resolveKey(key: string) {
  const root = getStorageRoot();
  const resolved = path.resolve(/* turbopackIgnore: true */ root, key);

  if (!safeKeyPattern.test(key) || !resolved.startsWith(root + path.sep)) {
    throw new Error(`Invalid storage key: ${JSON.stringify(key)}`);
  }

  return resolved;
}

function isMissingFile(error: unknown) {
  return (error as NodeJS.ErrnoException)?.code === "ENOENT";
}

export async function writeStoredFile(key: string, bytes: Uint8Array) {
  const target = resolveKey(key);
  const temporary = `${target}.${process.pid}.${Date.now()}.tmp`;

  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(temporary, bytes, { mode: 0o600 });
  await fs.rename(temporary, target);
}

export async function readStoredFile(key: string): Promise<Uint8Array | null> {
  const target = resolveKey(key);

  try {
    return new Uint8Array(await fs.readFile(target));
  } catch (error) {
    if (isMissingFile(error)) return null;
    throw error;
  }
}

export async function deleteStoredFile(key: string) {
  const target = resolveKey(key);

  try {
    await fs.unlink(target);
  } catch (error) {
    if (!isMissingFile(error)) throw error;
  }
}
