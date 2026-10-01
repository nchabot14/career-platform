import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

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

function redirectToLogin(request: NextRequest) {
  const loginUrl = new URL("/login", request.url);
  return NextResponse.redirect(loginUrl);
}

export async function middleware(request: NextRequest) {
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
    return redirectToLogin(request);
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
  matcher: ["/admin/:path*"],
};
