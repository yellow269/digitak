import { CURRENCY_SYMBOLS } from './constants';

export function formatPrice(price: number | null, currency: string): string {
  if (price === null || price === undefined) return '—';
  const symbol = CURRENCY_SYMBOLS[currency] || '';
  const formatted = price.toLocaleString('en-ZA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${symbol}${formatted}`;
}

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  // Check for invalid date
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-ZA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}
