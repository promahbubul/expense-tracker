'use client';

import { Pencil, Plus, Trash2 } from 'lucide-react';
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { DataTable } from '@/components/DataTable';
import { Modal } from '@/components/Modal';
import { http } from '@/lib/api';
import { money, refName, shortDate } from '@/lib/format';
import type { Account, Category, CategoryType, Transaction } from '@/lib/types';
import { type LiveRefreshOptions, useLiveRefresh } from '@/lib/useLiveRefresh';

type Props = {
  endpoint: 'expenses' | 'incomes';
  title: string;
  categoryType: CategoryType;
};

function refId(value: Transaction['categoryId']) {
  return typeof value === 'string' ? value : value._id;
}

function dateInput(value?: string) {
  return value ? new Date(value).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
}

export function TransactionsPage({ endpoint, title, categoryType }: Props) {
  const [items, setItems] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const amountClass = categoryType === 'INCOME' ? 'amountIncome' : 'amountExpense';

  const load = useCallback(async ({ silent = false }: LiveRefreshOptions = {}) => {
    if (!silent) {
      setLoading(true);
    }
    try {
      const params = new URLSearchParams();
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      const suffix = params.toString() ? `?${params}` : '';
      const [records, accountRows, categoryRows] = await Promise.all([
        http.get<Transaction[]>(`/${endpoint}${suffix}`),
        http.get<Account[]>('/accounts'),
        http.get<Category[]>(`/categories?type=${categoryType}`),
      ]);
      setItems(records);
      setAccounts(accountRows);
      setCategories(categoryRows);
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, [categoryType, endpoint, from, to]);

  useLiveRefresh(load);

  const modalTitle = useMemo(() => `${editing ? 'Edit' : 'Add'} ${title.slice(0, -1)}`, [editing, title]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    const form = new FormData(event.currentTarget);
    const body = {
      description: String(form.get('description')),
      categoryId: String(form.get('categoryId')),
      accountId: String(form.get('accountId')),
      amount: Number(form.get('amount')),
      transactionDate: String(form.get('transactionDate')),
    };

    try {
      if (editing) {
        await http.patch(`/${endpoint}/${editing._id}`, body);
      } else {
        await http.post(`/${endpoint}`, body);
      }
      setOpen(false);
      setEditing(null);
      await load({ silent: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    }
  }

  async function remove(id: string) {
    if (!window.confirm('Delete this record?')) {
      return;
    }
    await http.delete(`/${endpoint}/${id}`);
    await load({ silent: true });
  }

  function startCreate() {
    setEditing(null);
    setOpen(true);
  }

  function startEdit(item: Transaction) {
    setEditing(item);
    setOpen(true);
  }

  function clearFilters() {
    setFrom('');
    setTo('');
  }

  return (
    <>
      <div className="toolbarBar">
        <div className="toolbar toolbarMain">
          <div className="field">
            <label>From</label>
            <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
          </div>
          <div className="field">
            <label>To</label>
            <input type="date" value={to} onChange={(event) => setTo(event.target.value)} />
          </div>
          <button className="ghostButton" type="button" onClick={() => load({ silent: false }).catch(console.error)} disabled={loading}>
            Filter
          </button>
          <button className="ghostButton" type="button" onClick={clearFilters} disabled={!from && !to}>
            Clear
          </button>
        </div>
        <div className="toolbarActions">
          <button className="button" type="button" onClick={startCreate}>
            <Plus size={17} />
            Add {title.slice(0, -1)}
          </button>
        </div>
      </div>

      <DataTable
        rows={items}
        loading={loading}
        columns={['Description', 'Category', 'Account', 'Date', 'Amount', 'Action']}
        colSpan={6}
        emptyMessage="No records found."
        renderRow={(item) => (
          <tr key={item._id}>
            <td>{item.description}</td>
            <td>{refName(item.categoryId)}</td>
            <td>{refName(item.accountId)}</td>
            <td>{shortDate(item.transactionDate)}</td>
            <td className={amountClass}>{money(item.amount)}</td>
            <td>
              <div className="actions">
                <button className="iconButton" type="button" onClick={() => startEdit(item)} aria-label="Edit">
                  <Pencil size={16} />
                </button>
                <button className="iconButton" type="button" onClick={() => remove(item._id)} aria-label="Delete">
                  <Trash2 size={16} />
                </button>
              </div>
            </td>
          </tr>
        )}
      />

      <Modal
        open={open}
        title={modalTitle}
        onClose={() => setOpen(false)}
        footer={
          <>
            <button className="ghostButton" type="button" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button className="button" type="submit" form="transactionForm">
              Save
            </button>
          </>
        }
      >
        <form id="transactionForm" className="formGrid" onSubmit={submit}>
          <div className="field full">
            <label>Description</label>
            <textarea name="description" defaultValue={editing?.description ?? ''} required />
          </div>
          <div className="field">
            <label>Category</label>
            <select name="categoryId" defaultValue={editing ? refId(editing.categoryId) : ''} required>
              <option value="" disabled>
                Select category
              </option>
              {categories.map((category) => (
                <option key={category._id} value={category._id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Account</label>
            <select name="accountId" defaultValue={editing ? refId(editing.accountId) : ''} required>
              <option value="" disabled>
                Select account
              </option>
              {accounts.map((account) => (
                <option key={account._id} value={account._id}>
                  {account.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Date</label>
            <input name="transactionDate" type="date" defaultValue={dateInput(editing?.transactionDate)} required />
          </div>
          <div className="field">
            <label>Amount</label>
            <input name="amount" type="number" min="0" step="0.01" defaultValue={editing?.amount ?? ''} required />
          </div>
          {error ? <p className="errorText full">{error}</p> : null}
        </form>
      </Modal>
    </>
  );
}
