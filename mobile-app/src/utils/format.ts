export function money(value = 0) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: process.env.EXPO_PUBLIC_CURRENCY ?? 'BDT',
    maximumFractionDigits: 2,
  }).format(value);
}

export function dateInputValue(value?: string | Date) {
  const date = value ? new Date(value) : new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function dateLabel(value?: string) {
  if (!value) return '';
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(value));
}

export function refName(value: string | { name?: string; number?: string }) {
  if (typeof value === 'string') return value;
  return value.number ? `${value.name} (${value.number})` : value.name ?? '';
}
