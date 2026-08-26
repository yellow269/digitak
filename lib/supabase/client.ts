import { createBrowserClient } from '@supabase/ssr';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (key?.startsWith('sb_secret_')) {
  throw new Error(
    '[DigiTak] NEXT_PUBLIC_SUPABASE_ANON_KEY contains a service-role key (sb_secret_...). ' +
    'This key MUST NOT be used in browser code. ' +
    'Set NEXT_PUBLIC_SUPABASE_ANON_KEY to your anon/public key (eyJhbG...) in your Vercel environment variables.'
  );
}

export function createClient() {
  return createBrowserClient(url, key);
}
