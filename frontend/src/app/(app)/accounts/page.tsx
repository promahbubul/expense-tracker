'use client';

import { Pencil, Plus, Trash2 } from 'lucide-react';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Modal } from '@/components/Modal';
import { http } from '@/lib/api';
import { money } from '@/lib/format';
import type { Account } from '@/lib/types';

export default function AccountsPage() {
  const [items, setItems] = useState<Account[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setItems(await http.get<Account[]>('/accounts'));
  }, []);

  useEffect(() => {
    load().catch(console.error);
  }, [load]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    const form = new FormData(event.currentTarget);
    const body = {
      name: String(form.get('name')),
      number: String(form.get('number')),
      details: String(form.get('details')),
      initialBalance: Number(form.get('initialBalance') || 0),
    };

    try {
      if (editing) {
        await http.patch(`/accounts/${editing._id}`, {
          name: body.name,
          number: body.number,
          details: body.details,
        });
      } else {
        await http.post('/accounts', body);
      }
      setOpen(false);
      setEditing(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    }
  }

  async function remove(id: string) {
    if (!window.confirm('Delete this account?')) {
      return;
    }
    await http.delete(`/accounts/${id}`);
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
          Add Account
        </button>
      </div>

      <div className="tableWrap">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Number</th>
              <th>Details</th>
              <th>Initial Deposit</th>
              <th>Current Balance</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item._id}>
                <td>{item.name}</td>
                <td>{item.number}</td>
                <td>{item.details}</td>
                <td>{money(item.initialBalance)}</td>
                <td className="amountIncome">{money(item.currentBalance)}</td>
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
                <td colSpan={6} className="muted">
                  No accounts found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <Modal
        open={open}
        title={editing ? 'Edit Account' : 'Add Account'}
        onClose={() => setOpen(false)}
        footer={
          <>
            <button className="ghostButton" type="button" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button className="button" type="submit" form="accountForm">
              Save
            </button>
          </>
        }
      >
        <form id="accountForm" className="formGrid" onSubmit={submit}>
          <div className="field">
            <label>Name</label>
            <input name="name" defaultValue={editing?.name ?? ''} required />
          </div>
          <div className="field">
            <label>Number</label>
            <input name="number" defaultValue={editing?.number ?? ''} />
          </div>
          <div className="field full">
            <label>Details</label>
            <textarea name="details" defaultValue={editing?.details ?? ''} />
          </div>
          {!editing ? (
            <div className="field">
              <label>Initial Deposit</label>
              <input name="initialBalance" type="number" min="0" step="0.01" defaultValue="0" />
            </div>
          ) : null}
          {error ? <p className="errorText full">{error}</p> : null}
        </form>
      </Modal>
    </>
  );
}
