import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/supabase";

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: {
        domain: typeof window !== "undefined" && window.location.hostname.endsWith("44stems.com")
          ? ".44stems.com"
          : undefined,
      },
    }
  );
}
