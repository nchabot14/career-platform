import type { ApplicationDocument } from "@/lib/db/schema";
import { insertApplicationDocument } from "@/lib/db/repositories/job-applications";
import { deleteStoredFile, writeStoredFile } from "@/lib/storage/files";
import { sanitizeFilename, type UploadedFile } from "@/lib/storage/uploaded-file";

export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;

export class ApplicationDocumentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApplicationDocumentError";
  }
}

const docxType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

function startsWith(bytes: Uint8Array, signature: number[]) {
  return signature.every((byte, index) => bytes[index] === byte);
}

function isPlainText(bytes: Uint8Array) {
  if (bytes.includes(0)) return false;
  try {
    new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return true;
  } catch {
    return false;
  }
}

// Accept a type only when the extension, the browser-reported type, and the
// file's leading bytes all agree.
const allowedTypes = [
  { extension: "pdf", mimeType: "application/pdf", matches: (b: Uint8Array) => startsWith(b, [0x25, 0x50, 0x44, 0x46, 0x2d]) },
  { extension: "docx", mimeType: docxType, matches: (b: Uint8Array) => startsWith(b, [0x50, 0x4b, 0x03, 0x04]) },
  { extension: "txt", mimeType: "text/plain", matches: isPlainText },
];

export function detectDocumentType(file: UploadedFile) {
  const extension = file.name.split(".").pop()?.toLowerCase();
  const mimeType = file.type.split(";")[0].trim().toLowerCase();

  return allowedTypes.find(
    (type) => type.extension === extension && type.mimeType === mimeType && type.matches(file.bytes),
  );
}

export async function storeApplicationDocument(
  applicationId: string,
  file: UploadedFile,
  category: string,
): Promise<ApplicationDocument> {
  if (file.size === 0 || file.bytes.byteLength === 0) throw new ApplicationDocumentError("Choose a file to upload.");
  if (file.size > MAX_DOCUMENT_BYTES) throw new ApplicationDocumentError("Documents must be 10 MiB or smaller.");

  const type = detectDocumentType(file);
  if (!type) throw new ApplicationDocumentError("Only PDF, DOCX, and TXT files are allowed.");

  const filename = sanitizeFilename(file.name, type.extension);
  const storageKey = `application-documents/owner/${applicationId}/${crypto.randomUUID()}-${filename}`;
  await writeStoredFile(storageKey, file.bytes);

  try {
    return await insertApplicationDocument({
      applicationId,
      storageKey,
      filename,
      mimeType: type.mimeType,
      size: file.bytes.byteLength,
      category,
    });
  } catch {
    await deleteStoredFile(storageKey);
    throw new ApplicationDocumentError("Could not save the document. Nothing was changed; please try again.");
  }
}
