'use client';

export type PeriodValue = 'today' | 'yesterday' | 'weekly' | 'monthly' | 'yearly' | 'custom';

const periods: Array<{ value: PeriodValue; label: string }> = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
  { value: 'custom', label: 'Custom' },
];

export function PeriodTabs({
  value,
  onChange,
  disabled = false,
}: {
  value: PeriodValue;
  onChange: (value: PeriodValue) => void;
  disabled?: boolean;
}) {
  return (
    <div className="periodTabs" role="tablist" aria-label="Dashboard filter">
      {periods.map((period) => (
        <button
          key={period.value}
          type="button"
          role="tab"
          aria-selected={value === period.value}
          className={value === period.value ? 'active' : ''}
          disabled={disabled}
          onClick={() => onChange(period.value)}
        >
          {period.label}
        </button>
      ))}
    </div>
  );
}
