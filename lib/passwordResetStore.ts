export interface PasswordResetRecord {
  id: string;
  userId: string;
  email: string;
  code: string;
  expiresAt: string;
  verifiedAt?: string | null;
  consumedAt?: string | null;
  metadata?: Record<string, unknown> | null;
}

const memoryResetStore = new Map<string, PasswordResetRecord>();
let passwordResetTableAvailable = true;

export function isResetTableAvailable() {
  return passwordResetTableAvailable;
}

export function markResetTableUnavailable() {
  passwordResetTableAvailable = false;
}

export function upsertResetRecord(record: PasswordResetRecord) {
  memoryResetStore.set(record.id, record);
}

export function invalidateResetRecordsForUser(userId: string, timestamp: string) {
  for (const record of memoryResetStore.values()) {
    if (record.userId === userId && !record.consumedAt) {
      record.consumedAt = timestamp;
      memoryResetStore.set(record.id, record);
    }
  }
}

export function getResetRecord(id: string) {
  return memoryResetStore.get(id);
}

export function setRecordVerified(id: string, timestamp: string) {
  const record = memoryResetStore.get(id);
  if (!record) return;
  record.verifiedAt = timestamp;
  memoryResetStore.set(id, record);
}

export function consumeResetRecord(id: string, timestamp: string) {
  const record = memoryResetStore.get(id);
  if (!record) return;
  record.consumedAt = timestamp;
  memoryResetStore.set(id, record);
}
