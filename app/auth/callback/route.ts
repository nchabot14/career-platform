import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabaseClient } from "@/lib/auth/server";
import { absoluteUrl } from "@/lib/site-url";

function getSafeNextPath(nextPath: string | null) {
  if (!nextPath || !nextPath.startsWith("/") || nextPath.startsWith("//")) {
    return "/admin";
  }

  return nextPath;
}

// Redirects use the configured site address: behind the proxy, request.url
// is the server's internal address, not the one the visitor is on.
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const nextPath = getSafeNextPath(searchParams.get("next"));

  if (!code) {
    return NextResponse.redirect(absoluteUrl("/login?error=callback"));
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(absoluteUrl("/login?error=callback"));
  }

  return NextResponse.redirect(absoluteUrl(nextPath));
}
