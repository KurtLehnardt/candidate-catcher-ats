import { createClient } from "@supabase/supabase-js";

// Service-role client — bypasses RLS. Only for server-only operations that need elevated
// privileges the anon key doesn't have (e.g. creating a Storage bucket). Never import this
// from a Client Component.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}
