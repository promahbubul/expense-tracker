import {
  endOfDay,
  endOfMonth,
  endOfWeek,
  endOfYear,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
  subDays,
} from 'date-fns';

export type RangePreset = 'today' | 'daily' | 'yesterday' | 'weekly' | 'monthly' | 'yearly' | 'custom';

export function resolveDateRange(preset?: RangePreset, from?: string, to?: string) {
  const now = new Date();
  if (preset === 'custom' && from && to) {
    return { from: startOfDay(new Date(from)), to: endOfDay(new Date(to)) };
  }
  if (preset === 'yesterday') {
    const date = subDays(now, 1);
    return { from: startOfDay(date), to: endOfDay(date) };
  }
  if (preset === 'weekly') {
    return { from: startOfWeek(now), to: endOfWeek(now) };
  }
  if (preset === 'monthly') {
    return { from: startOfMonth(now), to: endOfMonth(now) };
  }
  if (preset === 'yearly') {
    return { from: startOfYear(now), to: endOfYear(now) };
  }
  return { from: startOfDay(now), to: endOfDay(now) };
}
