import Link from 'next/link';
import { CheckCircle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  return (
    <div className="container mx-auto max-w-7xl px-4 py-16">
      <div className="mx-auto max-w-md text-center">
        <Card>
          <CardContent className="p-8">
            <div className="mb-4 flex justify-center">
              <CheckCircle className="h-16 w-16 text-green-500" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Order Confirmed!</h1>
            <p className="mt-2 text-slate-500">
              Thank you for your purchase. Your order has been received and is being processed.
            </p>
            <div className="mt-6 flex flex-col gap-3">
              <Button asChild>
                <Link href="/products" className="gap-1">
                  Continue Shopping
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="ghost">
                <Link href="/">Back to Home</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
