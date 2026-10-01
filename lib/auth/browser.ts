import { createBrowserClient } from "@supabase/ssr";

let browserSupabaseClient:
  | ReturnType<typeof createBrowserClient>
  | undefined;

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

export function createBrowserSupabaseClient() {
  if (!browserSupabaseClient) {
    const { url, anonKey } = getSupabaseConfig();
    browserSupabaseClient = createBrowserClient(url, anonKey);
  }

  return browserSupabaseClient;
}
