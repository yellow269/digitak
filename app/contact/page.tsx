import type { Metadata } from 'next';
import { Mail, MapPin } from 'lucide-react';
import { ContactForm } from '@/components/contact-form';
import { Card, CardContent } from '@/components/ui/card';
import { SITE_NAME } from '@/lib/constants';

export const metadata: Metadata = {
  title: 'Contact Us',
  description: `Get in touch with the ${SITE_NAME} team.`,
  alternates: { canonical: '/contact' },
};

export default function ContactPage() {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-4xl font-bold text-slate-900">Contact Us</h1>
      <p className="mt-2 text-slate-600">
        Have a question, suggestion, or want to recommend a product? We&apos;d love to hear from you.
      </p>

      <div className="mt-8 grid gap-8 md:grid-cols-3">
        <Card className="md:col-span-1">
          <CardContent className="space-y-4 p-6">
            <div className="flex items-start gap-3">
              <Mail className="mt-0.5 h-5 w-5 text-sky-600" />
              <div>
                <p className="text-sm font-medium text-slate-900">Email</p>
                <p className="text-sm text-slate-500">hello@digitalvaultsa.co.za</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <MapPin className="mt-0.5 h-5 w-5 text-sky-600" />
              <div>
                <p className="text-sm font-medium text-slate-900">Location</p>
                <p className="text-sm text-slate-500">South Africa (remote)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="md:col-span-2">
          <ContactForm />
        </div>
      </div>
    </div>
  );
}
