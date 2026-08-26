import { createServerClient } from '@supabase/ssr';
import type { CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const SECRET_KEY_RE = /^sb_secret_/;

function validateAnonKey() {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!key) {
    throw new Error(
      '[DigiTak] middleware: NEXT_PUBLIC_SUPABASE_ANON_KEY is not set.'
    );
  }
  if (SECRET_KEY_RE.test(key)) {
    throw new Error(
      '[DigiTak] middleware: NEXT_PUBLIC_SUPABASE_ANON_KEY contains a ' +
      'service-role key (sb_secret_...). Set it to your publishable key ' +
      '(sb_publishable_...) or anon key (eyJhbG...) in Vercel.'
    );
  }
}

export async function middleware(request: NextRequest) {
  validateAnonKey();

  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Protect admin routes — redirect to login if not authenticated
  if (request.nextUrl.pathname.startsWith('/admin') && !request.nextUrl.pathname.startsWith('/admin/login')) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = '/admin/login';
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/admin/:path*',
  ],
};
