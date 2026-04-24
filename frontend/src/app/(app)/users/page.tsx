'use client';

import { Pencil, Plus, Trash2 } from 'lucide-react';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Modal } from '@/components/Modal';
import { getStoredUser, http } from '@/lib/api';
import type { ManagedUser, UserRole } from '@/lib/types';

const roles: UserRole[] = ['ADMIN', 'UPDATER', 'HANDLER', 'SUPER_ADMIN'];

export default function UsersPage() {
  const [items, setItems] = useState<ManagedUser[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ManagedUser | null>(null);
  const [error, setError] = useState('');
  const [canManageSuperUsers, setCanManageSuperUsers] = useState(false);

  const load = useCallback(async () => {
    setItems(await http.get<ManagedUser[]>('/users'));
  }, []);

  useEffect(() => {
    setCanManageSuperUsers(getStoredUser()?.role === 'SUPER_ADMIN');
    load().catch(console.error);
  }, [load]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    const form = new FormData(event.currentTarget);
    const body = {
      name: String(form.get('name')),
      email: String(form.get('email')),
      phone: String(form.get('phone')),
      role: String(form.get('role')),
      isActive: form.get('isActive') === 'on',
      password: String(form.get('password')),
    };

    try {
      if (editing) {
        const updateBody: Record<string, unknown> = {
          name: body.name,
          phone: body.phone,
          role: body.role,
          isActive: body.isActive,
        };
        if (body.password) {
          updateBody.password = body.password;
        }
        await http.patch(`/users/${editing._id}`, updateBody);
      } else {
        await http.post('/users', body);
      }
      setOpen(false);
      setEditing(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    }
  }

  async function remove(id: string) {
    if (!window.confirm('Disable this user?')) {
      return;
    }
    await http.delete(`/users/${id}`);
    await load();
  }

  return (
    <>
      <div className="pageHeader">
        <div>
          <h1>Users</h1>
          <p>Company users and access roles.</p>
        </div>
        <button
          className="button"
          type="button"
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          <Plus size={17} />
          Add User
        </button>
      </div>

      <div className="tableWrap">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Role</th>
              <th>Status</th>
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
                  <span className="badge">{item.role}</span>
                </td>
                <td>{item.isActive ? 'Active' : 'Disabled'}</td>
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
                    <button className="iconButton" type="button" onClick={() => remove(item._id)} aria-label="Disable">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!items.length ? (
              <tr>
                <td colSpan={6} className="muted">
                  No users found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <Modal
        open={open}
        title={editing ? 'Edit User' : 'Add User'}
        onClose={() => setOpen(false)}
        footer={
          <>
            <button className="ghostButton" type="button" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button className="button" type="submit" form="userForm">
              Save
            </button>
          </>
        }
      >
        <form id="userForm" className="formGrid" onSubmit={submit}>
          <div className="field">
            <label>Name</label>
            <input name="name" defaultValue={editing?.name ?? ''} required />
          </div>
          <div className="field">
            <label>Email</label>
            <input name="email" type="email" defaultValue={editing?.email ?? ''} required disabled={Boolean(editing)} />
          </div>
          <div className="field">
            <label>Phone</label>
            <input name="phone" defaultValue={editing?.phone ?? ''} />
          </div>
          <div className="field">
            <label>Role</label>
            <select name="role" defaultValue={editing?.role ?? 'HANDLER'}>
              {roles
                .filter((role) => canManageSuperUsers || role !== 'SUPER_ADMIN')
                .map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
            </select>
          </div>
          <div className="field">
            <label>Password</label>
            <input name="password" type="password" required={!editing} minLength={6} />
          </div>
          <div className="field">
            <label>Status</label>
            <label className="checkboxLine">
              <input name="isActive" type="checkbox" defaultChecked={editing?.isActive ?? true} />
              Active
            </label>
          </div>
          {error ? <p className="errorText full">{error}</p> : null}
        </form>
      </Modal>
    </>
  );
}
