import type { Metadata } from 'next';
import Link from 'next/link';
import { ShieldCheck, Sparkles, Eye, Heart } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SITE_NAME, AFFILIATE_DISCLOSURE_SHORT } from '@/lib/constants';

export const metadata: Metadata = {
  title: 'About Us',
  description: `Learn about ${SITE_NAME} — how we help people discover useful digital products, software, courses, tools and online resources.`,
  alternates: { canonical: '/about' },
};

export default function AboutPage() {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-4xl font-bold text-slate-900">About {SITE_NAME}</h1>
      <p className="mt-4 text-lg text-slate-600">
        {SITE_NAME} helps people discover useful digital products, software, courses, tools and online resources.
        We curate and organize products from across the web so you can spend less time searching and more time doing.
      </p>

      <div className="mt-10 grid gap-6 sm:grid-cols-2">
        <Card>
          <CardContent className="p-6">
            <ShieldCheck className="mb-3 h-8 w-8 text-sky-600" />
            <h2 className="font-semibold text-slate-900">Vetted products</h2>
            <p className="mt-1 text-sm text-slate-500">
              We review products before listing them and prioritize quality over quantity.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <Sparkles className="mb-3 h-8 w-8 text-sky-600" />
            <h2 className="font-semibold text-slate-900">Curated for you</h2>
            <p className="mt-1 text-sm text-slate-500">
              Our team selects products relevant to South African creators, entrepreneurs and professionals.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <Eye className="mb-3 h-8 w-8 text-sky-600" />
            <h2 className="font-semibold text-slate-900">Transparent</h2>
            <p className="mt-1 text-sm text-slate-500">
              We clearly label affiliate links and never hide our relationships with vendors.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <Heart className="mb-3 h-8 w-8 text-sky-600" />
            <h2 className="font-semibold text-slate-900">Honest reviews</h2>
            <p className="mt-1 text-sm text-slate-500">
              We don&apos;t make false claims about products, earnings, results, or guarantees.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-10 rounded-lg bg-amber-50 p-6">
        <h2 className="font-semibold text-amber-900">Affiliate disclosure</h2>
        <p className="mt-2 text-sm text-amber-800">{AFFILIATE_DISCLOSURE_SHORT}</p>
        <Button asChild variant="outline" size="sm" className="mt-3">
          <Link href="/affiliate-disclosure">Read full disclosure</Link>
        </Button>
      </div>

      <div className="mt-10 text-center">
        <Button asChild size="lg">
          <Link href="/products">Explore products</Link>
        </Button>
      </div>
    </div>
  );
}
