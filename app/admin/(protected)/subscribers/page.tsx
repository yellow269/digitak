import { createServerSupabaseClient } from '@/lib/supabase/server';
import { Card, CardContent } from '@/components/ui/card';
import { formatDate } from '@/lib/format';
import type { NewsletterSubscriber } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function AdminSubscribersPage() {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.from('newsletter_subscribers').select('*').order('created_at', { ascending: false });

  if (error) {
    console.error('[AdminSubscribers] Fetch error:', error.message);
  }

  const subscribers = (data as NewsletterSubscriber[]) || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Newsletter Subscribers</h1>
        <p className="text-sm text-slate-500">{subscribers.length} subscribers</p>
      </div>

      {subscribers.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-slate-500">No subscribers yet.</CardContent></Card>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Consent</th>
                <th className="px-4 py-3">Subscribed</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {subscribers.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{s.email}</td>
                  <td className="px-4 py-3 text-slate-600">{s.consent ? 'Yes' : 'No'}</td>
                  <td className="px-4 py-3 text-slate-500">{formatDate(s.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
