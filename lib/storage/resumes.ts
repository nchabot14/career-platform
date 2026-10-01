import { revalidatePath } from "next/cache";
import { insertCurrentResume } from "@/lib/db/repositories/resumes";
import type { ResumeDocument } from "@/lib/db/schema";
import { deleteStoredFile, writeStoredFile } from "@/lib/storage/files";
import { sanitizeFilename, type UploadedFile } from "@/lib/storage/uploaded-file";

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export class ResumeUploadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ResumeUploadError";
  }
}

function startsWithPdfSignature(bytes: Uint8Array) {
  return new TextDecoder().decode(bytes.subarray(0, 5)) === "%PDF-";
}

export function validateResumeFile(file: UploadedFile) {
  if (file.size === 0 || file.bytes.byteLength === 0) return "Choose a PDF file to upload.";
  if (file.size > MAX_UPLOAD_BYTES) return "The resume must be 10 MiB or smaller.";
  if (file.type !== "application/pdf" || !startsWithPdfSignature(file.bytes)) {
    return "The resume must be a PDF file.";
  }

  return null;
}

export async function replaceCurrentResume(file: UploadedFile): Promise<ResumeDocument> {
  const problem = validateResumeFile(file);
  if (problem) throw new ResumeUploadError(problem);

  const storageKey = `resumes/${crypto.randomUUID()}.pdf`;
  await writeStoredFile(storageKey, file.bytes);

  let resume: ResumeDocument;
  try {
    resume = await insertCurrentResume({
      storageKey,
      filename: sanitizeFilename(file.name, "pdf"),
      mimeType: "application/pdf",
      size: file.bytes.byteLength,
    });
  } catch {
    await deleteStoredFile(storageKey);
    throw new ResumeUploadError("Could not save the resume. Nothing was changed; please try again.");
  }

  revalidatePath("/");
  return resume;
}
