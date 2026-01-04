import type { SnackbarTone } from '@/hooks/useSnackbarNotifications';

const STORAGE_KEY = 'xoco:pending-snackbar';

export type PendingSnackbarPayload = {
  message: string;
  tone?: SnackbarTone;
};

export const enqueuePendingSnackbar = (payload: PendingSnackbarPayload) => {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (error) {
    console.error('[enqueuePendingSnackbar] Failed to persist payload:', error);
  }
};

export const consumePendingSnackbar = (): PendingSnackbarPayload | null => {
  if (typeof window === 'undefined') {
    return null;
  }
  const raw = window.sessionStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }
  window.sessionStorage.removeItem(STORAGE_KEY);
  try {
    return JSON.parse(raw) as PendingSnackbarPayload;
  } catch (error) {
    console.error('[consumePendingSnackbar] Failed to parse payload:', error);
    return null;
  }
};
