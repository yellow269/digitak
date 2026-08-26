import { createBrowserClient } from '@supabase/ssr';

/**
 * Creates a browser-safe Supabase client.
 *
 * Security: validates that NEXT_PUBLIC_SUPABASE_ANON_KEY is a real
 * anon/public key (JWT starting with "eyJ") and not a service-role
 * key (starting with "sb_secret_"). The service-role key must NEVER
 * be used in browser code — it bypasses all Row Level Security.
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      '[DigiTak] Missing Supabase env vars. ' +
      'Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY ' +
      'in your Vercel project settings → Environment Variables.'
    );
  }

  if (key.startsWith('sb_secret_')) {
    throw new Error(
      '[DigiTak] FATAL: NEXT_PUBLIC_SUPABASE_ANON_KEY is set to a service-role ' +
      'key (sb_secret_...). This key bypasses ALL Row Level Security and must ' +
      'NEVER be used in browser code.\n\n' +
      'FIX: Go to Vercel → Project Settings → Environment Variables → ' +
      'NEXT_PUBLIC_SUPABASE_ANON_KEY → set it to your anon key (eyJhbG...).\n\n' +
      'You can find your anon key in the Supabase dashboard → Settings → API → ' +
      '"anon public" key.'
    );
  }

  if (!key.startsWith('eyJ')) {
    throw new Error(
      '[DigiTak] NEXT_PUBLIC_SUPABASE_ANON_KEY does not look like a valid ' +
      'Supabase anon key. Supabase anon keys start with "eyJ" (a JWT). ' +
      'Current value starts with: "' + key.substring(0, 10) + '..."'
    );
  }

  return createBrowserClient(url, key);
}
