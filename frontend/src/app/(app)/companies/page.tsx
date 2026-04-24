'use client';

import { Pencil } from 'lucide-react';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Modal } from '@/components/Modal';
import { http } from '@/lib/api';
import type { Company } from '@/lib/types';

export default function CompaniesPage() {
  const [items, setItems] = useState<Company[]>([]);
  const [editing, setEditing] = useState<Company | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setItems(await http.get<Company[]>('/companies'));
  }, []);

  useEffect(() => {
    load().catch(console.error);
  }, [load]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) {
      return;
    }
    setError('');
    const form = new FormData(event.currentTarget);
    try {
      await http.patch(`/companies/${editing._id}`, {
        name: String(form.get('name')),
        email: String(form.get('email')),
        phone: String(form.get('phone')),
        address: String(form.get('address')),
        details: String(form.get('details')),
      });
      setEditing(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    }
  }

  return (
    <>
      <div className="pageHeader">
        <div>
          <h1>Companies</h1>
          <p>Company profile and company-level management.</p>
        </div>
      </div>

      <div className="tableWrap">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Status</th>
              <th>Address</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item._id}>
                <td>{item.name}</td>
                <td>{item.email}</td>
                <td>{item.phone}</td>
                <td>
                  <span className="badge">{item.status}</span>
                </td>
                <td>{item.address}</td>
                <td>
                  <button className="iconButton" type="button" onClick={() => setEditing(item)} aria-label="Edit">
                    <Pencil size={16} />
                  </button>
                </td>
              </tr>
            ))}
            {!items.length ? (
              <tr>
                <td colSpan={6} className="muted">
                  No companies found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <Modal
        open={Boolean(editing)}
        title="Edit Company"
        onClose={() => setEditing(null)}
        footer={
          <>
            <button className="ghostButton" type="button" onClick={() => setEditing(null)}>
              Cancel
            </button>
            <button className="button" type="submit" form="companyForm">
              Save
            </button>
          </>
        }
      >
        <form id="companyForm" className="formGrid" onSubmit={submit}>
          <div className="field">
            <label>Name</label>
            <input name="name" defaultValue={editing?.name ?? ''} required />
          </div>
          <div className="field">
            <label>Email</label>
            <input name="email" type="email" defaultValue={editing?.email ?? ''} />
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
