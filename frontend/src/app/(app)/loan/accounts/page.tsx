'use client';

import { Pencil, Plus, Trash2 } from 'lucide-react';
import { FormEvent, useCallback, useState } from 'react';
import { DataTable } from '@/components/DataTable';
import { Modal } from '@/components/Modal';
import { http } from '@/lib/api';
import type { LoanPerson } from '@/lib/types';
import { type LiveRefreshOptions, useLiveRefresh } from '@/lib/useLiveRefresh';

export default function LoanAccountsPage() {
  const [items, setItems] = useState<LoanPerson[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<LoanPerson | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async ({ silent = false }: LiveRefreshOptions = {}) => {
    if (!silent) {
      setLoading(true);
    }
    try {
      setItems(await http.get<LoanPerson[]>('/loan/accounts'));
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, []);

  useLiveRefresh(load);

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
      await load({ silent: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    }
  }

  async function remove(id: string) {
    if (!window.confirm('Delete this loan account?')) {
      return;
    }
    await http.delete(`/loan/accounts/${id}`);
    await load({ silent: true });
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

      <DataTable
        rows={items}
        loading={loading}
        columns={['Name', 'Phone', 'Address', 'Details', 'Action']}
        colSpan={5}
        emptyMessage="No loan accounts found."
        renderRow={(item) => (
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
        )}
      />

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
