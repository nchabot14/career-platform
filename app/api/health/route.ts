import { databaseClient } from "@/lib/db/client";
import { logServerError } from "@/lib/observability/logger";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await databaseClient.execute("SELECT 1");
    return Response.json({ status: "ok" }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    logServerError("health_check_failed", error, {});
    return Response.json({ status: "degraded" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
