'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[AdminError]', error.message, error.digest);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <h1 className="text-4xl font-bold text-slate-900">Admin Error</h1>
      <p className="mt-4 text-lg text-slate-600">
        An error occurred in the admin panel.
      </p>
      <p className="mt-2 text-sm text-slate-500">
        Check the server logs for details.
      </p>
      <div className="mt-6 flex gap-3">
        <Button onClick={reset}>Try again</Button>
        <Button asChild variant="outline">
          <Link href="/admin/dashboard">Back to dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
