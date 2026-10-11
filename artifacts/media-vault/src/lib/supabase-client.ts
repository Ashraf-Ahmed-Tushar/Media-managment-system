import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL?.trim() ?? "";
const key =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() ||
  import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ||
  "";
const hasAnyConfig = Boolean(url || key);

export const isSupabaseConfigured = Boolean(url && key);
export const isSupabasePartiallyConfigured = hasAnyConfig && !isSupabaseConfigured;
export const getConnectionMode = () =>
  isSupabasePartiallyConfigured
    ? ("configuration-needed" as const)
    : isSupabaseConfigured
      ? ("supabase" as const)
      : ("demo" as const);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url, key, {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: true,
        persistSession: true,
      },
    })
  : null;

export function requireSupabase(): SupabaseClient {
  if (isSupabasePartiallyConfigured) {
    throw new Error(
      "Supabase setup is incomplete. Set both VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY (or VITE_SUPABASE_ANON_KEY).",
    );
  }
  if (!supabase) {
    throw new Error(
      "Supabase is not connected yet. Add the project URL and publishable key to enable live data and accounts.",
    );
  }
  return supabase;
}
