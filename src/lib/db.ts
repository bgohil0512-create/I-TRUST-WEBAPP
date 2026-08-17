import Dexie, { type Table } from 'dexie';

export interface AppSetting {
  id: string;
  key: string;
  value: string;
  updatedAt: string;
}

export interface SyncQueueItem {
  id: string;
  operationId: string;
  entityType: string;
  entityId: string;
  operation: 'CREATE' | 'UPDATE' | 'DELETE' | 'SYNC';
  payload: unknown;
  status: 'PENDING' | 'SYNCING' | 'SYNCED' | 'FAILED' | 'CONFLICT';
  attemptCount: number;
  createdAt: string;
  updatedAt: string;
  lastError?: string;
}

class ITrustDatabase extends Dexie {
  settings!: Table<AppSetting, string>;
  syncQueue!: Table<SyncQueueItem, string>;

  constructor() {
    super('ITrustWebAppDB');

    this.version(1).stores({
      settings: 'id, key',
      syncQueue: 'id, operationId, entityType, entityId, status, createdAt',
    });
  }
}

export const db = new ITrustDatabase();
