import { clsx, type ClassValue } from 'clsx';
import { differenceInCalendarDays, format, formatDistanceToNow } from 'date-fns';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: string | number, currency = 'NPR') {
  return new Intl.NumberFormat('en-NP', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(Number(amount));
}

/**
 * Compact date range in the agency's local calendar: "5-16 Oct 2026",
 * "28 Oct - 4 Nov 2026", "30 Dec 2026 - 4 Jan 2027".
 */
export function formatDateRange(start: string | Date, end: string | Date) {
  const from = new Date(start);
  const to = new Date(end);
  const day = (value: Date) => format(value, 'd');
  const month = (value: Date) => format(value, 'MMM');
  const year = (value: Date) => format(value, 'yyyy');

  if (format(from, 'yyyy-MM-dd') === format(to, 'yyyy-MM-dd')) {
    return `${day(from)} ${month(from)} ${year(from)}`;
  }
  if (year(from) !== year(to)) {
    return `${day(from)} ${month(from)} ${year(from)} - ${day(to)} ${month(to)} ${year(to)}`;
  }
  if (format(from, 'yyyy-MM') !== format(to, 'yyyy-MM')) {
    return `${day(from)} ${month(from)} - ${day(to)} ${month(to)} ${year(to)}`;
  }
  return `${day(from)}-${day(to)} ${month(to)} ${year(to)}`;
}

/**
 * ISO timestamp -> yyyy-mm-dd for <input type="date">.
 * Timestamps are stored at workspace-local midnight, so the local calendar is the
 * source of truth; reading them as UTC would shift the day in non-UTC zones.
 */
export function toDateInput(value: string | null | undefined) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return format(date, 'yyyy-MM-dd');
}

/**
 * yyyy-mm-dd -> ISO datetime at local midnight (backend requires a full datetime).
 * The backend stores the workspace-local calendar day, so this must stay local —
 * anchoring to UTC here would shift the day backwards in positive-offset zones.
 */
export function fromDateInput(value: string) {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
}

/** Signed day difference between today and a future date; negative once passed. */
export function daysUntil(value: string | Date) {
  return differenceInCalendarDays(new Date(value), new Date());
}

/** Today's date as yyyy-mm-dd. */
export function todayInput() {
  return format(new Date(), 'yyyy-MM-dd');
}

export function formatDate(date: string | Date) {
  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
  }).format(new Date(date));
}

export function formatDateTime(date: string | Date) {
  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(date));
}

export function getInitials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '—';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
}

export function debounce<Args extends unknown[]>(fn: (...args: Args) => void, ms: number) {
  let timeout: ReturnType<typeof setTimeout>;
  return (...args: Args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), ms);
  };
}

export function relativeDate(date: string | Date) {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

export function dayCountBadge(count: number) {
  return `${count} ${count === 1 ? 'day' : 'days'}`;
}

export function daysSince(date: string | Date): number {
  return Math.max(0, differenceInCalendarDays(new Date(), new Date(date)));
}

export function formatRelative(date: string | Date): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

export function truncated(text: string, maxLength: number): string {
  const trimmed = text.trim();
  if (maxLength <= 0) return '';
  if (trimmed.length <= maxLength) return trimmed;
  return `${trimmed.slice(0, maxLength - 1).trimEnd()}…`;
}
