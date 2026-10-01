import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { resumeDocuments, type ResumeDocument } from "@/lib/db/schema";

export type NewResumeMetadata = {
  storageKey: string;
  filename: string;
  mimeType: string;
  size: number;
};

// Clears the previous current marker and records the new file as the
// current published resume in one transaction, so readers never see zero
// or two current resumes.
export async function insertCurrentResume(
  metadata: NewResumeMetadata,
): Promise<ResumeDocument> {
  return db.transaction(async (tx) => {
    await tx
      .update(resumeDocuments)
      .set({ isCurrent: false, updatedAt: new Date() })
      .where(eq(resumeDocuments.isCurrent, true));

    const [resume] = await tx
      .insert(resumeDocuments)
      .values({ ...metadata, isCurrent: true, publicationState: "published" })
      .returning();

    return resume;
  });
}

export async function listResumeDocuments(): Promise<ResumeDocument[]> {
  return db.select().from(resumeDocuments).orderBy(desc(resumeDocuments.createdAt));
}
