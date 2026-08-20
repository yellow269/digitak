'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

export function NewsletterForm() {
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!consent) {
      setStatus('error');
      setMessage('Please tick the consent box to subscribe.');
      return;
    }

    const trimmedEmail = email.trim().toLowerCase();
    if (!validateEmail(trimmedEmail)) {
      setStatus('error');
      setMessage('Please enter a valid email address.');
      return;
    }

    setStatus('loading');
    setMessage('');
    const supabase = createClient();
    const { error } = await supabase.from('newsletter_subscribers').insert({
      email: trimmedEmail,
      consent: true,
    });
    if (error) {
      if (error.code === '23505') {
        setStatus('success');
        setMessage("You're already subscribed!");
      } else {
        console.error('[NewsletterForm] Insert error:', error.message);
        setStatus('error');
        setMessage('Something went wrong. Please try again.');
      }
      return;
    }
    setStatus('success');
    setMessage('Thanks for subscribing!');
    setEmail('');
  }

  if (status === 'success') {
    return (
      <div className="flex flex-col items-center gap-2 text-center">
        <CheckCircle2 className="h-10 w-10 text-green-500" />
        <p className="font-medium text-slate-900">{message}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <Input
        type="email"
        placeholder="Enter your email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        aria-label="Email address"
        maxLength={254}
      />
      <label className="flex items-start gap-2 text-sm text-slate-600">
        <Checkbox
          checked={consent}
          onCheckedChange={(v) => setConsent(v === true)}
          className="mt-0.5"
        />
        <span>I consent to receive the DigitalVault SA newsletter by email.</span>
      </label>
      {message && <p className="text-sm text-red-500">{message}</p>}
      <Button type="submit" disabled={status === 'loading'} className="w-full">
        {status === 'loading' ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Subscribing...
          </>
        ) : (
          'Subscribe'
        )}
      </Button>
    </form>
  );
}
