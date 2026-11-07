import { createClient } from "./client";

export async function ensureAnonymousSession() {
  const supabase = createClient();

  // Check if we already have a session
  const { data: { session } } = await supabase.auth.getSession();
  
  if (session) {
    return session;
  }

  // If not, create a new anonymous session
  const { data, error } = await supabase.auth.signInAnonymously();

  if (error) {
    console.error("Failed to create anonymous session:", error.message);
    throw error;
  }

  return data.session;
}