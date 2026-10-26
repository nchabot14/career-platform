import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { databaseIsReachable } from "@/lib/db/health";
import { absoluteUrl } from "@/lib/site-url";

function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required.",
    );
  }

  return { url, anonKey };
}

function getOwnerEmail() {
  const ownerEmail = process.env.OWNER_EMAIL?.trim().toLowerCase();

  if (!ownerEmail) {
    throw new Error("Missing required OWNER_EMAIL environment variable.");
  }

  return ownerEmail;
}

// Built from the site address, because behind the proxy request.url is the
// server's internal http://localhost address.
function redirectToLogin() {
  return NextResponse.redirect(absoluteUrl("/login"));
}

export async function proxy(request: NextRequest) {
  if (request.nextUrl.pathname === "/") return homepage(request);
  return ownerOnly(request);
}

// A page can't set its own status code once rendering starts, so the
// homepage's 503 is decided here. The page still renders and shows its own
// fallback; this only makes the status match. Form posts to "/" are Server
// Actions and report their own failures.
async function homepage(request: NextRequest) {
  if (request.method !== "GET" && request.method !== "HEAD") return NextResponse.next();
  if (await databaseIsReachable()) return NextResponse.next();

  return NextResponse.next({ status: 503, headers: { "Cache-Control": "no-store" } });
}

async function ownerOnly(request: NextRequest) {
  const { url, anonKey } = getSupabaseConfig();
  const response = NextResponse.next();

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user?.email) {
    return redirectToLogin();
  }

  const ownerEmail = getOwnerEmail();
  const userEmail = data.user.email.trim().toLowerCase();

  if (userEmail !== ownerEmail) {
    return new NextResponse("Forbidden", {
      status: 403,
      headers: {
        "x-robots-tag": "noindex",
      },
    });
  }

  response.headers.set("x-robots-tag", "noindex");
  return response;
}

export const config = {
  matcher: ["/", "/admin/:path*"],
};
