'use client';

type AuthLayoutProps = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
};

export function AuthLayout({ title, subtitle, children }: AuthLayoutProps) {
  return (
    <main className="authPage">
      <section className="authPanel">
        <div className="authBrand authBrandCompact">
          <span className="authBrandMark">ET</span>
          <strong>Expense Tracker</strong>
        </div>
        <div className="authPanelHeader">
          <h1>{title}</h1>
          {subtitle ? <p className="muted">{subtitle}</p> : null}
        </div>
        {children}
      </section>
    </main>
  );
}
