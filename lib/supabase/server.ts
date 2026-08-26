import { createServerClient } from '@supabase/ssr';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

function validateAnonKey(context: string) {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!key) {
    throw new Error(
      `[DigiTak] ${context}: NEXT_PUBLIC_SUPABASE_ANON_KEY is not set. ` +
      'Add it to your Vercel environment variables.'
    );
  }
  if (key.startsWith('sb_secret_')) {
    throw new Error(
      `[DigiTak] ${context}: NEXT_PUBLIC_SUPABASE_ANON_KEY contains a ` +
      'service-role key (sb_secret_...). Set it to your anon key (eyJhbG...) ' +
      'in Vercel → Project Settings → Environment Variables.'
    );
  }
}

/**
 * Server Supabase client WITH cookie access.
 * Use ONLY in Route Handlers, Server Actions, and pages that have request context.
 * Do NOT use in static generation or ISR pages — those lack request context.
 */
export async function createServerSupabaseClient() {
  validateAnonKey('createServerSupabaseClient');
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: Record<string, unknown> }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options as never);
            });
          } catch {
            // Server Components cannot write cookies — safe to ignore
          }
        },
      },
    }
  );
}

/**
 * Public Supabase client — NO cookies, NO auth context.
 * Safe for: public data queries, static generation, ISR pages, sitemaps.
 * Uses only the anon key — respects RLS but without user session.
 */
export function createPublicSupabaseClient() {
  validateAnonKey('createPublicSupabaseClient');
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: { autoRefreshToken: false, persistSession: false },
    }
  );
}

/**
 * Service role Supabase client — FULL admin access, bypasses RLS.
 * Use ONLY in server-side admin operations (webhooks, cron jobs, etc.).
 * NEVER expose this to client-side code.
 */
export function createServiceRoleClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    throw new Error(
      '[DigiTak] SUPABASE_SERVICE_ROLE_KEY is not set. ' +
      'Add it to your server environment variables (not NEXT_PUBLIC_).'
    );
  }
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    {
      auth: { autoRefreshToken: false, persistSession: false },
    }
  );
}
