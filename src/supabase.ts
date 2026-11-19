import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }

  if (!client) {
    client = createClient(supabaseUrl, supabaseAnonKey);
  }

  return client;
}

// Defer client creation until an operation actually needs Supabase.
// This allows Next.js to prerender pages without exposing or inventing credentials.
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, property) {
    const instance = getSupabaseClient();
    const value = Reflect.get(instance, property, instance);

    return typeof value === "function" ? value.bind(instance) : value;
  },
});
