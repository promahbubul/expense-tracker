export function money(value = 0) {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function shortDate(value?: string) {
  if (!value) {
    return '';
  }
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(new Date(value));
}

export function refName(value: string | { name?: string; number?: string; phone?: string }) {
  if (typeof value === 'string') {
    return value;
  }
  return value?.number ? `${value.name} (${value.number})` : value?.name ?? '';
}
