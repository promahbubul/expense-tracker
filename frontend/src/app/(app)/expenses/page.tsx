import { TransactionsPage } from '@/components/TransactionsPage';

export default function ExpensesPage() {
  return <TransactionsPage endpoint="expenses" title="Expenses" categoryType="EXPENSE" />;
}
