import type { Metadata } from 'next';
import { Link2, ShieldCheck, Info } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { SITE_NAME, AFFILIATE_DISCLOSURE_SHORT } from '@/lib/constants';

export const metadata: Metadata = {
  title: 'Affiliate Disclosure',
  description: `${SITE_NAME} may earn commissions from qualifying purchases made through our affiliate links.`,
  alternates: { canonical: '/affiliate-disclosure' },
};

export default function AffiliateDisclosurePage() {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-12">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
          <Link2 className="h-6 w-6" />
        </div>
        <h1 className="text-3xl font-bold text-slate-900">Affiliate Disclosure</h1>
      </div>

      <Card className="mt-6 border-amber-200 bg-amber-50">
        <CardContent className="p-6">
          <p className="text-amber-900">{AFFILIATE_DISCLOSURE_SHORT}</p>
        </CardContent>
      </Card>

      <div className="prose prose-slate mt-8 max-w-none">
        <h2>What is an affiliate link?</h2>
        <p>
          An affiliate link is a special URL that identifies {SITE_NAME} as the referrer. When you click an
          affiliate link and make a purchase, the vendor may pay us a commission. This comes at no additional
          cost to you — you pay the same price whether or not you use our link.
        </p>

        <h2>How we use affiliate links</h2>
        <ul>
          <li>Product &quot;View Offer&quot; buttons redirect you to the vendor&apos;s page via our affiliate link.</li>
          <li>We may include affiliate links in blog articles and other content.</li>
          <li>Every affiliate link is tracked anonymously to measure which products our visitors find useful.</li>
        </ul>

        <h2>Our commitment to honesty</h2>
        <div className="not-prose space-y-4">
          <Card>
            <CardContent className="flex items-start gap-3 p-4">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-sky-600" />
              <div>
                <h3 className="font-semibold text-slate-900">Independence</h3>
                <p className="text-sm text-slate-500">
                  We recommend products because we believe they are useful — not solely because of commissions.
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-start gap-3 p-4">
              <Info className="mt-0.5 h-5 w-5 shrink-0 text-sky-600" />
              <div>
                <h3 className="font-semibold text-slate-900">No false claims</h3>
                <p className="text-sm text-slate-500">
                  We do not make false claims about products, earnings, results, testimonials, ratings, or guarantees.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <h2>Third-party terms</h2>
        <p>
          When you click an affiliate link, you leave {SITE_NAME} and are subject to the vendor&apos;s own terms,
          privacy policy, and refund policy. We are not responsible for the vendor&apos;s products, services, or
          practices.
        </p>

        <h2>Questions?</h2>
        <p>
          If you have questions about our affiliate relationships, please contact us at hello@digitalvaultsa.co.za.
        </p>
      </div>
    </div>
  );
}
