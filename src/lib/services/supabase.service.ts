import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { ENV } from "@/config/constants";

let _client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (!_client) {
    _client = createClient(ENV.SUPABASE_URL(), ENV.SUPABASE_SERVICE_KEY(), {
      auth: { persistSession: false },
    });
  }
  return _client;
}
