import Link from 'next/link';
import { XCircle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function CheckoutCancelPage() {
  return (
    <div className="container mx-auto max-w-7xl px-4 py-16">
      <div className="mx-auto max-w-md text-center">
        <Card>
          <CardContent className="p-8">
            <div className="mb-4 flex justify-center">
              <XCircle className="h-16 w-16 text-red-500" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Payment Cancelled</h1>
            <p className="mt-2 text-slate-500">
              Your payment was not completed. Your cart items have been saved.
            </p>
            <div className="mt-6 flex flex-col gap-3">
              <Button asChild>
                <Link href="/cart" className="gap-1">
                  Return to Cart
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="ghost">
                <Link href="/products">Continue Shopping</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
