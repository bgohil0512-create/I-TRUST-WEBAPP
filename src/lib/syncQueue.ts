import { db } from './db';
import { createOperationId, createId } from './ids';

export async function enqueueOperation(input: {
  entityType: string;
  entityId: string;
  operation: 'CREATE' | 'UPDATE' | 'DELETE' | 'SYNC';
  payload: unknown;
}) {
  const now = new Date().toISOString();

  await db.syncQueue.add({
    id: createId('SYNC'),
    operationId: createOperationId(),
    entityType: input.entityType,
    entityId: input.entityId,
    operation: input.operation,
    payload: input.payload,
    status: 'PENDING',
    attemptCount: 0,
    createdAt: now,
    updatedAt: now,
  });
}

export async function getPendingOperations() {
  return db.syncQueue.where('status').equals('PENDING').toArray();
}
