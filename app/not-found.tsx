import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <h1 className="text-6xl font-bold text-slate-900">404</h1>
      <p className="mt-4 text-lg text-slate-600">Page not found</p>
      <p className="mt-2 text-sm text-slate-500">The page you&apos;re looking for doesn&apos;t exist or has been moved.</p>
      <Button asChild className="mt-6">
        <Link href="/">Back to home</Link>
      </Button>
    </div>
  );
}
