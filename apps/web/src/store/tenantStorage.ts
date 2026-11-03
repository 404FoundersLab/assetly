import { apiFetch } from '../services/api/client';
import { isApiEnabled } from '../services/api/config';

// Browser-local storage namespaced by tenant + user so data never leaks across orgs or accounts.
const LEGACY_KEYS = [
  'assetly_projects_store_v3',
  'assetly_projects_store_v2',
  'assetly_tasks_store_v3',
  'assetly_tasks_store_v2',
  'assetly_tickets_store_v2',
  'assetly_product_opportunities_v2',
  'assetly_shared_opportunity_assignments',
  'assetly_product_todos_v1',
  'assetly_employee_documents',
  'persist:root',
];

function scope(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem('assetly_auth_state');
    if (!raw) return null;
    const s = JSON.parse(raw);
    const tenantId = s?.tenant?.id ?? s?.user?.tenantId;
    const userId = s?.user?.id;
    if (!s?.isAuthenticated || !tenantId || !userId) return null;
    return `${tenantId}:${userId}`;
  } catch {
    return null;
  }
}

export function purgeLegacyGlobalKeys() {
  if (typeof window === 'undefined') return;
  try {
    LEGACY_KEYS.forEach((k) => localStorage.removeItem(k));
  } catch {
    /* ignore */
  }
}

export function tenantLoad<T>(baseKey: string, fallback: T): T {
  const sc = scope();
  if (!sc) return fallback;
  purgeLegacyGlobalKeys();
  try {
    const raw = localStorage.getItem(`${baseKey}::${sc}`);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export type RemoteKind = 'projects' | 'tasks' | 'todos' | 'employee_docs';

// Last server-confirmed state per kind, so only real changes are pushed. Absent until pulled.
const synced = new Map<RemoteKind, { scope: string; items: Map<string, string> }>();
const queue = new Map<RemoteKind, { upserts: Map<string, unknown>; deletes: Set<string> }>();
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function flush() {
  flushTimer = null;
  for (const [kind, ops] of queue) {
    const upserts = [...ops.upserts].map(([id, data]) => ({ id, data }));
    const deletes = [...ops.deletes];
    if (upserts.length === 0 && deletes.length === 0) continue;
    for (let i = 0; i < Math.max(upserts.length, deletes.length); i += 200) {
      void apiFetch('/api/workspace', {
        method: 'POST',
        body: JSON.stringify({ kind, upserts: upserts.slice(i, i + 200), deletes: deletes.slice(i, i + 200) }),
      }).catch(() => {
        /* kept in local cache; next change will retry only new diffs */
      });
    }
  }
  queue.clear();
}

function pushDiff(kind: RemoteKind, sc: string, value: unknown) {
  const state = synced.get(kind);
  if (!state || state.scope !== sc || !Array.isArray(value)) return;
  const next = new Map<string, string>();
  const ops = queue.get(kind) ?? { upserts: new Map(), deletes: new Set() };
  for (const item of value as { id?: string }[]) {
    if (!item || !item.id) continue;
    const json = JSON.stringify(item);
    next.set(item.id, json);
    if (state.items.get(item.id) !== json) {
      ops.upserts.set(item.id, JSON.parse(json));
      ops.deletes.delete(item.id);
    }
  }
  for (const id of state.items.keys()) {
    if (!next.has(id)) {
      ops.deletes.add(id);
      ops.upserts.delete(id);
    }
  }
  state.items = next;
  queue.set(kind, ops);
  if (!flushTimer) flushTimer = setTimeout(flush, 400);
}

export function tenantSave(baseKey: string, value: unknown, remote?: RemoteKind) {
  const sc = scope();
  if (!sc) return;
  try {
    localStorage.setItem(`${baseKey}::${sc}`, JSON.stringify(value));
  } catch {
    /* ignore quota errors */
  }
  if (remote && isApiEnabled()) pushDiff(remote, sc, value);
}

/** Loads the tenant's shared items from the server and starts syncing local changes for this kind. */
export async function pullRemote<T extends { id?: string }>(kind: RemoteKind): Promise<T[]> {
  const sc = scope();
  if (!sc) return [];
  const res = await apiFetch<{ items: T[] }>(`/api/workspace?kind=${kind}`);
  const items = Array.isArray(res.items) ? res.items : [];
  if (scope() !== sc) return [];
  synced.set(kind, {
    scope: sc,
    items: new Map(items.filter((i) => i && i.id).map((i) => [i.id as string, JSON.stringify(i)])),
  });
  return items;
}

export function resetRemoteSync() {
  synced.clear();
  queue.clear();
}
