'use client';

import type { AuthUser } from './types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';
const CACHE_KEY = 'expense_cache_v2';
const QUEUE_KEY = 'expense_queue_v2';
const DEVICE_KEY = 'expense_device_id';
const LAST_SYNC_KEY = 'expense_last_sync_at';
const OFFLINE_SYNC_INTERVAL_MS = 15000;

const OFFLINE_CREATE_ROUTES = new Set(['/accounts', '/categories', '/expenses', '/incomes', '/loan/accounts', '/loan/loads', '/transfers']);
const OFFLINE_MUTATION_BASES = new Set(['/accounts', '/categories', '/expenses', '/incomes', '/loan/accounts', '/loan/loads', '/transfers']);

export const DATA_SYNC_EVENT = 'expense:data-sync';
export const SYNC_STATUS_EVENT = 'expense:sync-status';

export type SyncStatus = {
  phase: 'idle' | 'offline' | 'pending' | 'syncing' | 'synced';
  pendingCount: number;
  lastSyncedAt: string | null;
  message: string;
};

type RequestOptions = Omit<RequestInit, 'body'> & {
  body?: BodyInit | Record<string, unknown> | null;
};

type CacheStore = Record<
  string,
  {
    data: unknown;
    updatedAt: number;
  }
>;

type QueueMethod = 'POST' | 'PATCH' | 'DELETE';

type QueueItem = {
  id: string;
  method: QueueMethod;
  path: string;
  body?: Record<string, unknown>;
  tempId?: string;
  createdAt: number;
};

type MutableRecord = Record<string, unknown>;

let syncInitialized = false;
let flushPromise: Promise<void> | null = null;
let syncStatusCache: SyncStatus | null = null;

function isBrowser() {
  return typeof window !== 'undefined';
}

function getBasePath(path: string) {
  return path.split('?')[0] ?? path;
}

function getQueryParams(path: string) {
  const query = path.split('?')[1];
  return new URLSearchParams(query ?? '');
}

function readStore<T>(key: string, fallback: T): T {
  if (!isBrowser()) {
    return fallback;
  }

  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeStore<T>(key: string, value: T) {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(value));
}

function dispatchSyncEvent() {
  if (!isBrowser()) {
    return;
  }

  window.dispatchEvent(new Event(DATA_SYNC_EVENT));
}

function readLastSyncedAt() {
  if (!isBrowser()) {
    return null;
  }

  return window.localStorage.getItem(LAST_SYNC_KEY);
}

function pluralizeChanges(count: number) {
  return `${count} change${count === 1 ? '' : 's'}`;
}

