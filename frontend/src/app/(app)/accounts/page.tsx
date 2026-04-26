'use client';

import { ArrowRightLeft, Pencil, Plus, Trash2 } from 'lucide-react';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { DataTable } from '@/components/DataTable';
import { Modal } from '@/components/Modal';
import { http } from '@/lib/api';
import { money, refName, shortDate } from '@/lib/format';
import type { Account, Transfer } from '@/lib/types';

function refId(value: Transfer['fromAccountId'] | Transfer['toAccountId']) {
  return typeof value === 'string' ? value : value._id;
}

function dateInput(value?: string) {
  return value ? new Date(value).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
}

export default function AccountsPage() {
  const [items, setItems] = useState<Account[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [accountOpen, setAccountOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [editingTransfer, setEditingTransfer] = useState<Transfer | null>(null);
  const [accountError, setAccountError] = useState('');
  const [transferError, setTransferError] = useState('');

  const load = useCallback(async () => {
    const [accountRows, transferRows] = await Promise.all([http.get<Account[]>('/accounts'), http.get<Transfer[]>('/transfers')]);
    setItems(accountRows);
    setTransfers(transferRows);
  }, []);

  useEffect(() => {
    load().catch(console.error);
  }, [load]);

  async function submitAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAccountError('');
    const form = new FormData(event.currentTarget);
    const body = {
      name: String(form.get('name')),
      number: String(form.get('number')),
      details: String(form.get('details')),
      initialBalance: Number(form.get('initialBalance') || 0),
    };

    try {
      if (editingAccount) {
        await http.patch(`/accounts/${editingAccount._id}`, {
          name: body.name,
          number: body.number,
          details: body.details,
        });
      } else {
        await http.post('/accounts', body);
      }
      setAccountOpen(false);
      setEditingAccount(null);
      await load();
    } catch (err) {
      setAccountError(err instanceof Error ? err.message : 'Save failed');
    }
  }

  async function submitTransfer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTransferError('');
    const form = new FormData(event.currentTarget);
    const body = {
      fromAccountId: String(form.get('fromAccountId')),
      toAccountId: String(form.get('toAccountId')),
      amount: Number(form.get('amount') || 0),
      fee: Number(form.get('fee') || 0),
      note: String(form.get('note')),
      transferDate: String(form.get('transferDate')),
    };

    try {
      if (editingTransfer) {
        await http.patch(`/transfers/${editingTransfer._id}`, body);
      } else {
        await http.post('/transfers', body);
      }
      setTransferOpen(false);
      setEditingTransfer(null);
      await load();
    } catch (err) {
      setTransferError(err instanceof Error ? err.message : 'Save failed');
    }
  }

  async function removeAccount(id: string) {
    if (!window.confirm('Delete this account?')) {
      return;
    }
    await http.delete(`/accounts/${id}`);
    await load();
  }

  async function removeTransfer(id: string) {
    if (!window.confirm('Delete this transfer?')) {
      return;
    }
    await http.delete(`/transfers/${id}`);
    await load();
  }

  return (
    <>
      <div className="pageTools">
        <div className="actions">
          <button
            className="ghostButton"
            type="button"
            disabled={items.length < 2}
            onClick={() => {
              setEditingTransfer(null);
              setTransferOpen(true);
            }}
          >
            <ArrowRightLeft size={17} />
            Transfer Money
          </button>
          <button
            className="button"
            type="button"
            onClick={() => {
              setEditingAccount(null);
              setAccountOpen(true);
            }}
          >
            <Plus size={17} />
            Add Account
          </button>
        </div>
      </div>

      <section className="sectionBlock">
        <div className="sectionBlockHead">
          <h2>Accounts</h2>
          <span>{items.length} active accounts</span>
        </div>
        <DataTable
          rows={items}
          columns={['Name', 'Number', 'Details', 'Initial Deposit', 'Current Balance', 'Action']}
          colSpan={6}
          emptyMessage="No accounts found."
          renderRow={(item) => (
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
                      setEditingAccount(item);
                      setAccountOpen(true);
                    }}
                    aria-label="Edit"
                  >
                    <Pencil size={16} />
                  </button>
                  <button className="iconButton" type="button" onClick={() => removeAccount(item._id)} aria-label="Delete">
                    <Trash2 size={16} />
                  </button>
                </div>
              </td>
            </tr>
          )}
        />
      </section>

      <section className="sectionBlock">
        <div className="sectionBlockHead">
          <h2>Transfer History</h2>
          <span>{items.length < 2 ? 'Add at least two accounts to start transferring.' : 'Move money between accounts and keep track of fees.'}</span>
        </div>
        <DataTable
          rows={transfers}
          columns={['From', 'To', 'Date', 'Note', 'Amount', 'Fee', 'Total Deducted', 'Action']}
          colSpan={8}
          emptyMessage="No transfers found."
          renderRow={(item) => (
            <tr key={item._id}>
              <td>{refName(item.fromAccountId)}</td>
              <td>{refName(item.toAccountId)}</td>
              <td>{shortDate(item.transferDate)}</td>
              <td>{item.note}</td>
              <td>{money(item.amount)}</td>
              <td className="amountExpense">{money(item.fee)}</td>
              <td className="amountExpense">{money(item.amount + item.fee)}</td>
              <td>
                <div className="actions">
                  <button
                    className="iconButton"
                    type="button"
                    onClick={() => {
                      setEditingTransfer(item);
                      setTransferOpen(true);
                    }}
                    aria-label="Edit"
                  >
                    <Pencil size={16} />
                  </button>
                  <button className="iconButton" type="button" onClick={() => removeTransfer(item._id)} aria-label="Delete">
                    <Trash2 size={16} />
                  </button>
                </div>
              </td>
            </tr>
          )}
        />
      </section>

      <Modal
        open={accountOpen}
        title={editingAccount ? 'Edit Account' : 'Add Account'}
        onClose={() => setAccountOpen(false)}
        footer={
          <>
            <button className="ghostButton" type="button" onClick={() => setAccountOpen(false)}>
              Cancel
            </button>
            <button className="button" type="submit" form="accountForm">
              Save
            </button>
          </>
        }
      >
        <form id="accountForm" className="formGrid" onSubmit={submitAccount}>
          <div className="field">
            <label>Name</label>
            <input name="name" defaultValue={editingAccount?.name ?? ''} required />
          </div>
          <div className="field">
            <label>Number</label>
            <input name="number" defaultValue={editingAccount?.number ?? ''} />
          </div>
          <div className="field full">
            <label>Details</label>
            <textarea name="details" defaultValue={editingAccount?.details ?? ''} />
          </div>
          {!editingAccount ? (
            <div className="field">
              <label>Initial Deposit</label>
              <input name="initialBalance" type="number" min="0" step="0.01" defaultValue="0" />
            </div>
          ) : null}
          {accountError ? <p className="errorText full">{accountError}</p> : null}
        </form>
      </Modal>

      <Modal
        open={transferOpen}
        title={editingTransfer ? 'Edit Transfer' : 'Transfer Money'}
        onClose={() => setTransferOpen(false)}
        footer={
          <>
            <button className="ghostButton" type="button" onClick={() => setTransferOpen(false)}>
              Cancel
            </button>
            <button className="button" type="submit" form="transferForm">
              Save
            </button>
          </>
        }
      >
        <form id="transferForm" className="formGrid" onSubmit={submitTransfer}>
          <div className="field">
            <label>From Account</label>
            <select name="fromAccountId" defaultValue={editingTransfer ? refId(editingTransfer.fromAccountId) : ''} required>
              <option value="" disabled>
                Select source
              </option>
              {items.map((account) => (
                <option key={account._id} value={account._id}>
                  {account.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>To Account</label>
            <select name="toAccountId" defaultValue={editingTransfer ? refId(editingTransfer.toAccountId) : ''} required>
              <option value="" disabled>
                Select destination
              </option>
              {items.map((account) => (
                <option key={account._id} value={account._id}>
                  {account.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Date</label>
            <input name="transferDate" type="date" defaultValue={dateInput(editingTransfer?.transferDate)} required />
          </div>
          <div className="field">
            <label>Amount</label>
            <input name="amount" type="number" min="0" step="0.01" defaultValue={editingTransfer?.amount ?? ''} required />
          </div>
          <div className="field">
            <label>Transfer Fee</label>
            <input name="fee" type="number" min="0" step="0.01" defaultValue={editingTransfer?.fee ?? 0} />
          </div>
          <div className="field full">
            <label>Note</label>
            <textarea name="note" defaultValue={editingTransfer?.note ?? ''} required />
          </div>
          {transferError ? <p className="errorText full">{transferError}</p> : null}
        </form>
      </Modal>
    </>
  );
}
