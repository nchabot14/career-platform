import {
  getCurrentPublishedResume,
  getPublishedProfile,
} from "@/lib/db/repositories/public-content";
import { resumeDownloadFilename } from "@/lib/services/public-profile";
import { readStoredFile } from "@/lib/storage/files";

export const dynamic = "force-dynamic";

function notFound() {
  return new Response("No resume is published.", {
    status: 404,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

export async function GET() {
  const resume = await getCurrentPublishedResume();

  if (!resume) return notFound();

  const [bytes, profile] = await Promise.all([
    readStoredFile(resume.storageKey),
    getPublishedProfile(),
  ]);

  if (!bytes) return notFound();

  return new Response(Buffer.from(bytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${resumeDownloadFilename(profile?.name)}"`,
      "Content-Length": String(bytes.byteLength),
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
