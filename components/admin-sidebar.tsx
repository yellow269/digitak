'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  LayoutDashboard,
  Package,
  FileText,
  FolderTree,
  Mail,
  Users,
  BarChart3,
  LogOut,
  Menu,
  X,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/products', label: 'Products', icon: Package },
  { href: '/admin/blog', label: 'Blog', icon: FileText },
  { href: '/admin/categories', label: 'Categories', icon: FolderTree },
  { href: '/admin/messages', label: 'Messages', icon: Mail },
  { href: '/admin/subscribers', label: 'Subscribers', icon: Users },
  { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
];

export function AdminSidebar({ email }: { email: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/admin/login');
    router.refresh();
  }

  const isActive = (href: string) => pathname.startsWith(href);

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="fixed left-4 top-20 z-50 rounded-lg border bg-white p-2 shadow-sm lg:hidden"
        aria-label="Toggle admin menu"
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/30 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={cn(
          'fixed left-0 top-16 z-40 h-[calc(100vh-4rem)] w-64 transform border-r bg-slate-900 transition-transform lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-full flex-col">
          <div className="px-4 py-4">
            <p className="text-xs font-medium text-slate-400">Signed in as</p>
            <p className="truncate text-sm font-medium text-white">{email}</p>
          </div>

          <nav className="flex-1 space-y-1 px-3">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive(item.href)
                    ? 'bg-sky-600 text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="space-y-2 border-t border-slate-800 p-3">
            <Link
              href="/"
              target="_blank"
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white"
            >
              <ExternalLink className="h-4 w-4" />
              View site
            </Link>
            <Button
              onClick={handleLogout}
              variant="ghost"
              className="w-full justify-start gap-3 text-slate-300 hover:bg-slate-800 hover:text-white"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </Button>
          </div>
        </div>
      </aside>
    </>
  );
}
