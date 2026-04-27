import { CategoriesPageClient } from './CategoriesPageClient';

type CategoriesPageProps = {
  searchParams?: Promise<{
    type?: string | string[];
  }>;
};

export default async function CategoriesPage({ searchParams }: CategoriesPageProps) {
  const params = searchParams ? await searchParams : undefined;
  const typeValue = Array.isArray(params?.type) ? params.type[0] : params?.type;
  const activeKey = typeValue === 'income' ? 'income' : 'expense';

  return <CategoriesPageClient activeKey={activeKey} />;
}
