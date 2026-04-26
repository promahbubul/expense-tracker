'use client';

import clsx from 'clsx';
import {
  Banknote,
  BarChart3,
  CircleDollarSign,
  ClipboardList,
  FolderTree,
  Home,
  LogOut,
  ReceiptText,
  Settings,
  Users,
  WalletCards,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { ThemeToggle } from '@/components/ThemeProvider';
import { clearSession, getStoredUser, getToken } from '@/lib/api';
import type { AuthUser } from '@/lib/types';

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

const nav: NavItem[] = [
  { href: '/', label: 'Dashboard', icon: Home },
  { href: '/expenses', label: 'Expenses', icon: ReceiptText },
  { href: '/incomes', label: 'Incomes', icon: CircleDollarSign },
  { href: '/categories', label: 'Categories', icon: FolderTree },
  { href: '/accounts', label: 'Accounts', icon: WalletCards },
  { href: '/loan/accounts', label: 'Loan Contacts', icon: Users },
  { href: '/loan/loads', label: 'Loans', icon: Banknote },
  { href: '/reports', label: 'Reports', icon: BarChart3 },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const currentItem = nav.find((item) => {
    if (item.href === '/') {
      return pathname === '/';
    }
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  });

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login');
      return;
    }
    setUser(getStoredUser());
  }, [router]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    window.addEventListener('mousedown', handlePointerDown);
    return () => window.removeEventListener('mousedown', handlePointerDown);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  function logout() {
    clearSession();
    router.replace('/login');
  }

  const userInitial = (user?.name ?? user?.email ?? 'E').charAt(0).toUpperCase();

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brandIcon">
            <ClipboardList size={22} />
          </div>
          <div>
            <strong>Expense Tracker</strong>
          </div>
        </div>
        <nav className="navList">
          {nav.map((item) => {
            const Icon = item.icon;
            const active = item.href === '/' ? pathname === '/' : pathname === item.href || pathname.startsWith(`${item.href}/`);
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
          <div className="topbarTitle">
            <strong>{currentItem?.label ?? 'Workspace'}</strong>
          </div>
          <div className="topbarActions">
            <ThemeToggle />
            <div className="profileMenu" ref={menuRef}>
              <button
                className="profileTrigger"
                type="button"
                onClick={() => setMenuOpen((open) => !open)}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                aria-label="Open profile menu"
              >
                <span className="topbarAvatar">{userInitial}</span>
              </button>

              {menuOpen ? (
                <div className="profileDropdown" role="menu">
                  <div className="profileDetails">
                    <strong>{user?.name ?? 'Account'}</strong>
                    <span>{user?.email ?? ''}</span>
                  </div>
                  {user ? (
                    <button className="ghostButton profileAction" type="button" onClick={logout}>
                      <LogOut size={16} />
                      Logout
                    </button>
                  ) : (
                    <Link className="ghostButton profileAction" href="/login">
                      Login
                    </Link>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </header>
        <main className="content">{children}</main>
      </div>
    </div>
  );
}
