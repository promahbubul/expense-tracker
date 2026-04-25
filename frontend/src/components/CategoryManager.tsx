'use client';

import { Pencil, Plus, Trash2 } from 'lucide-react';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Modal } from '@/components/Modal';
import { http } from '@/lib/api';
import type { Category, CategoryType } from '@/lib/types';

type Props = {
  type: CategoryType;
  title: string;
};

export function CategoryManager({ type, title }: Props) {
  const [items, setItems] = useState<Category[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setItems(await http.get<Category[]>(`/categories?type=${type}`));
  }, [type]);

  useEffect(() => {
    load().catch(console.error);
  }, [load]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    const form = new FormData(event.currentTarget);
    try {
      if (editing) {
        await http.patch(`/categories/${editing._id}`, { name: String(form.get('name')) });
      } else {
        await http.post('/categories', { name: String(form.get('name')), type });
      }
      setOpen(false);
      setEditing(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    }
  }

  async function remove(id: string) {
    if (!window.confirm('Delete this category?')) {
      return;
    }
    await http.delete(`/categories/${id}`);
    await load();
  }

  return (
    <>
      <div className="pageTools">
        <button
          className="button"
          type="button"
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          <Plus size={17} />
          Add Category
        </button>
      </div>

      <div className="tableWrap">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
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
                      onClick={() => {
                        setEditing(item);
                        setOpen(true);
                      }}
                      aria-label="Edit"
                    >
                      <Pencil size={16} />
                    </button>
                    <button className="iconButton" type="button" onClick={() => remove(item._id)} aria-label="Delete">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!items.length ? (
              <tr>
                <td colSpan={3} className="muted">
                  No categories found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <Modal
        open={open}
        title={editing ? 'Edit Category' : 'Add Category'}
        onClose={() => setOpen(false)}
        footer={
          <>
            <button className="ghostButton" type="button" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button className="button" type="submit" form="categoryForm">
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
