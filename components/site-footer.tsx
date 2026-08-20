import Link from 'next/link';
import { Mail } from 'lucide-react';
import { SITE_NAME, SITE_TAGLINE } from '@/lib/constants';

const FOOTER_LINKS = [
  {
    title: 'Explore',
    links: [
      { href: '/products', label: 'All Products' },
      { href: '/blog', label: 'Blog' },
      { href: '/search', label: 'Search' },
    ],
  },
  {
    title: 'Company',
    links: [
      { href: '/about', label: 'About Us' },
      { href: '/contact', label: 'Contact' },
      { href: '/admin', label: 'Admin Login' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { href: '/privacy', label: 'Privacy Policy' },
      { href: '/terms', label: 'Terms & Conditions' },
      { href: '/affiliate-disclosure', label: 'Affiliate Disclosure' },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="bg-slate-900 text-slate-300">
      <div className="container mx-auto max-w-7xl px-4 py-12">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-3">
            <Link href="/" className="flex items-center gap-2 font-bold text-lg text-white">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-slate-900 text-sm">
                DV
              </span>
              {SITE_NAME}
            </Link>
            <p className="text-sm text-slate-400 max-w-xs">{SITE_TAGLINE}</p>
          </div>

          {FOOTER_LINKS.map((section) => (
            <div key={section.title}>
              <h3 className="mb-3 text-sm font-semibold text-white">{section.title}</h3>
              <ul className="space-y-2">
                {section.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-slate-400 hover:text-white transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col gap-4 border-t border-slate-800 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-slate-500">
            &copy; {new Date().getFullYear()} {SITE_NAME}. All rights reserved.
          </p>
          <p className="text-xs text-slate-500 flex items-center gap-1">
            <Mail className="h-3 w-3" />
            Some links are affiliate links. We may earn a commission at no extra cost to you.
          </p>
        </div>
      </div>
    </footer>
  );
}
