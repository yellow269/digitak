'use client';

import { useState } from 'react';
import { Send, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { createClient } from '@/lib/supabase/client';

const MAX_NAME = 100;
const MAX_EMAIL = 254;
const MAX_SUBJECT = 200;
const MAX_MESSAGE = 5000;

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function sanitizeInput(input: string): string {
  return input.trim().replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
}

export function ContactForm() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const name = sanitizeInput(String(formData.get('name') || ''));
    const email = sanitizeInput(String(formData.get('email') || ''));
    const subject = sanitizeInput(String(formData.get('subject') || ''));
    const message = sanitizeInput(String(formData.get('message') || ''));

    if (!name || !email || !message) {
      setStatus('error');
      setError('Please fill in your name, email and message.');
      return;
    }

    if (name.length > MAX_NAME) {
      setStatus('error');
      setError(`Name must be ${MAX_NAME} characters or less.`);
      return;
    }

    if (!validateEmail(email) || email.length > MAX_EMAIL) {
      setStatus('error');
      setError('Please enter a valid email address.');
      return;
    }

    if (subject.length > MAX_SUBJECT) {
      setStatus('error');
      setError(`Subject must be ${MAX_SUBJECT} characters or less.`);
      return;
    }

    if (message.length > MAX_MESSAGE) {
      setStatus('error');
      setError(`Message must be ${MAX_MESSAGE} characters or less.`);
      return;
    }

    // Basic spam prevention: reject messages that are all links
    const linkCount = (message.match(/https?:\/\//g) || []).length;
    const wordCount = message.split(/\s+/).filter(Boolean).length;
    if (linkCount > 3 && wordCount < 10) {
      setStatus('error');
      setError('Please write a meaningful message.');
      return;
    }

    setStatus('loading');
    setError('');
    const supabase = createClient();
    const { error: dbError } = await supabase.from('contact_messages').insert({
      name,
      email,
      subject: subject || null,
      message,
    });
    if (dbError) {
      console.error('[ContactForm] Insert error:', dbError.message);
      setStatus('error');
      setError('Something went wrong. Please try again later.');
      return;
    }
    setStatus('success');
    form.reset();
  }

  if (status === 'success') {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-8 text-center">
        <CheckCircle2 className="h-12 w-12 text-green-500" />
        <h2 className="text-lg font-semibold text-green-900">Message sent!</h2>
        <p className="text-sm text-green-700">Thanks for reaching out. We&apos;ll get back to you soon.</p>
        <Button variant="outline" onClick={() => setStatus('idle')}>Send another message</Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="name">Name *</Label>
          <Input
            id="name"
            name="name"
            required
            placeholder="Your name"
            maxLength={MAX_NAME}
          />
        </div>
        <div>
          <Label htmlFor="email">Email *</Label>
          <Input
            id="email"
            name="email"
            type="email"
            required
            placeholder="you@example.com"
            maxLength={MAX_EMAIL}
          />
        </div>
      </div>
      <div>
        <Label htmlFor="subject">Subject</Label>
        <Input
          id="subject"
          name="subject"
          placeholder="What is this about?"
          maxLength={MAX_SUBJECT}
        />
      </div>
      <div>
        <Label htmlFor="message">Message *</Label>
        <Textarea
          id="message"
          name="message"
          required
          rows={6}
          placeholder="Your message..."
          maxLength={MAX_MESSAGE}
        />
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <Button type="submit" disabled={status === 'loading'} className="gap-1">
        {status === 'loading' ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Sending...
          </>
        ) : (
          <>
            <Send className="h-4 w-4" />
            Send message
          </>
        )}
      </Button>
    </form>
  );
}
