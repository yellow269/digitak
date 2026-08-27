'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Menu, Search, X, Shield, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetTrigger, SheetClose } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { SITE_NAME } from '@/lib/constants';
import { useCart } from '@/hooks/use-cart';
import { CartDrawer } from '@/components/cart-drawer';

const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/products', label: 'Shop' },
  { href: '/blog', label: 'Blog' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const { itemCount } = useCart();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/70">
      <div className="container mx-auto flex h-16 max-w-7xl items-center gap-4 px-4">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white text-sm">
            ES
          </span>
          <span className="hidden sm:inline text-slate-900">{SITE_NAME}</span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto hidden md:flex items-center gap-2">
          <form action="/search" className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              name="q"
              placeholder="Search products..."
              className="w-56 pl-9"
              aria-label="Search products"
            />
          </form>
          <CartDrawer />
          <Button asChild variant="outline" size="sm">
            <Link href="/admin">
              <Shield className="mr-1 h-4 w-4" />
              Admin
            </Link>
          </Button>
        </div>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden ml-auto">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Open menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[300px] sm:w-[360px]">
            <div className="flex flex-col gap-4 pt-6">
              <div className="flex items-center justify-between">
                <span className="font-bold text-lg text-slate-900">{SITE_NAME}</span>
                <SheetClose asChild>
                  <Button variant="ghost" size="icon">
                    <X className="h-5 w-5" />
                  </Button>
                </SheetClose>
              </div>
              <form action="/search" className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input name="q" placeholder="Search products..." className="pl-9" />
              </form>
              <nav className="flex flex-col gap-1">
                {NAV_LINKS.map((link) => (
                  <SheetClose asChild key={link.href}>
                    <Link
                      href={link.href}
                      className="px-3 py-2 text-base font-medium text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
                    >
                      {link.label}
                    </Link>
                  </SheetClose>
                ))}
                <SheetClose asChild>
                  <Link
                    href="/cart"
                    className="px-3 py-2 text-base font-medium text-slate-700 hover:bg-slate-100 rounded-md transition-colors flex items-center gap-2"
                  >
                    <ShoppingCart className="h-4 w-4" />
                    Cart {itemCount > 0 && <Badge variant="secondary">{itemCount}</Badge>}
                  </Link>
                </SheetClose>
                <SheetClose asChild>
                  <Link
                    href="/admin"
                    className="px-3 py-2 text-base font-medium text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
                  >
                    Admin
                  </Link>
                </SheetClose>
              </nav>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