function defaultSyncMessage(phase: SyncStatus['phase'], pendingCount: number, lastSyncedAt: string | null) {
  if (phase === 'offline') {
    return pendingCount ? `${pluralizeChanges(pendingCount)} waiting for connection` : 'Offline';
  }

  if (phase === 'pending') {
    return `${pluralizeChanges(pendingCount)} pending sync`;
  }

  if (phase === 'syncing') {
    return pendingCount ? `Syncing ${pluralizeChanges(pendingCount)}` : 'Syncing changes';
  }

  if (phase === 'synced' && lastSyncedAt) {
    return `Synced at ${new Date(lastSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }

  return 'Ready';
}

function buildSyncStatus(partial: Partial<SyncStatus> = {}): SyncStatus {
  const pendingCount = partial.pendingCount ?? getQueue().length;
  const lastSyncedAt =
    partial.lastSyncedAt !== undefined ? partial.lastSyncedAt : (syncStatusCache?.lastSyncedAt ?? readLastSyncedAt());
  const phase =
    partial.phase ??
    (!navigator.onLine ? 'offline' : pendingCount > 0 ? 'pending' : lastSyncedAt ? 'synced' : 'idle');
  const message = partial.message ?? defaultSyncMessage(phase, pendingCount, lastSyncedAt);

  return {
    phase,
    pendingCount,
    lastSyncedAt,
    message,
  };
}

function dispatchSyncStatus(partial: Partial<SyncStatus> = {}) {
  if (!isBrowser()) {
    return;
  }

  const next = buildSyncStatus(partial);
  syncStatusCache = next;

  if (next.lastSyncedAt) {
    window.localStorage.setItem(LAST_SYNC_KEY, next.lastSyncedAt);
  }

  window.dispatchEvent(new CustomEvent<SyncStatus>(SYNC_STATUS_EVENT, { detail: next }));
}

export function getSyncStatusSnapshot(): SyncStatus {
  if (!isBrowser()) {
    return {
      phase: 'idle',
      pendingCount: 0,
      lastSyncedAt: null,
      message: 'Ready',
    };
  }

  if (!syncStatusCache) {
    syncStatusCache = buildSyncStatus();
  }

  return syncStatusCache;
}

function getCacheStore() {
  return readStore<CacheStore>(CACHE_KEY, {});
}

function setCacheStore(store: CacheStore) {
  writeStore(CACHE_KEY, store);
}

function getCached(path: string) {
  return getCacheStore()[path]?.data;
}

function setCached(path: string, data: unknown) {
  const store = getCacheStore();
  store[path] = { data, updatedAt: Date.now() };
  setCacheStore(store);
}

function updateCache(mutator: (store: CacheStore) => void) {
  const store = getCacheStore();
  mutator(store);
  setCacheStore(store);
}

function deleteCachedByBasePath(paths: string[]) {
  updateCache((store) => {
    for (const key of Object.keys(store)) {
      if (paths.some((path) => getBasePath(key) === path)) {
        delete store[key];
      }
    }
  });
}

function getQueue() {
  return readStore<QueueItem[]>(QUEUE_KEY, []);
}

function setQueue(items: QueueItem[]) {
  writeStore(QUEUE_KEY, items);
  dispatchSyncStatus();
}

function updateQueue(mutator: (items: QueueItem[]) => QueueItem[]) {
  const next = mutator(getQueue());
  setQueue(next);
}

function removeQueueItem(id: string) {
  updateQueue((items) => items.filter((item) => item.id !== id));
}

function queueQueuedMutation(item: QueueItem) {
  updateQueue((items) => {
    if (item.method === 'PATCH') {
      const existing = items.find((entry) => entry.method === 'PATCH' && entry.path === item.path);
      if (existing) {
        return items.map((entry) =>
          entry.id === existing.id
            ? {
                ...entry,
                body: { ...(entry.body ?? {}), ...(item.body ?? {}) },
              }
            : entry,
        );
      }
    }

    if (item.method === 'DELETE') {
      const filtered = items.filter((entry) => !(entry.path === item.path && entry.method === 'PATCH'));
      const alreadyQueued = filtered.some((entry) => entry.path === item.path && entry.method === 'DELETE');
      return alreadyQueued ? filtered : [...filtered, item];
    }

    return [...items, item];
  });
}

function getDeviceId() {
  if (!isBrowser()) {
    return 'server';
  }

  const existing = window.localStorage.getItem(DEVICE_KEY);
  if (existing) {
    return existing;
  }

  const next = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `device-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  window.localStorage.setItem(DEVICE_KEY, next);
  return next;
}

function buildClientRequestId() {
  return `${getDeviceId()}:${Date.now()}:${Math.random().toString(36).slice(2, 10)}`;
}

function buildTempId() {
  return `temp-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function nowIso() {
  return new Date().toISOString();
}

function getMutationBasePath(path: string) {
  const basePath = getBasePath(path);
  if (OFFLINE_MUTATION_BASES.has(basePath)) {
    return basePath;
  }

  const trimmed = basePath.replace(/\/[^/]+$/, '');
  return OFFLINE_MUTATION_BASES.has(trimmed) ? trimmed : null;
}

function getMutationItemId(path: string) {
  const basePath = getBasePath(path);
  const segments = basePath.split('/').filter(Boolean);
  const mutationBasePath = getMutationBasePath(path);
  if (!mutationBasePath || getBasePath(path) === mutationBasePath) {
    return null;
  }
  return segments.at(-1) ?? null;
}

function isMutableMethod(method: string) {
  return method === 'POST' || method === 'PATCH' || method === 'DELETE';
}

function shouldQueueOfflineMutation(path: string, options: RequestOptions) {
  const method = (options.method ?? 'GET').toUpperCase();
  const mutationBasePath = getMutationBasePath(path);
  return isMutableMethod(method) && !!mutationBasePath && !path.startsWith('/auth/');
}

function shouldQueueOfflineCreate(path: string, options: RequestOptions) {
  return (options.method ?? 'GET').toUpperCase() === 'POST' && OFFLINE_CREATE_ROUTES.has(getBasePath(path)) && !path.startsWith('/auth/');
}

function getRowId(value: unknown) {
  if (!value || typeof value !== 'object' || !('_id' in value)) {
    return null;
  }
  return String((value as { _id: string })._id);
}

function getRefId(value: unknown) {
  if (typeof value === 'string') {
    return value;
  }
  return getRowId(value);
}

function getRecordValue(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback;
}

function getRecordNumber(value: unknown, fallback = 0) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
}

function mutateListCaches(basePath: string, mutator: (rows: MutableRecord[], cachePath: string) => MutableRecord[]) {
  updateCache((store) => {
    for (const key of Object.keys(store)) {
      if (getBasePath(key) !== basePath) {
        continue;
      }

      const current = store[key]?.data;
      if (!Array.isArray(current)) {
        continue;
      }

      store[key] = {
        ...store[key],
        data: mutator(
          current.filter((item): item is MutableRecord => !!item && typeof item === 'object').map((item) => ({ ...item })),
          key,
        ),
      };
    }
  });
}

function listCacheKeys(basePath: string) {
  return Object.keys(getCacheStore()).filter((key) => getBasePath(key) === basePath);
}

function matchDateQuery(path: string, value: string) {
  const params = getQueryParams(path);
  const from = params.get('from');
  const to = params.get('to');
  const current = value.slice(0, 10);
  if (from && current < from) {
    return false;
  }
  if (to && current > to) {
    return false;
  }
  return true;
}

function findCachedRef(basePath: string, id: string) {
  for (const key of listCacheKeys(basePath)) {
    const current = getCached(key);
    if (!Array.isArray(current)) {
      continue;
    }
    const found = current.find((item) => item && typeof item === 'object' && '_id' in item && String((item as { _id: string })._id) === id) as
      | MutableRecord
      | undefined;
    if (found) {
      return found;
    }
  }
  return null;
}

function resolveRef(basePath: string, id: string) {
  const row = findCachedRef(basePath, id);
  if (!row) {
    return id;
  }

  return {
    _id: id,
    name: String(row.name ?? ''),
    number: typeof row.number === 'string' ? row.number : undefined,
    phone: typeof row.phone === 'string' ? row.phone : undefined,
    type: typeof row.type === 'string' ? row.type : undefined,
  };
}

function getExpectedUpdatedAt(basePath: string, id: string) {
  const row = findCachedRef(basePath, id);
  return typeof row?.updatedAt === 'string' ? row.updatedAt : undefined;
}

function appendQueryParam(path: string, key: string, value: string) {
  const params = getQueryParams(path);
  params.set(key, value);
  const query = params.toString();
  return `${getBasePath(path)}${query ? `?${query}` : ''}`;
}

function replaceRowAcrossCaches(
  basePath: string,
  id: string,
  builder: (row: MutableRecord, cachePath: string) => MutableRecord,
  shouldKeep: (cachePath: string, row: MutableRecord) => boolean = () => true,
) {
  mutateListCaches(basePath, (rows, cachePath) =>
    rows.flatMap((row) => {
      if (getRowId(row) !== id) {
        return [row];
      }
      const nextRow = builder(row, cachePath);
      return shouldKeep(cachePath, nextRow) ? [nextRow] : [];
    }),
  );
}

function removeRowAcrossCaches(basePath: string, id: string) {
  mutateListCaches(basePath, (rows) => rows.filter((row) => getRowId(row) !== id));
}

function appendToMatchingCaches(basePath: string, record: MutableRecord, matches?: (path: string) => boolean) {
  updateCache((store) => {
    for (const key of Object.keys(store)) {
      if (getBasePath(key) !== basePath) {
        continue;
      }
      if (matches && !matches(key)) {
        continue;
      }
      const current = store[key]?.data;
      if (!Array.isArray(current)) {
        continue;
      }
      store[key] = {
        ...store[key],
        data: [record, ...current],
      };
    }
  });
}

function updateAccountBalanceCache(accountId: string, delta: number) {
  mutateListCaches('/accounts', (rows) =>
    rows.map((row) => {
      if (getRowId(row) !== accountId) {
        return row;
      }

      return {
        ...row,
        currentBalance: getRecordNumber(row.currentBalance) + delta,
      };
    }),
  );
}

function clearDerivedCaches() {
  deleteCachedByBasePath(['/dashboard/summary', '/reports/statement']);
}

function applyLocalMetadata(record: MutableRecord, timestamp: string, id?: string) {
  return {
    ...(id ? { _id: id } : {}),
    ...record,
    createdAt: typeof record.createdAt === 'string' ? record.createdAt : timestamp,
    updatedAt: timestamp,
  };
}

function matchesRowForCache(basePath: string, cachePath: string, row: MutableRecord) {
  if (basePath === '/categories') {
    const type = getQueryParams(cachePath).get('type');
    return !type || type === String(row.type ?? '');
  }

  if (basePath === '/expenses' || basePath === '/incomes') {
    return matchDateQuery(cachePath, String(row.transactionDate ?? ''));
  }

  if (basePath === '/loan/loads') {
    const params = getQueryParams(cachePath);
    const personId = params.get('personId');
    const direction = params.get('direction');
    return (
      matchDateQuery(cachePath, String(row.loanDate ?? '')) &&
      (!personId || personId === getRefId(row.personId)) &&
      (!direction || direction === String(row.direction ?? ''))
    );
  }

  if (basePath === '/transfers') {
    return matchDateQuery(cachePath, String(row.transferDate ?? ''));
  }

  return true;
}

function optimisticCreate(path: string, body: MutableRecord, tempId: string, timestamp: string) {
  const basePath = getBasePath(path);

  if (basePath === '/accounts') {
    const initialBalance = getRecordNumber(body.initialBalance);
    appendToMatchingCaches(
      '/accounts',
      applyLocalMetadata(
        {
          name: body.name,
          number: body.number ?? '',
          details: body.details ?? '',
          initialBalance,
          currentBalance: initialBalance,
        },
        timestamp,
        tempId,
      ),
    );
    clearDerivedCaches();
    return;
  }

  if (basePath === '/categories') {
    appendToMatchingCaches(
      '/categories',
      applyLocalMetadata(
        {
          name: body.name,
          type: body.type,
        },
        timestamp,
        tempId,
      ),
      (cachePath) => {
        const type = getQueryParams(cachePath).get('type');
        return !type || type === body.type;
      },
    );
    return;
  }

  if (basePath === '/expenses' || basePath === '/incomes') {
    const type = basePath === '/expenses' ? 'EXPENSE' : 'INCOME';
    const amount = getRecordNumber(body.amount);
    const transactionDate = getRecordValue(body.transactionDate, timestamp);
    appendToMatchingCaches(
      basePath,
      applyLocalMetadata(
        {
          description: body.description,
          categoryId: resolveRef('/categories', String(body.categoryId)),
          accountId: resolveRef('/accounts', String(body.accountId)),
          amount,
          transactionDate,
          type,
        },
        timestamp,
        tempId,
      ),
      (cachePath) => matchDateQuery(cachePath, transactionDate),
    );
    updateAccountBalanceCache(String(body.accountId), type === 'INCOME' ? amount : -amount);
    clearDerivedCaches();
    return;
  }

  if (basePath === '/loan/accounts') {
    appendToMatchingCaches(
      '/loan/accounts',
      applyLocalMetadata(
        {
          name: body.name,
          phone: body.phone ?? '',
          address: body.address ?? '',
          details: body.details ?? '',
        },
        timestamp,
        tempId,
      ),
    );
    return;
  }

  if (basePath === '/loan/loads') {
    const amount = getRecordNumber(body.amount);
    const loanDate = getRecordValue(body.loanDate, timestamp);
    const direction = getRecordValue(body.direction, 'LENT');
    appendToMatchingCaches(
      '/loan/loads',
      applyLocalMetadata(
        {
          personId: resolveRef('/loan/accounts', String(body.personId)),
          accountId: resolveRef('/accounts', String(body.accountId)),
          direction,
          amount,
          purpose: body.purpose,
          loanDate,
        },
        timestamp,
        tempId,
      ),
      (cachePath) => {
        const params = getQueryParams(cachePath);
        const personId = params.get('personId');
        const filterDirection = params.get('direction');
        return matchDateQuery(cachePath, loanDate) && (!personId || personId === String(body.personId)) && (!filterDirection || filterDirection === direction);
      },
    );
    updateAccountBalanceCache(String(body.accountId), direction === 'BORROWED' ? amount : -amount);
    clearDerivedCaches();
    return;
  }

  if (basePath === '/transfers') {
    const amount = getRecordNumber(body.amount);
    const fee = getRecordNumber(body.fee);
    const transferDate = getRecordValue(body.transferDate, timestamp);
    appendToMatchingCaches(
      '/transfers',
      applyLocalMetadata(
        {
          fromAccountId: resolveRef('/accounts', String(body.fromAccountId)),
          toAccountId: resolveRef('/accounts', String(body.toAccountId)),
          amount,
          fee,
          note: body.note,
          transferDate,
        },
        timestamp,
        tempId,
      ),
      (cachePath) => matchDateQuery(cachePath, transferDate),
    );
    updateAccountBalanceCache(String(body.fromAccountId), -(amount + fee));
    updateAccountBalanceCache(String(body.toAccountId), amount);
    clearDerivedCaches();
  }
}

function optimisticUpdate(path: string, body: MutableRecord, timestamp: string) {
  const basePath = getMutationBasePath(path);
  const itemId = getMutationItemId(path);
  if (!basePath || !itemId) {
    return;
  }

  const current = findCachedRef(basePath, itemId);
  if (!current) {
    return;
  }

  if (basePath === '/accounts') {
    replaceRowAcrossCaches(basePath, itemId, (row) =>
      applyLocalMetadata(
        {
          ...row,
          name: body.name ?? row.name,
          number: body.number ?? row.number,
          details: body.details ?? row.details,
        },
        timestamp,
        itemId,
      ),
    );
    return;
  }

  if (basePath === '/categories') {
    replaceRowAcrossCaches(
      basePath,
      itemId,
      (row) =>
        applyLocalMetadata(
          {
            ...row,
            name: body.name ?? row.name,
          },
          timestamp,
          itemId,
        ),
      matchesRowForCache.bind(null, basePath),
    );
    return;
  }

  if (basePath === '/expenses' || basePath === '/incomes') {
    const oldAccountId = getRefId(current.accountId);
    const nextAccountId = String(body.accountId ?? oldAccountId ?? '');
    const oldAmount = getRecordNumber(current.amount);
    const nextAmount = body.amount === undefined ? oldAmount : getRecordNumber(body.amount);
    const type = basePath === '/incomes' ? 'INCOME' : 'EXPENSE';

    if (oldAccountId) {
      updateAccountBalanceCache(oldAccountId, type === 'INCOME' ? -oldAmount : oldAmount);
    }
    if (nextAccountId) {
      updateAccountBalanceCache(nextAccountId, type === 'INCOME' ? nextAmount : -nextAmount);
    }

    replaceRowAcrossCaches(
      basePath,
      itemId,
      (row) =>
        applyLocalMetadata(
          {
            ...row,
            description: body.description ?? row.description,
            categoryId: body.categoryId ? resolveRef('/categories', String(body.categoryId)) : row.categoryId,
            accountId: nextAccountId ? resolveRef('/accounts', nextAccountId) : row.accountId,
            amount: nextAmount,
            transactionDate: body.transactionDate ?? row.transactionDate,
          },
          timestamp,
          itemId,
        ),
      matchesRowForCache.bind(null, basePath),
    );
    clearDerivedCaches();
    return;
  }

  if (basePath === '/loan/accounts') {
    replaceRowAcrossCaches(basePath, itemId, (row) =>
      applyLocalMetadata(
        {
          ...row,
          name: body.name ?? row.name,
          phone: body.phone ?? row.phone,
          address: body.address ?? row.address,
          details: body.details ?? row.details,
        },
        timestamp,
        itemId,
      ),
    );
    return;
  }

  if (basePath === '/loan/loads') {
    const oldAccountId = getRefId(current.accountId);
    const nextAccountId = String(body.accountId ?? oldAccountId ?? '');
    const oldAmount = getRecordNumber(current.amount);
    const nextAmount = body.amount === undefined ? oldAmount : getRecordNumber(body.amount);
    const oldDirection = getRecordValue(current.direction, 'LENT');
    const nextDirection = getRecordValue(body.direction, oldDirection);

    if (oldAccountId) {
      updateAccountBalanceCache(oldAccountId, oldDirection === 'BORROWED' ? -oldAmount : oldAmount);
    }
    if (nextAccountId) {
      updateAccountBalanceCache(nextAccountId, nextDirection === 'BORROWED' ? nextAmount : -nextAmount);
    }

    replaceRowAcrossCaches(
      basePath,
      itemId,
      (row) =>
        applyLocalMetadata(
          {
            ...row,
            personId: body.personId ? resolveRef('/loan/accounts', String(body.personId)) : row.personId,
            accountId: nextAccountId ? resolveRef('/accounts', nextAccountId) : row.accountId,
            direction: nextDirection,
            amount: nextAmount,
            purpose: body.purpose ?? row.purpose,
            loanDate: body.loanDate ?? row.loanDate,
          },
          timestamp,
          itemId,
        ),
      matchesRowForCache.bind(null, basePath),
    );
    clearDerivedCaches();
    return;
  }

  if (basePath === '/transfers') {
    const oldFromAccountId = getRefId(current.fromAccountId);
    const oldToAccountId = getRefId(current.toAccountId);
    const nextFromAccountId = String(body.fromAccountId ?? oldFromAccountId ?? '');
    const nextToAccountId = String(body.toAccountId ?? oldToAccountId ?? '');
    const oldAmount = getRecordNumber(current.amount);
    const nextAmount = body.amount === undefined ? oldAmount : getRecordNumber(body.amount);
    const oldFee = getRecordNumber(current.fee);
    const nextFee = body.fee === undefined ? oldFee : getRecordNumber(body.fee);

    if (oldFromAccountId) {
      updateAccountBalanceCache(oldFromAccountId, oldAmount + oldFee);
    }
    if (oldToAccountId) {
      updateAccountBalanceCache(oldToAccountId, -oldAmount);
    }
    if (nextFromAccountId) {
      updateAccountBalanceCache(nextFromAccountId, -(nextAmount + nextFee));
    }
    if (nextToAccountId) {
      updateAccountBalanceCache(nextToAccountId, nextAmount);
    }

    replaceRowAcrossCaches(
      basePath,
      itemId,
      (row) =>
        applyLocalMetadata(
          {
            ...row,
            fromAccountId: nextFromAccountId ? resolveRef('/accounts', nextFromAccountId) : row.fromAccountId,
            toAccountId: nextToAccountId ? resolveRef('/accounts', nextToAccountId) : row.toAccountId,
            amount: nextAmount,
            fee: nextFee,
            note: body.note ?? row.note,
            transferDate: body.transferDate ?? row.transferDate,
          },
          timestamp,
          itemId,
        ),
      matchesRowForCache.bind(null, basePath),
    );
    clearDerivedCaches();
  }
}

function optimisticDelete(path: string) {
  const basePath = getMutationBasePath(path);
  const itemId = getMutationItemId(path);
  if (!basePath || !itemId) {
    return;
  }

  const current = findCachedRef(basePath, itemId);
  if (!current) {
    return;
  }

  if (basePath === '/expenses' || basePath === '/incomes') {
    const accountId = getRefId(current.accountId);
    const amount = getRecordNumber(current.amount);
    if (accountId) {
      updateAccountBalanceCache(accountId, basePath === '/incomes' ? -amount : amount);
    }
    clearDerivedCaches();
  }

  if (basePath === '/loan/loads') {
    const accountId = getRefId(current.accountId);
    const amount = getRecordNumber(current.amount);
    const direction = getRecordValue(current.direction, 'LENT');
    if (accountId) {
      updateAccountBalanceCache(accountId, direction === 'BORROWED' ? -amount : amount);
    }
    clearDerivedCaches();
  }

  if (basePath === '/transfers') {
    const fromAccountId = getRefId(current.fromAccountId);
    const toAccountId = getRefId(current.toAccountId);
    const amount = getRecordNumber(current.amount);
    const fee = getRecordNumber(current.fee);
    if (fromAccountId) {
      updateAccountBalanceCache(fromAccountId, amount + fee);
    }
    if (toAccountId) {
      updateAccountBalanceCache(toAccountId, -amount);
    }
    clearDerivedCaches();
  }

  removeRowAcrossCaches(basePath, itemId);
}

function mergeQueuedCreateResult(tempId: string, response: unknown) {
  if (!response || typeof response !== 'object' || !('_id' in response)) {
    return;
  }

  updateCache((store) => {
    for (const key of Object.keys(store)) {
      const current = store[key]?.data;
      if (!Array.isArray(current)) {
        continue;
      }
      store[key] = {
        ...store[key],
        data: current.map((item) => {
          if (!item || typeof item !== 'object' || !('_id' in item) || String((item as { _id: string })._id) !== tempId) {
            return item;
          }

          return {
            ...item,
            ...response,
            _id: String((response as { _id: string })._id),
          };
        }),
      };
    }
  });
}

function mergeServerMutationResult(item: QueueItem, response: unknown) {
  if (item.method === 'POST' && item.tempId) {
    mergeQueuedCreateResult(item.tempId, response);
    return;
  }

  if (item.method !== 'PATCH') {
    return;
  }

  if (!response || typeof response !== 'object' || !('_id' in response)) {
    return;
  }

  const basePath = getMutationBasePath(item.path);
  const itemId = getMutationItemId(item.path);
  if (!basePath || !itemId) {
    return;
  }

  replaceRowAcrossCaches(basePath, itemId, () => response as MutableRecord, matchesRowForCache.bind(null, basePath));
}

function buildQueuedResponse(path: string, body: MutableRecord, tempId: string, timestamp: string) {
  const basePath = getBasePath(path);
  const fromCache = findCachedRef(basePath, tempId);
  if (fromCache) {
    return fromCache;
  }

  if (basePath === '/accounts') {
    const initialBalance = getRecordNumber(body.initialBalance);
    return applyLocalMetadata({ ...body, initialBalance, currentBalance: initialBalance }, timestamp, tempId);
  }

  return applyLocalMetadata(body, timestamp, tempId);
}

function createApiError(status: number, message: string) {
  return Object.assign(new Error(message), { status });
}

function getErrorStatus(error: unknown) {
  if (!error || typeof error !== 'object' || !('status' in error)) {
    return undefined;
  }
  const status = Number((error as { status?: unknown }).status);
  return Number.isFinite(status) ? status : undefined;
}

function isOfflineLikeError(error: unknown) {
  return getErrorStatus(error) === undefined;
}

function withClientRequestId(path: string, body: MutableRecord) {
  if (!OFFLINE_CREATE_ROUTES.has(getBasePath(path)) || path.startsWith('/auth/')) {
    return body;
  }

  if ('clientRequestId' in body) {
    return body;
  }

  return { ...body, clientRequestId: buildClientRequestId() };
}

function withExpectedUpdatedAt(path: string, body: MutableRecord) {
  const basePath = getMutationBasePath(path);
  const itemId = getMutationItemId(path);
  if (!basePath || !itemId || 'expectedUpdatedAt' in body) {
    return body;
  }

  const expectedUpdatedAt = getExpectedUpdatedAt(basePath, itemId);
  return expectedUpdatedAt ? { ...body, expectedUpdatedAt } : body;
}

function withDeleteExpectedUpdatedAt(path: string) {
  const basePath = getMutationBasePath(path);
  const itemId = getMutationItemId(path);
  if (!basePath || !itemId) {
    return path;
  }

  const expectedUpdatedAt = getExpectedUpdatedAt(basePath, itemId);
  return expectedUpdatedAt ? appendQueryParam(path, 'expectedUpdatedAt', expectedUpdatedAt) : path;
}

function findQueuedCreateByTempId(tempId: string) {
  return getQueue().find((item) => item.method === 'POST' && item.tempId === tempId);
}

async function handlePendingCreateMutation(path: string, method: QueueMethod, body?: MutableRecord) {
  const itemId = getMutationItemId(path);
  if (!itemId) {
    return null;
  }

  const queuedCreate = findQueuedCreateByTempId(itemId);
  if (!queuedCreate) {
    return null;
  }

  if (method === 'PATCH' && body) {
    const { expectedUpdatedAt: _ignored, ...changes } = body;
    updateQueue((items) =>
      items.map((item) =>
        item.id === queuedCreate.id
          ? {
              ...item,
              body: {
                ...(item.body ?? {}),
                ...changes,
              },
            }
          : item,
      ),
    );
    optimisticUpdate(path, changes, nowIso());
    dispatchSyncEvent();
    await flushQueuedMutations();
    return findCachedRef(getMutationBasePath(path) ?? getBasePath(path), itemId);
  }

  if (method === 'DELETE') {
    removeQueueItem(queuedCreate.id);
    optimisticDelete(path);
    dispatchSyncEvent();
    return { success: true };
  }

  return null;
}

async function requestServer<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const token = getToken();
  const headers = new Headers(options.headers);

  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    body: options.body && typeof options.body !== 'string' ? JSON.stringify(options.body) : options.body,
  });

  if (response.status === 401 && typeof window !== 'undefined') {
    clearSession();
    window.location.href = '/login';
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw createApiError(response.status, Array.isArray(error.message) ? error.message.join(', ') : error.message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

async function flushQueuedMutations() {
  if (!isBrowser() || !navigator.onLine || !getToken()) {
    return;
  }

  const queue = getQueue();
  if (!queue.length) {
    return;
  }

  if (flushPromise) {
    return flushPromise;
  }

  dispatchSyncStatus({
    phase: 'syncing',
    pendingCount: queue.length,
  });

  flushPromise = (async () => {
    let didSync = false;
    let syncedCount = 0;

    for (const item of [...queue]) {
      try {
        const response = await requestServer(item.path, { method: item.method, body: item.body });
        mergeServerMutationResult(item, response);
        removeQueueItem(item.id);
        didSync = true;
        syncedCount += 1;
      } catch (error) {
        const status = getErrorStatus(error);
        if (status === 404 || status === 409) {
          removeQueueItem(item.id);
          didSync = true;
          syncedCount += 1;
          continue;
        }
        dispatchSyncStatus();
        break;
      }
    }

    if (didSync) {
      dispatchSyncStatus({
        phase: 'synced',
        pendingCount: getQueue().length,
        lastSyncedAt: nowIso(),
        message: `${pluralizeChanges(syncedCount)} synced`,
      });
      dispatchSyncEvent();
    }
  })().finally(() => {
    flushPromise = null;
  });

  return flushPromise;
}

function initBackgroundSync() {
  if (!isBrowser() || syncInitialized) {
    return;
  }

  syncInitialized = true;

  window.addEventListener('online', () => {
    dispatchSyncStatus();
    flushQueuedMutations().catch(console.error);
  });

  window.addEventListener('offline', () => {
    dispatchSyncStatus({ phase: 'offline' });
  });

  window.setInterval(() => {
    if (navigator.onLine && document.visibilityState === 'visible') {
      flushQueuedMutations().catch(console.error);
    }
  }, OFFLINE_SYNC_INTERVAL_MS);
}

export function getToken() {
  if (typeof window === 'undefined') {
    return null;
  }
  return window.localStorage.getItem('expense_token');
}

export function getStoredUser(): AuthUser | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const rawUser = window.localStorage.getItem('expense_user');
  if (!rawUser) {
    return null;
  }

  try {
    return JSON.parse(rawUser) as AuthUser;
  } catch {
    clearSession();
    return null;
  }
}

export function storeSession(accessToken: string, user: AuthUser) {
  window.localStorage.setItem('expense_token', accessToken);
  window.localStorage.setItem('expense_user', JSON.stringify(user));
  dispatchSyncStatus();
  flushQueuedMutations().catch(console.error);
}

export function clearSession() {
  window.localStorage.removeItem('expense_token');
  window.localStorage.removeItem('expense_user');
  syncStatusCache = null;
}

export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  initBackgroundSync();

  const method = (options.method ?? 'GET').toUpperCase() as QueueMethod | 'GET';
  const mutableBody = options.body && typeof options.body !== 'string' ? (options.body as MutableRecord) : null;

  let normalizedPath = path;
  let normalizedBody = options.body;

  if (mutableBody && method === 'POST' && shouldQueueOfflineCreate(path, options)) {
    normalizedBody = withClientRequestId(path, mutableBody);
  }

  if (mutableBody && method === 'PATCH') {
    normalizedBody = withExpectedUpdatedAt(path, mutableBody);
  }

  if (method === 'DELETE') {
    normalizedPath = withDeleteExpectedUpdatedAt(path);
  }

  if ((method === 'PATCH' || method === 'DELETE') && getMutationItemId(normalizedPath)) {
    const pendingResult = await handlePendingCreateMutation(normalizedPath, method, normalizedBody && typeof normalizedBody !== 'string' ? (normalizedBody as MutableRecord) : undefined);
    if (pendingResult !== null) {
      return pendingResult as T;
    }
  }

  try {
    const response = await requestServer<T>(normalizedPath, { ...options, method, body: normalizedBody });
    if (method === 'GET') {
      setCached(path, response);
    }
    if (method !== 'GET') {
      clearDerivedCaches();
      dispatchSyncEvent();
    }
    return response;
  } catch (error) {
    if (method === 'GET') {
      const cached = getCached(path);
      if (cached !== undefined) {
        return cached as T;
      }
    }

    if (method !== 'GET' && shouldQueueOfflineMutation(normalizedPath, { ...options, method }) && getToken() && isOfflineLikeError(error)) {
      const timestamp = nowIso();
      const queueId = buildTempId();
      const body = normalizedBody && typeof normalizedBody !== 'string' ? (normalizedBody as MutableRecord) : undefined;

      if (method === 'POST' && body) {
        const tempId = buildTempId();
        optimisticCreate(normalizedPath, body, tempId, timestamp);
        queueQueuedMutation({
          id: queueId,
          method,
          path: normalizedPath,
          body,
          tempId,
          createdAt: Date.now(),
        });
        dispatchSyncEvent();
        return buildQueuedResponse(normalizedPath, body, tempId, timestamp) as T;
      }

      if (method === 'PATCH' && body) {
        optimisticUpdate(normalizedPath, body, timestamp);
        queueQueuedMutation({
          id: queueId,
          method,
          path: normalizedPath,
          body,
          createdAt: Date.now(),
        });
        dispatchSyncEvent();
        const basePath = getMutationBasePath(normalizedPath);
        const itemId = getMutationItemId(normalizedPath);
        if (basePath && itemId) {
          const row = findCachedRef(basePath, itemId);
          if (row) {
            return row as T;
          }
        }
      }

      if (method === 'DELETE') {
        optimisticDelete(normalizedPath);
        queueQueuedMutation({
          id: queueId,
          method,
          path: normalizedPath,
          createdAt: Date.now(),
        });
        dispatchSyncEvent();
        return { success: true } as T;
      }
    }

    throw error;
  }
}

export const http = {
  get: <T>(path: string) => api<T>(path),
  post: <T>(path: string, body: Record<string, unknown>) => api<T>(path, { method: 'POST', body }),
  patch: <T>(path: string, body: Record<string, unknown>) => api<T>(path, { method: 'PATCH', body }),
  delete: <T>(path: string) => api<T>(path, { method: 'DELETE' }),
};
