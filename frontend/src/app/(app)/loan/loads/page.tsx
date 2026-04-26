'use client';

import { Pencil, Plus, Trash2 } from 'lucide-react';
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { DataTable } from '@/components/DataTable';
import { Modal } from '@/components/Modal';
import { http } from '@/lib/api';
import { money, refName, shortDate } from '@/lib/format';
import type { Account, Loan, LoanPerson } from '@/lib/types';

function refId(value: Loan['accountId'] | Loan['personId']) {
  return typeof value === 'string' ? value : value._id;
}

function directionLabel(direction: Loan['direction']) {
  return direction === 'LENT' ? 'Given' : 'Taken';
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
  const [personId, setPersonId] = useState('all');
  const [directionFilter, setDirectionFilter] = useState<'all' | 'LENT' | 'BORROWED'>('all');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    if (personId !== 'all') params.set('personId', personId);
    if (directionFilter !== 'all') params.set('direction', directionFilter);
    const suffix = params.toString() ? `?${params}` : '';
    const [loanRows, personRows, accountRows] = await Promise.all([
      http.get<Loan[]>(`/loan/loads${suffix}`),
      http.get<LoanPerson[]>('/loan/accounts'),
      http.get<Account[]>('/accounts'),
    ]);
    setItems(loanRows);
    setPeople(personRows);
    setAccounts(accountRows);
  }, [directionFilter, from, personId, to]);

  useEffect(() => {
    load().catch(console.error);
  }, [load]);

  const summary = useMemo(() => {
    const given = items.filter((item) => item.direction === 'LENT').reduce((sum, item) => sum + item.amount, 0);
    const taken = items.filter((item) => item.direction === 'BORROWED').reduce((sum, item) => sum + item.amount, 0);
    return {
      given,
      taken,
      net: given - taken,
    };
  }, [items]);

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

  function clearFilters() {
    setFrom('');
    setTo('');
    setPersonId('all');
    setDirectionFilter('all');
  }

  return (
    <>
      <div className="toolbarBar">
        <div className="toolbar toolbarMain">
          <div className="field">
            <label>Person</label>
            <select value={personId} onChange={(event) => setPersonId(event.target.value)}>
              <option value="all">All people</option>
              {people.map((person) => (
                <option key={person._id} value={person._id}>
                  {person.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Type</label>
            <select value={directionFilter} onChange={(event) => setDirectionFilter(event.target.value as 'all' | 'LENT' | 'BORROWED')}>
              <option value="all">All types</option>
              <option value="LENT">Given</option>
              <option value="BORROWED">Taken</option>
            </select>
          </div>
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
          <button className="ghostButton" type="button" onClick={clearFilters} disabled={!from && !to && personId === 'all' && directionFilter === 'all'}>
            Clear
          </button>
        </div>
        <div className="toolbarActions">
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
      </div>

      <section className="metricGrid">
        <article className="metricCard">
          <span>Given</span>
          <strong className="amountExpense">{money(summary.given)}</strong>
        </article>
        <article className="metricCard">
          <span>Taken</span>
          <strong className="amountIncome">{money(summary.taken)}</strong>
        </article>
        <article className="metricCard">
          <span>Net Position</span>
          <strong className={summary.net >= 0 ? 'amountIncome' : 'amountExpense'}>{money(Math.abs(summary.net))}</strong>
        </article>
      </section>

      <DataTable
        rows={items}
        columns={['Person', 'Account', 'Type', 'Date', 'Purpose', 'Amount', 'Action']}
        colSpan={7}
        emptyMessage="No loans found for this filter."
        renderRow={(item) => (
          <tr key={item._id}>
            <td>{refName(item.personId)}</td>
            <td>{refName(item.accountId)}</td>
            <td>
              <span className="badge">{directionLabel(item.direction)}</span>
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
        )}
      />

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
              <option value="LENT">Given</option>
              <option value="BORROWED">Taken</option>
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
