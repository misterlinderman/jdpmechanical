import { createError } from '../middleware/errorHandler';

/** Role names the app recognizes (must match Auth0 User Management → Roles). */
export const MANAGED_AUTH0_ROLE_NAMES = [
  'admin',
  'pm',
  'fabricator',
  'driver',
  'installer',
] as const;

export type ManagedAuth0RoleName = (typeof MANAGED_AUTH0_ROLE_NAMES)[number];

export interface Auth0RoleRow {
  id: string;
  name: string;
  description?: string;
}

export interface Auth0UserListItem {
  user_id: string;
  email?: string;
  name?: string;
  picture?: string;
  last_login?: string;
}

interface MgtConfig {
  domain: string;
  clientId: string;
  clientSecret: string;
}

let tokenCache: { token: string; expiresAtMs: number } | null = null;
let managedRolesCache: { roles: Auth0RoleRow[]; expiresAtMs: number } | null = null;
const MANAGED_ROLES_CACHE_MS = 60_000;

function normalizeDomain(raw: string | undefined): string | null {
  if (!raw) return null;
  return raw.replace(/^https?:\/\//, '').replace(/\/$/, '');
}

export function getAuth0ManagementConfig(): MgtConfig | null {
  const domain = normalizeDomain(process.env.AUTH0_DOMAIN);
  const clientId = process.env.AUTH0_MANAGEMENT_CLIENT_ID?.trim();
  const clientSecret = process.env.AUTH0_MANAGEMENT_CLIENT_SECRET?.trim();
  if (!domain || !clientId || !clientSecret) return null;
  return { domain, clientId, clientSecret };
}

export function isAuth0ManagementConfigured(): boolean {
  return getAuth0ManagementConfig() !== null;
}

function requireConfig(): MgtConfig {
  const cfg = getAuth0ManagementConfig();
  if (!cfg) {
    throw createError(
      'Auth0 Management API is not configured (set AUTH0_MANAGEMENT_CLIENT_ID and AUTH0_MANAGEMENT_CLIENT_SECRET for an M2M app authorized for the Auth0 Management API).',
      503
    );
  }
  return cfg;
}

async function getManagementAccessToken(cfg: MgtConfig): Promise<string> {
  const now = Date.now();
  if (tokenCache && now < tokenCache.expiresAtMs - 60_000) {
    return tokenCache.token;
  }

  const res = await fetch(`https://${cfg.domain}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
      audience: `https://${cfg.domain}/api/v2/`,
      grant_type: 'client_credentials',
    }),
  });

  const body = (await res.json()) as { access_token?: string; expires_in?: number; error_description?: string };

  if (!res.ok || !body.access_token) {
    const msg = body.error_description || `Auth0 token request failed (${res.status})`;
    throw createError(msg, 502);
  }

  const expiresIn = typeof body.expires_in === 'number' ? body.expires_in : 86400;
  tokenCache = {
    token: body.access_token,
    expiresAtMs: now + expiresIn * 1000,
  };
  return body.access_token;
}

async function mgtFetch<T>(
  cfg: MgtConfig,
  pathWithQuery: string,
  init?: { method?: string; body?: unknown }
): Promise<T> {
  const token = await getManagementAccessToken(cfg);
  const url = `https://${cfg.domain}${pathWithQuery}`;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  };
  const method = init?.method ?? 'GET';
  let body: string | undefined;
  if (init?.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(init.body);
  }

  const res = await fetch(url, { method, headers, body });

  if (res.status === 204) {
    return undefined as T;
  }

  const text = await res.text();
  let parsed: unknown;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    throw createError(`Auth0 Management API invalid JSON (${res.status})`, 502);
  }

  if (!res.ok) {
    const msg =
      typeof parsed === 'object' && parsed !== null && 'message' in parsed
        ? String((parsed as { message: string }).message)
        : text || `Auth0 Management API error (${res.status})`;
    throw createError(msg, res.status >= 400 && res.status < 600 ? res.status : 502);
  }

  return parsed as T;
}

