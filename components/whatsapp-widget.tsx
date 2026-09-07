'use client';

import { usePathname } from 'next/navigation';
import { WhatsAppButton } from '@/components/whatsapp-button';

export function WhatsAppWidget({ message }: { message?: string }) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith('/admin');
  return <WhatsAppButton hidden={isAdmin} message={message} />;
}
