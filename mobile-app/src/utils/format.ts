export function money(value = 0) {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function toDate(value?: string | Date) {
  const date = value ? new Date(value) : new Date();
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function pad(value: number) {
  return String(value).padStart(2, '0');
}

export function dateInputValue(value?: string | Date) {
  const date = toDate(value);
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  return `${year}-${month}-${day}`;
}

export function dateLabel(value?: string) {
  if (!value) return '';
  const date = toDate(value);
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
}

export function refName(value: string | { name?: string; number?: string }) {
  if (typeof value === 'string') return value;
  return value.number ? `${value.name} (${value.number})` : value.name ?? '';
}
