'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { CategoryManager } from '@/components/CategoryManager';
import type { CategoryType } from '@/lib/types';

const tabs: Array<{ key: 'expense' | 'income'; label: string; type: CategoryType }> = [
  { key: 'expense', label: 'Expense', type: 'EXPENSE' },
  { key: 'income', label: 'Income', type: 'INCOME' },
];

export default function CategoriesPage() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeKey = searchParams.get('type') === 'income' ? 'income' : 'expense';
  const activeTab = tabs.find((tab) => tab.key === activeKey) ?? tabs[0];

  function changeTab(nextKey: 'expense' | 'income') {
    const params = new URLSearchParams(searchParams.toString());

    if (nextKey === 'income') {
      params.set('type', 'income');
    } else {
      params.delete('type');
    }

    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  }

  return (
    <CategoryManager
      type={activeTab.type}
      toolbarStart={
        <div className="periodTabs" role="tablist" aria-label="Category type">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={activeTab.key === tab.key}
              className={activeTab.key === tab.key ? 'active' : ''}
              onClick={() => changeTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      }
    />
  );
}
