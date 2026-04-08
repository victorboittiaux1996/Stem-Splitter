import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

// Admin client bypasses RLS — use only in server-side code (API routes, webhooks)
// Lazy-initialized to avoid crashing during Next.js static page generation
let _admin: SupabaseClient<Database> | null = null;

export const supabaseAdmin: SupabaseClient<Database> = new Proxy({} as SupabaseClient<Database>, {
  get(_target, prop) {
    if (!_admin) {
      _admin = createClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
    }
    return (_admin as unknown as Record<string | symbol, unknown>)[prop];
  },
});