/** All Auth0 roles whose names are in MANAGED_AUTH0_ROLE_NAMES (paginated fetch). */
export async function listManagedRoles(): Promise<Auth0RoleRow[]> {
  const now = Date.now();
  if (managedRolesCache && now < managedRolesCache.expiresAtMs) {
    return managedRolesCache.roles;
  }

  const cfg = requireConfig();
  const managed = new Set<string>(MANAGED_AUTH0_ROLE_NAMES);
  const out: Auth0RoleRow[] = [];
  let page = 0;
  const perPage = 100;

  for (;;) {
    const chunk = await mgtFetch<Auth0RoleRow[]>(
      cfg,
      `/api/v2/roles?page=${page}&per_page=${perPage}`
    );
    for (const r of chunk) {
      if (r?.name && managed.has(r.name)) {
        out.push({ id: r.id, name: r.name, description: r.description });
      }
    }
    if (chunk.length < perPage) break;
    page += 1;
  }

  const byName = new Map(out.map((r) => [r.name, r]));
  const missing = MANAGED_AUTH0_ROLE_NAMES.filter((n) => !byName.has(n));
  if (missing.length > 0) {
    throw createError(
      `These Auth0 roles are missing (create them under User Management → Roles): ${missing.join(', ')}`,
      500
    );
  }

  const ordered = MANAGED_AUTH0_ROLE_NAMES.map((n) => byName.get(n) as Auth0RoleRow);
  managedRolesCache = { roles: ordered, expiresAtMs: now + MANAGED_ROLES_CACHE_MS };
  return ordered;
}

export async function listUsers(params: {
  page: number;
  perPage: number;
  query?: string;
}): Promise<{ users: Auth0UserListItem[]; total: number }> {
  const cfg = requireConfig();
  const page = Math.max(0, params.page);
  const perPage = Math.min(100, Math.max(1, params.perPage));
  const q = params.query?.trim();
  const qParam = q ? `&q=${encodeURIComponent(q)}` : '';
  const data = await mgtFetch<Auth0UserListItem[] | { users?: Auth0UserListItem[]; total?: number }>(
    cfg,
    `/api/v2/users?include_totals=true&page=${page}&per_page=${perPage}${qParam}`
  );
  if (Array.isArray(data)) {
    return { users: data, total: data.length };
  }
  const users = data.users ?? [];
  return {
    users,
    total: typeof data.total === 'number' ? data.total : users.length,
  };
}

export async function getUserManagedRoles(userId: string): Promise<Auth0RoleRow[]> {
  const cfg = requireConfig();
  const encoded = encodeURIComponent(userId);
  const roles = await mgtFetch<Auth0RoleRow[]>(cfg, `/api/v2/users/${encoded}/roles`);
  const managed = new Set<string>(MANAGED_AUTH0_ROLE_NAMES);
  return (roles ?? []).filter((r) => r?.name && managed.has(r.name));
}

/**
 * Sets which managed roles the user has. Only touches roles in MANAGED_AUTH0_ROLE_NAMES;
 * other Auth0 roles on the user are left unchanged.
 */
export async function setUserManagedRoles(userId: string, roleNames: string[]): Promise<void> {
  const cfg = requireConfig();
  const allowed = new Set<string>(MANAGED_AUTH0_ROLE_NAMES);
  for (const n of roleNames) {
    if (!allowed.has(n)) {
      throw createError(`Invalid role name: ${n}`, 400);
    }
  }

  const catalog = await listManagedRoles();
  const nameToId = new Map(catalog.map((r) => [r.name, r.id]));

  const desiredIds = new Set(roleNames.map((n) => nameToId.get(n) as string));

  const encoded = encodeURIComponent(userId);
  const current = await getUserManagedRoles(userId);
  const currentIds = new Set(current.map((r) => r.id));

  const toAssign = [...desiredIds].filter((id) => !currentIds.has(id));
  const toRemove = [...currentIds].filter((id) => !desiredIds.has(id));

  if (toRemove.length > 0) {
    await mgtFetch(cfg, `/api/v2/users/${encoded}/roles`, {
      method: 'DELETE',
      body: { roles: toRemove },
    });
  }
  if (toAssign.length > 0) {
    await mgtFetch(cfg, `/api/v2/users/${encoded}/roles`, {
      method: 'POST',
      body: { roles: toAssign },
    });
  }
}
