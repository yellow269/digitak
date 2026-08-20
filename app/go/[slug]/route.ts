import { NextRequest, NextResponse } from 'next/server';
import { createPublicSupabaseClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const ALLOWED_PROTOCOLS = ['http:', 'https:'];
const BLOCKED_DOMAINS = ['localhost', '127.0.0.1', '0.0.0.0', '::1'];

function validateAffiliateUrl(urlStr: string): URL | null {
  try {
    const url = new URL(urlStr);

    // Only allow http and https protocols
    if (!ALLOWED_PROTOCOLS.includes(url.protocol)) {
      return null;
    }

    // Block localhost and internal IPs
    if (BLOCKED_DOMAINS.includes(url.hostname)) {
      return null;
    }

    // Block private IP ranges (10.x, 172.16-31.x, 192.168.x)
    if (/^(10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.)/.test(url.hostname)) {
      return null;
    }

    return url;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = createPublicSupabaseClient();

  const { data: product, error } = await supabase
    .from('products')
    .select('id, affiliate_url, status')
    .eq('slug', slug)
    .maybeSingle();

  if (error) {
    console.error('[AffiliateRedirect] DB error:', error.message);
    return NextResponse.redirect(new URL('/products', req.url));
  }

  if (!product || product.status !== 'published') {
    return NextResponse.redirect(new URL('/products', req.url));
  }

  // Determine device type from user agent (coarse, non-identifying)
  const ua = req.headers.get('user-agent') || '';
  let deviceType = 'desktop';
  if (/mobile|android|iphone/i.test(ua)) deviceType = 'mobile';
  else if (/tablet|ipad/i.test(ua)) deviceType = 'tablet';

  const referrer = req.headers.get('referer') || null;
  const landingPage = req.headers.get('x-forwarded-uri') || `/go/${slug}`;

  // Record the click (fire-and-forget — log errors but don't block redirect)
  const { error: clickError } = await supabase.from('affiliate_clicks').insert({
    product_id: product.id,
    referrer,
    landing_page: landingPage,
    device_type: deviceType,
  });
  if (clickError) {
    console.error('[AffiliateRedirect] Click insert error:', clickError.message);
  }

  const targetUrl = validateAffiliateUrl(product.affiliate_url);
  if (!targetUrl) {
    console.error('[AffiliateRedirect] Invalid affiliate URL:', product.affiliate_url);
    return NextResponse.redirect(new URL('/products', req.url));
  }

  return NextResponse.redirect(targetUrl, 302);
}
