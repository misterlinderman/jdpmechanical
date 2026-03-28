import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

const ROLE_ORDER = ['admin', 'pm', 'fabricator', 'driver', 'installer'] as const;

interface Auth0RoleRow {
  id: string;
  name: string;
  description?: string;
}

interface Auth0UserRow {
  user_id: string;
  email?: string;
  name?: string;
  picture?: string;
  last_login?: string;
}

export default function AdminAuth0Users(): JSX.Element {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [catalog, setCatalog] = useState<Auth0RoleRow[]>([]);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  const [users, setUsers] = useState<Auth0UserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const perPage = 25;
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editRoles, setEditRoles] = useState<string[]>([]);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQuery(query), 400);
    return () => window.clearTimeout(t);
  }, [query]);

  useEffect(() => {
    setPage(0);
  }, [debouncedQuery]);

  const loadStatus = useCallback(async () => {
    try {
      const res = await api.get<{ success: boolean; data: { configured: boolean } }>('/admin/auth0/status');
      setConfigured(res.data.data?.configured ?? false);
    } catch {
      setConfigured(false);
    }
  }, []);

  const loadCatalog = useCallback(async () => {
    setCatalogError(null);
    try {
      const res = await api.get<{ success: boolean; data: Auth0RoleRow[] }>('/admin/auth0/roles');
      setCatalog(res.data.data ?? []);
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'response' in err
        ? String((err as { response?: { data?: { error?: string } } }).response?.data?.error ?? 'Failed to load roles')
        : 'Failed to load roles';
      setCatalogError(msg);
      setCatalog([]);
    }
  }, []);

  const loadUsers = useCallback(async () => {
    if (configured === false) {
      setListLoading(false);
      return;
    }
    setListLoading(true);
    setListError(null);
    try {
      const res = await api.get<{
        success: boolean;
        data: { users: Auth0UserRow[]; total: number; page: number };
      }>('/admin/auth0/users', {
        params: { page, per_page: perPage, q: debouncedQuery || undefined },
      });
      const d = res.data.data;
      setUsers(d?.users ?? []);
      const newTotal = typeof d?.total === 'number' ? d.total : 0;
      setTotal(newTotal);
      const tp = Math.max(1, Math.ceil(newTotal / perPage));
      if (page >= tp) {
        setPage(tp - 1);
      }
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? String((err as { response?: { data?: { error?: string } } }).response?.data?.error ?? 'Failed to load users')
          : 'Failed to load users';
      setListError(msg);
      setUsers([]);
      setTotal(0);
    } finally {
      setListLoading(false);
    }
  }, [configured, page, perPage, debouncedQuery]);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  useEffect(() => {
    if (configured !== true) return;
    void loadCatalog();
  }, [configured, loadCatalog]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const openEditor = async (userId: string) => {
    setExpandedId(userId);
    setSaveError(null);
    setRolesLoading(true);
    setEditRoles([]);
    try {
      const encoded = encodeURIComponent(userId);
      const res = await api.get<{ success: boolean; data: Auth0RoleRow[] }>(
        `/admin/auth0/users/${encoded}/roles`
      );
      const names = (res.data.data ?? []).map((r) => r.name);
      setEditRoles(names);
    } catch {
      setEditRoles([]);
      setSaveError('Could not load roles for this user.');
    } finally {
      setRolesLoading(false);
    }
  };

  const closeEditor = () => {
    setExpandedId(null);
    setEditRoles([]);
    setSaveError(null);
  };

  const toggleRole = (name: string) => {
    setEditRoles((prev) => (prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]));
  };

  const saveRoles = async () => {
    if (!expandedId) return;
    setSaving(true);
    setSaveError(null);
    try {
      const encoded = encodeURIComponent(expandedId);
      await api.put(`/admin/auth0/users/${encoded}/roles`, { roles: editRoles });
      void loadUsers();
      closeEditor();
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? String((err as { response?: { data?: { error?: string } } }).response?.data?.error ?? 'Save failed')
          : 'Save failed';
      setSaveError(msg);
    } finally {
      setSaving(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / perPage));

  const roleLabels = useMemo(() => {
    const map = new Map(catalog.map((r) => [r.name, r.description || r.name]));
    return ROLE_ORDER.map((n) => ({ name: n, label: map.get(n) ?? n }));
  }, [catalog]);

  return (
    <div className="space-y-8 text-[var(--text)]">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Users &amp; roles</h1>
          <p className="text-[var(--muted)] text-sm mt-1">
            Auth0 directory · assign app roles for the alpha demo
          </p>
        </div>
        <Link to="/admin" className="btn-jdp-secondary text-sm">
          Admin overview
        </Link>
      </div>

      {configured === false && (
        <div className="card-jdp border-amber-500/40 bg-amber-500/10">
          <h2 className="font-semibold text-amber-100">Management API not configured</h2>
          <p className="text-sm text-[var(--muted)] mt-2">
            Add a Machine-to-Machine application in Auth0 authorized for the Auth0 Management API, then set{' '}
            <code className="text-xs bg-black/30 px-1 rounded">AUTH0_MANAGEMENT_CLIENT_ID</code> and{' '}
            <code className="text-xs bg-black/30 px-1 rounded">AUTH0_MANAGEMENT_CLIENT_SECRET</code> on the API server
            (see docs/AUTH0_ROLES_SETUP.md).
          </p>
        </div>
      )}

      {catalogError && (
        <div className="card-jdp border-red-500/40 bg-red-500/10 text-sm">
          <p className="font-medium text-red-200">Roles</p>
          <p className="text-[var(--muted)] mt-1">{catalogError}</p>
        </div>
      )}

      {configured === true && (
        <div className="card-jdp">
          <div className="flex flex-wrap gap-4 items-end justify-between mb-4">
            <div className="flex-1 min-w-[200px]">
              <label htmlFor="user-search" className="block text-xs text-[var(--muted)] mb-1">
                Search (Auth0 Lucene query)
              </label>
              <input
                id="user-search"
                className="input-jdp w-full max-w-md text-sm"
                placeholder='e.g. email:"*@client.com"'
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <p className="text-sm text-[var(--muted)]">
              {total} user{total !== 1 ? 's' : ''}
            </p>
          </div>

          {listError && <p className="text-sm text-red-300 mb-4">{listError}</p>}

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[var(--muted)] border-b border-[var(--border)]">
                  <th className="pb-2 pr-4">User</th>
                  <th className="pb-2 pr-4">Email</th>
                  <th className="pb-2 pr-4">Last login</th>
                  <th className="pb-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {listLoading ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-[var(--muted)]">
                      Loading…
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-[var(--muted)]">
                      No users match.
                    </td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <tr key={u.user_id} className="border-b border-[var(--border)] align-top">
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          {u.picture ? (
                            <img src={u.picture} alt="" className="w-8 h-8 rounded-full shrink-0" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-[var(--surface-2)] shrink-0" />
                          )}
                          <span className="font-medium">{u.name || '—'}</span>
                        </div>
                      </td>
                      <td className="py-3 pr-4 font-mono text-xs text-[var(--muted)]">{u.email || '—'}</td>
                      <td className="py-3 pr-4 text-[var(--muted)]">
                        {u.last_login ? new Date(u.last_login).toLocaleString() : '—'}
                      </td>
                      <td className="py-3">
                        <button
                          type="button"
                          className="btn-jdp-secondary text-xs"
                          onClick={() => void openEditor(u.user_id)}
                        >
                          Roles
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {total > perPage && (
            <div className="flex flex-wrap items-center gap-2 mt-4 text-sm">
              <button
                type="button"
                className="btn-jdp-secondary text-xs"
                disabled={page <= 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                Previous
              </button>
              <span className="text-[var(--muted)]">
                Page {page + 1} of {totalPages}
              </span>
              <button
                type="button"
                className="btn-jdp-secondary text-xs"
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}

      {expandedId && (
        <div
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="roles-dialog-title"
          onClick={closeEditor}
        >
          <div
            className="card-jdp w-full max-w-md border border-[var(--border)] shadow-xl"
            onClick={(e) => e.stopPropagation()}
            role="presentation"
          >
            <h2 id="roles-dialog-title" className="text-lg font-semibold">
              App roles
            </h2>
            <p className="text-xs text-[var(--muted)] mt-1 font-mono break-all">{expandedId}</p>

            {rolesLoading ? (
              <p className="text-sm text-[var(--muted)] py-6">Loading roles…</p>
            ) : (
              <ul className="space-y-3 mt-4">
                {roleLabels.map(({ name, label }) => (
                  <li key={name} className="flex items-center gap-3">
                    <input
                      id={`role-${name}`}
                      type="checkbox"
                      checked={editRoles.includes(name)}
                      onChange={() => toggleRole(name)}
                      className="rounded border-[var(--border)]"
                    />
                    <label htmlFor={`role-${name}`} className="text-sm cursor-pointer flex-1">
                      <span className="font-medium capitalize">{name}</span>
                      {label !== name && <span className="text-[var(--muted)] ml-2">{label}</span>}
                    </label>
                  </li>
                ))}
              </ul>
            )}

            {saveError && <p className="text-sm text-red-300 mt-4">{saveError}</p>}

            <div className="flex flex-wrap gap-2 mt-6 justify-end">
              <button type="button" className="btn-jdp-secondary text-sm" onClick={closeEditor} disabled={saving}>
                Cancel
              </button>
              <button
                type="button"
                className="btn-jdp-gold text-sm"
                onClick={() => void saveRoles()}
                disabled={saving || rolesLoading}
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
            <p className="text-xs text-[var(--muted)] mt-4">
              Users may need to log out and back in (or wait for token refresh) for new roles to appear in the app.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
