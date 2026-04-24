'use client';

import clsx from 'clsx';
import {
  Banknote,
  BarChart3,
  Building2,
  CircleDollarSign,
  ClipboardList,
  FolderTree,
  Home,
  LogOut,
  ReceiptText,
  Settings,
  UserRoundCog,
  Users,
  WalletCards,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ThemeToggle } from '@/components/ThemeProvider';
import { clearSession, getStoredUser, getToken } from '@/lib/api';
import type { AuthUser, UserRole } from '@/lib/types';

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  roles?: UserRole[];
};

const nav: NavItem[] = [
  { href: '/', label: 'Dashboard', icon: Home },
  { href: '/expenses', label: 'Expenses', icon: ReceiptText },
  { href: '/incomes', label: 'Incomes', icon: CircleDollarSign },
  { href: '/categories/income', label: 'Income Categories', icon: FolderTree },
  { href: '/categories/expenses', label: 'Expense Categories', icon: FolderTree },
  { href: '/accounts', label: 'Accounts', icon: WalletCards },
  { href: '/loan/accounts', label: 'Loan Accounts', icon: Users },
  { href: '/loan/loads', label: 'Loans', icon: Banknote },
  { href: '/reports', label: 'Reports', icon: BarChart3 },
  { href: '/companies', label: 'Companies', icon: Building2, roles: ['SUPER_ADMIN', 'ADMIN'] },
  { href: '/users', label: 'Users', icon: UserRoundCog, roles: ['SUPER_ADMIN', 'ADMIN'] },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login');
      return;
    }
    setUser(getStoredUser());
  }, [router]);

  function logout() {
    clearSession();
    router.replace('/login');
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <ClipboardList size={24} />
          <div>
            <strong>Expense Tracker</strong>
            <span>{user?.role?.replace('_', ' ') ?? 'Workspace'}</span>
          </div>
        </div>
        <nav className="navList">
          {nav
            .filter((item) => !item.roles || (user?.role ? item.roles.includes(user.role) : false))
            .map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;
              return (
                <Link key={item.href} href={item.href} className={clsx('navItem', active && 'active')}>
                  <Icon size={18} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
        </nav>
      </aside>
      <div className="main">
        <header className="topbar">
          <div>
            <strong>{user?.name ?? 'User'}</strong>
            <span>{user?.email ?? ''}</span>
          </div>
          <div className="topbarActions">
            <ThemeToggle />
            <button className="ghostButton" type="button" onClick={logout}>
              <LogOut size={17} />
              Logout
            </button>
          </div>
        </header>
        <main className="content">{children}</main>
      </div>
    </div>
  );
}
