import {
  endOfDay,
  endOfMonth,
  endOfYear,
  startOfDay,
  startOfMonth,
  startOfYear,
  subDays,
} from 'date-fns';

export type RangePreset = 'today' | 'daily' | 'yesterday' | 'weekly' | 'monthly' | 'yearly' | 'custom';

export function parseDateInput(value?: string) {
  if (!value) {
    return null;
  }

  const normalized = value.trim();
  const match = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    const [, year, month, day] = match;
    const parsed = new Date(Number(year), Number(month) - 1, Number(day));
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function buildDateFilter(from?: string, to?: string) {
  const fromDate = parseDateInput(from);
  const toDate = parseDateInput(to);

  if (!fromDate && !toDate) {
    return undefined;
  }

  return {
    ...(fromDate ? { $gte: startOfDay(fromDate) } : {}),
    ...(toDate ? { $lte: endOfDay(toDate) } : {}),
  };
}

export function resolveDateRange(preset?: RangePreset, from?: string, to?: string) {
  const now = new Date();
  if (preset === 'custom') {
    const fromDate = parseDateInput(from ?? to ?? '');
    const toDate = parseDateInput(to ?? from ?? '');

    if (fromDate && toDate) {
      return { from: startOfDay(fromDate), to: endOfDay(toDate) };
    }
  }
  if (preset === 'yesterday') {
    const date = subDays(now, 1);
    return { from: startOfDay(date), to: endOfDay(date) };
  }
  if (preset === 'weekly') {
    return { from: startOfDay(subDays(now, 6)), to: endOfDay(now) };
  }
  if (preset === 'monthly') {
    return { from: startOfMonth(now), to: endOfMonth(now) };
  }
  if (preset === 'yearly') {
    return { from: startOfYear(now), to: endOfYear(now) };
  }
  return { from: startOfDay(now), to: endOfDay(now) };
}
