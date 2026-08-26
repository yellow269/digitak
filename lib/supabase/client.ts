import { createBrowserClient } from '@supabase/ssr';

const VALID_BROWSER_KEY_RE = /^(eyJ|sb_publishable_)/;
const SECRET_KEY_RE = /^sb_secret_/;

/**
 * Creates a browser-safe Supabase client.
 *
 * Security: validates that NEXT_PUBLIC_SUPABASE_ANON_KEY is a public
 * key — either the legacy JWT anon key (eyJ...) or the new publishable
 * key (sb_publishable_...). Service-role keys (sb_secret_...) are
 * blocked because they bypass ALL Row Level Security.
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

  if (SECRET_KEY_RE.test(key)) {
    throw new Error(
      '[DigiTak] FATAL: NEXT_PUBLIC_SUPABASE_ANON_KEY is set to a service-role ' +
      'key (sb_secret_...). This key bypasses ALL Row Level Security and must ' +
      'NEVER be used in browser code.\n\n' +
      'FIX: Go to Vercel → Project Settings → Environment Variables → ' +
      'NEXT_PUBLIC_SUPABASE_ANON_KEY → set it to your publishable key ' +
      '(sb_publishable_...) or anon key (eyJhbG...).'
    );
  }

  if (!VALID_BROWSER_KEY_RE.test(key)) {
    throw new Error(
      '[DigiTak] NEXT_PUBLIC_SUPABASE_ANON_KEY does not look like a valid ' +
      'Supabase public key. Expected a key starting with "eyJ" (legacy anon) ' +
      'or "sb_publishable_" (new format). Current value starts with: "' +
      key.substring(0, 10) + '..."'
    );
  }

  return createBrowserClient(url, key);
}
