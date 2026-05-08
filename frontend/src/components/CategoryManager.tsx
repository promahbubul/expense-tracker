'use client';

import { Pencil, Plus, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { FormEvent, useCallback, useState } from 'react';
import { DataTable } from '@/components/DataTable';
import { Modal } from '@/components/Modal';
import { useToast } from '@/components/ToastProvider';
import { http } from '@/lib/api';
import type { Category, CategoryType } from '@/lib/types';
import { type LiveRefreshOptions, useLiveRefresh } from '@/lib/useLiveRefresh';

type Props = {
  type: CategoryType;
  toolbarStart?: ReactNode;
};

export function CategoryManager({ type, toolbarStart }: Props) {
  const [items, setItems] = useState<Category[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const toast = useToast();

  const load = useCallback(async ({ silent = false }: LiveRefreshOptions = {}) => {
    const request = async () => {
      setItems(await http.get<Category[]>(`/categories?type=${type}`));
    };

    if (!silent) {
      setLoading(true);
    }
    try {
      if (silent) {
        await request();
      } else {
        await toast.track(request, {
          loading: `Loading ${type === 'EXPENSE' ? 'expense' : 'income'} categories...`,
          success: 'Categories updated',
          error: (err) => (err instanceof Error ? err.message : 'Could not load categories'),
        });
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, [toast, type]);

  useLiveRefresh(load);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    const form = new FormData(event.currentTarget);
    try {
      await toast.track(
        () => (editing ? http.patch(`/categories/${editing._id}`, { name: String(form.get('name')) }) : http.post('/categories', { name: String(form.get('name')), type })),
        {
          loading: editing ? 'Updating category...' : 'Saving category...',
          success: editing ? 'Category updated' : 'Category saved',
          error: (err) => (err instanceof Error ? err.message : 'Save failed'),
        },
      );
      setOpen(false);
      setEditing(null);
      void load({ silent: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSubmitting(false);
    }
  }

  async function remove(id: string) {
    if (!window.confirm('Delete this category?')) {
      return;
    }
    setDeletingId(id);
    const previousItems = items;
    setItems((current) => current.filter((item) => item._id !== id));
    try {
      await toast.track(() => http.delete(`/categories/${id}`), {
        loading: 'Deleting category...',
        success: 'Category deleted',
        error: (err) => (err instanceof Error ? err.message : 'Delete failed'),
      });
      void load({ silent: true });
    } catch (err) {
      setItems(previousItems);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <>
      <div className={`pageTools${toolbarStart ? ' pageToolsSplit' : ''}`}>
        {toolbarStart ? <div className="pageToolsStart">{toolbarStart}</div> : null}
        <button
          className="button"
          type="button"
          disabled={submitting || Boolean(deletingId)}
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          <Plus size={17} />
          {type === 'EXPENSE' ? 'Add Expense Category' : 'Add Income Category'}
        </button>
      </div>

      <DataTable
        rows={items}
        loading={loading}
        columns={['Name', 'Type', 'Action']}
        colSpan={3}
        emptyMessage="No categories found."
        renderRow={(item) => (
          <tr key={item._id}>
            <td>{item.name}</td>
            <td>
              <span className="badge">{item.type}</span>
            </td>
            <td>
              <div className="actions">
                <button
                  className="iconButton"
                  type="button"
                  disabled={submitting || Boolean(deletingId)}
                  onClick={() => {
                    setEditing(item);
                    setOpen(true);
                  }}
                  aria-label="Edit"
                >
                  <Pencil size={16} />
                </button>
                <button className="iconButton" type="button" onClick={() => remove(item._id)} aria-label="Delete" disabled={submitting || Boolean(deletingId)}>
                  {deletingId === item._id ? <span className="loadingSpinner loadingSpinnerInline" aria-hidden="true" /> : <Trash2 size={16} />}
                </button>
              </div>
            </td>
          </tr>
        )}
      />

      <Modal
        open={open}
        title={editing ? 'Edit Category' : 'Add Category'}
        onClose={() => setOpen(false)}
        footer={
          <>
            <button className="ghostButton" type="button" onClick={() => setOpen(false)} disabled={submitting}>
              Cancel
            </button>
            <button className="button" type="submit" form="categoryForm" disabled={submitting}>
              {submitting ? <span className="loadingSpinner loadingSpinnerInline loadingSpinnerLight" aria-hidden="true" /> : null}
              Save
            </button>
          </>
        }
      >
        <form id="categoryForm" className="formGrid" onSubmit={submit}>
          <div className="field full">
            <label>Name</label>
            <input name="name" defaultValue={editing?.name ?? ''} required />
          </div>
          {error ? <p className="errorText full">{error}</p> : null}
        </form>
      </Modal>
    </>
  );
}
