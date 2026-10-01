import { requireOwner } from "@/lib/auth/owner";
import { getApplicationDocument } from "@/lib/db/repositories/job-applications";
import { readStoredFile } from "@/lib/storage/files";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string; documentId: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  await requireOwner();

  const { id, documentId } = await params;
  const document = await getApplicationDocument(id, documentId);
  const bytes = document ? await readStoredFile(document.storageKey) : null;

  if (!document || !bytes) {
    return new Response("Document not found.", { status: 404, headers: { "X-Robots-Tag": "noindex" } });
  }

  return new Response(Buffer.from(bytes), {
    headers: {
      "Content-Type": document.mimeType,
      "Content-Disposition": `attachment; filename="${document.filename}"`,
      "Content-Length": String(bytes.byteLength),
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex",
    },
  });
}
