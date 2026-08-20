import type { Metadata } from 'next';
import { SITE_NAME } from '@/lib/constants';

export const metadata: Metadata = {
  title: 'Terms & Conditions',
  description: `Terms and conditions for ${SITE_NAME}.`,
  alternates: { canonical: '/terms' },
};

export default function TermsPage() {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold text-slate-900">Terms &amp; Conditions</h1>
      <p className="mt-2 text-sm text-slate-500">Last updated: {new Date().toLocaleDateString('en-ZA')}</p>

      <div className="prose prose-slate mt-8 max-w-none">
        <p>
          By accessing {SITE_NAME} (&quot;the Site&quot;), you agree to these terms and conditions. If you do not
          agree, please do not use the Site.
        </p>

        <h2>Use of the site</h2>
        <p>
          You may use the Site for personal, non-commercial purposes. You agree not to misuse the Site, attempt to
          gain unauthorized access, or interfere with its operation.
        </p>

        <h2>Affiliate links</h2>
        <p>
          The Site contains affiliate links. When you click these links and make a purchase, {SITE_NAME} may earn
          a commission at no additional cost to you. We are not responsible for the products, services, or content
          of third-party vendors. Any purchase you make is governed by the vendor&apos;s own terms and policies.
        </p>

        <h2>No warranties</h2>
        <p>
          Product information is provided for general informational purposes only. We do not guarantee the accuracy,
          completeness, or reliability of any product description, rating, or review. Products are sold and fulfilled
          by third-party vendors, not {SITE_NAME}.
        </p>

        <h2>No earnings claims</h2>
        <p>
          We do not make any guarantees about earnings, results, or outcomes from any product listed on this Site.
          Any results depend on your own efforts and circumstances.
        </p>

        <h2>Limitation of liability</h2>
        <p>
          {SITE_NAME} is not liable for any damages arising from your use of the Site or from products purchased
          through affiliate links.
        </p>

        <h2>Intellectual property</h2>
        <p>
          All content on this Site, including text, graphics, and logos, is the property of {SITE_NAME} or its
          licensors and is protected by applicable laws.
        </p>

        <h2>Changes to these terms</h2>
        <p>We may update these terms from time to time. Continued use of the Site constitutes acceptance of updates.</p>

        <h2>Contact</h2>
        <p>Questions about these terms? Email legal@digitalvaultsa.co.za.</p>
      </div>
    </div>
  );
}
