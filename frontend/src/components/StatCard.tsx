import type { LucideIcon } from 'lucide-react';

type StatCardProps = {
  label: string;
  value: string;
  tone?: 'income' | 'expense' | 'loan' | 'neutral';
  icon?: LucideIcon;
  detail?: string;
};

export function StatCard({ label, value, detail, tone = 'neutral', icon: Icon }: StatCardProps) {
  return (
    <article className={`metricCard ${tone}`}>
      <div className="metricTop">
        <span>{label}</span>
        {Icon ? (
          <span className="metricIcon">
            <Icon size={18} />
          </span>
        ) : null}
      </div>
      <strong className="metricValue">{value}</strong>
      {detail ? <p className="muted">{detail}</p> : null}
    </article>
  );
}
