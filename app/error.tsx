'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[AppError]', error.message, error.digest);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <h1 className="text-6xl font-bold text-slate-900">Oops</h1>
      <p className="mt-4 text-lg text-slate-600">Something went wrong.</p>
      <p className="mt-2 text-sm text-slate-500">
        We&apos;ve been notified and are looking into it.
      </p>
      <Button onClick={reset} className="mt-6">
        Try again
      </Button>
    </div>
  );
}
