'use client';

export type PeriodValue = 'today' | 'yesterday' | 'weekly' | 'monthly' | 'yearly';

const periods: Array<{ value: PeriodValue; label: string }> = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Last Day' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
];

export function PeriodTabs({ value, onChange }: { value: PeriodValue; onChange: (value: PeriodValue) => void }) {
  return (
    <div className="periodTabs" role="tablist" aria-label="Dashboard filter">
      {periods.map((period) => (
        <button
          key={period.value}
          type="button"
          role="tab"
          aria-selected={value === period.value}
          className={value === period.value ? 'active' : ''}
          onClick={() => onChange(period.value)}
        >
          {period.label}
        </button>
      ))}
    </div>
  );
}
