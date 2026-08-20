import type { Metadata } from 'next';
import { SITE_NAME } from '@/lib/constants';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: `Privacy policy for ${SITE_NAME}.`,
  alternates: { canonical: '/privacy' },
};

export default function PrivacyPage() {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold text-slate-900">Privacy Policy</h1>
      <p className="mt-2 text-sm text-slate-500">Last updated: {new Date().toLocaleDateString('en-ZA')}</p>

      <div className="prose prose-slate mt-8 max-w-none">
        <p>
          {SITE_NAME} (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) respects your privacy. This policy explains
          what information we collect, how we use it, and the choices you have.
        </p>

        <h2>Information we collect</h2>
        <ul>
          <li><strong>Contact form submissions:</strong> name, email, subject and message when you contact us.</li>
          <li><strong>Newsletter subscriptions:</strong> email address and your consent to subscribe.</li>
          <li><strong>Affiliate click data:</strong> when you click an affiliate link we record the product, timestamp, referring page, and a coarse device type. We do <em>not</em> store your IP address or personal identifiers.</li>
          <li><strong>Analytics:</strong> we may use aggregate, anonymized analytics to understand site usage.</li>
        </ul>

        <h2>How we use your information</h2>
        <ul>
          <li>To respond to your contact requests.</li>
          <li>To send our newsletter to subscribers who have consented.</li>
          <li>To measure and improve the performance of our affiliate recommendations.</li>
          <li>To comply with legal obligations.</li>
        </ul>

        <h2>Affiliate links</h2>
        <p>
          {SITE_NAME} participates in affiliate programs. When you click an affiliate link and make a purchase,
          we may earn a commission. Affiliate clicks are tracked anonymously as described above. We do not share
          your personal data with affiliate networks.
        </p>

        <h2>Cookies</h2>
        <p>
          We use essential cookies for site functionality. We do not use cookies for invasive tracking.
          Any third-party analytics tools have their own privacy practices.
        </p>

        <h2>Data retention</h2>
        <p>
          Contact messages and newsletter subscriptions are retained for as long as needed to provide our services
          and respond to inquiries. Anonymous click data is retained for analytics purposes.
        </p>

        <h2>Your rights</h2>
        <p>
          You may request access to, correction of, or deletion of your personal data by contacting us at
          privacy@digitalvaultsa.co.za. You can unsubscribe from our newsletter at any time using the link in
          each email.
        </p>

        <h2>Children&apos;s privacy</h2>
        <p>Our services are not directed to children under 13, and we do not knowingly collect their data.</p>

        <h2>Changes to this policy</h2>
        <p>We may update this policy from time to time. Changes will be posted on this page with an updated date.</p>

        <h2>Contact</h2>
        <p>Questions about this policy? Email privacy@digitalvaultsa.co.za.</p>
      </div>
    </div>
  );
}
