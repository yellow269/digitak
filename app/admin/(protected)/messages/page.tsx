import { createServerSupabaseClient } from '@/lib/supabase/server';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/format';
import type { ContactMessage } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function AdminMessagesPage() {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.from('contact_messages').select('*').order('created_at', { ascending: false });

  if (error) {
    console.error('[AdminMessages] Fetch error:', error.message);
  }

  const messages = (data as ContactMessage[]) || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Messages</h1>
        <p className="text-sm text-slate-500">{messages.length} contact submissions</p>
      </div>

      {messages.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-slate-500">No messages yet.</CardContent></Card>
      ) : (
        <div className="space-y-4">
          {messages.map((msg) => (
            <Card key={msg.id}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-slate-900">{msg.name}</p>
                      {!msg.read && <Badge className="bg-sky-500 hover:bg-sky-500">New</Badge>}
                    </div>
                    <p className="text-sm text-slate-500">{msg.email}</p>
                    {msg.subject && <p className="mt-2 text-sm font-medium text-slate-700">{msg.subject}</p>}
                    <p className="mt-1 whitespace-pre-line text-sm text-slate-600">{msg.message}</p>
                  </div>
                  <span className="shrink-0 text-xs text-slate-400">{formatDate(msg.created_at)}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
