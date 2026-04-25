'use client';

import { Pencil, Plus, Trash2 } from 'lucide-react';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Modal } from '@/components/Modal';
import { http } from '@/lib/api';
import { money, refName, shortDate } from '@/lib/format';
import type { Account, Loan, LoanPerson } from '@/lib/types';

function refId(value: Loan['accountId']) {
  return typeof value === 'string' ? value : value._id;
}

function dateInput(value?: string) {
  return value ? new Date(value).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
}

export default function LoanLoadsPage() {
  const [items, setItems] = useState<Loan[]>([]);
  const [people, setPeople] = useState<LoanPerson[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Loan | null>(null);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    const suffix = params.toString() ? `?${params}` : '';
    const [loanRows, personRows, accountRows] = await Promise.all([
      http.get<Loan[]>(`/loan/loads${suffix}`),
      http.get<LoanPerson[]>('/loan/accounts'),
      http.get<Account[]>('/accounts'),
    ]);
    setItems(loanRows);
    setPeople(personRows);
    setAccounts(accountRows);
  }, [from, to]);

  useEffect(() => {
    load().catch(console.error);
  }, [load]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    const form = new FormData(event.currentTarget);
    const body = {
      personId: String(form.get('personId')),
      accountId: String(form.get('accountId')),
      direction: String(form.get('direction')),
      amount: Number(form.get('amount')),
      purpose: String(form.get('purpose')),
      loanDate: String(form.get('loanDate')),
    };

    try {
      if (editing) {
        await http.patch(`/loan/loads/${editing._id}`, body);
      } else {
        await http.post('/loan/loads', body);
      }
      setOpen(false);
      setEditing(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    }
  }

  async function remove(id: string) {
    if (!window.confirm('Delete this loan?')) {
      return;
    }
    await http.delete(`/loan/loads/${id}`);
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
          Add Loan
        </button>
      </div>

      <div className="toolbar">
        <div className="field">
          <label>From</label>
          <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
        </div>
        <div className="field">
          <label>To</label>
          <input type="date" value={to} onChange={(event) => setTo(event.target.value)} />
        </div>
        <button className="ghostButton" type="button" onClick={() => load().catch(console.error)}>
          Filter
        </button>
      </div>

      <div className="tableWrap">
        <table>
          <thead>
            <tr>
              <th>Person</th>
              <th>Account</th>
              <th>Type</th>
              <th>Date</th>
              <th>Purpose</th>
              <th>Amount</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item._id}>
                <td>{refName(item.personId)}</td>
                <td>{refName(item.accountId)}</td>
                <td>
                  <span className="badge">{item.direction}</span>
                </td>
                <td>{shortDate(item.loanDate)}</td>
                <td>{item.purpose}</td>
                <td className={item.direction === 'BORROWED' ? 'amountIncome' : 'amountExpense'}>{money(item.amount)}</td>
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
                <td colSpan={7} className="muted">
                  No loans found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <Modal
        open={open}
        title={editing ? 'Edit Loan' : 'Add Loan'}
        onClose={() => setOpen(false)}
        footer={
          <>
            <button className="ghostButton" type="button" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button className="button" type="submit" form="loanForm">
              Save
            </button>
          </>
        }
      >
        <form id="loanForm" className="formGrid" onSubmit={submit}>
          <div className="field">
            <label>Loan Account</label>
            <select name="personId" defaultValue={editing ? refId(editing.personId) : ''} required>
              <option value="" disabled>
                Select person
              </option>
              {people.map((person) => (
                <option key={person._id} value={person._id}>
                  {person.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>App Account</label>
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
            <label>Type</label>
            <select name="direction" defaultValue={editing?.direction ?? 'LENT'} required>
              <option value="LENT">Lent</option>
              <option value="BORROWED">Borrowed</option>
            </select>
          </div>
          <div className="field">
            <label>Date</label>
            <input name="loanDate" type="date" defaultValue={dateInput(editing?.loanDate)} required />
          </div>
          <div className="field full">
            <label>Purpose</label>
            <textarea name="purpose" defaultValue={editing?.purpose ?? ''} required />
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
