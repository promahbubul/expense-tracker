'use client';

import Image from 'next/image';

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
          <span className="authBrandMark">
            <Image src="/logo.png" alt="Expense Tracker logo" width={28} height={28} className="authBrandLogoImage" priority />
          </span>
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
