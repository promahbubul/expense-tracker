'use client';

import { Pencil, Plus, Trash2 } from 'lucide-react';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Modal } from '@/components/Modal';
import { http } from '@/lib/api';
import type { LoanPerson } from '@/lib/types';

export default function LoanAccountsPage() {
  const [items, setItems] = useState<LoanPerson[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<LoanPerson | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setItems(await http.get<LoanPerson[]>('/loan/accounts'));
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
      phone: String(form.get('phone')),
      address: String(form.get('address')),
      details: String(form.get('details')),
    };

    try {
      if (editing) {
        await http.patch(`/loan/accounts/${editing._id}`, body);
      } else {
        await http.post('/loan/accounts', body);
      }
      setOpen(false);
      setEditing(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    }
  }

  async function remove(id: string) {
    if (!window.confirm('Delete this loan account?')) {
      return;
    }
    await http.delete(`/loan/accounts/${id}`);
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
          Add Loan Account
        </button>
      </div>

      <div className="tableWrap">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Phone</th>
              <th>Address</th>
              <th>Details</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item._id}>
                <td>{item.name}</td>
                <td>{item.phone}</td>
                <td>{item.address}</td>
                <td>{item.details}</td>
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
                <td colSpan={5} className="muted">
                  No loan accounts found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <Modal
        open={open}
        title={editing ? 'Edit Loan Account' : 'Add Loan Account'}
        onClose={() => setOpen(false)}
        footer={
          <>
            <button className="ghostButton" type="button" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button className="button" type="submit" form="loanAccountForm">
              Save
            </button>
          </>
        }
      >
        <form id="loanAccountForm" className="formGrid" onSubmit={submit}>
          <div className="field">
            <label>Name</label>
            <input name="name" defaultValue={editing?.name ?? ''} required />
          </div>
          <div className="field">
            <label>Phone</label>
            <input name="phone" defaultValue={editing?.phone ?? ''} />
          </div>
          <div className="field full">
            <label>Address</label>
            <textarea name="address" defaultValue={editing?.address ?? ''} />
          </div>
          <div className="field full">
            <label>Details</label>
            <textarea name="details" defaultValue={editing?.details ?? ''} />
          </div>
          {error ? <p className="errorText full">{error}</p> : null}
        </form>
      </Modal>
    </>
  );
}
