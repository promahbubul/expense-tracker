'use client';

import { usePathname, useRouter } from 'next/navigation';
import { CategoryManager } from '@/components/CategoryManager';
import type { CategoryType } from '@/lib/types';

const tabs: Array<{ key: 'expense' | 'income'; label: string; type: CategoryType }> = [
  { key: 'expense', label: 'Expense', type: 'EXPENSE' },
  { key: 'income', label: 'Income', type: 'INCOME' },
];

type CategoriesPageClientProps = {
  activeKey: 'expense' | 'income';
};

export function CategoriesPageClient({ activeKey }: CategoriesPageClientProps) {
  const pathname = usePathname();
  const router = useRouter();
  const activeTab = tabs.find((tab) => tab.key === activeKey) ?? tabs[0];

  function changeTab(nextKey: 'expense' | 'income') {
    const query = nextKey === 'income' ? '?type=income' : '';
    router.replace(`${pathname}${query}`);
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
