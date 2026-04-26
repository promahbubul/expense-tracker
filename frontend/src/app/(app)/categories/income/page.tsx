import { redirect } from 'next/navigation';

export default function IncomeCategoriesPage() {
  redirect('/categories?type=income');
}
