export function normalizeWalletAddress(value?: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith('0x')) {
    return trimmed;
  }

  if (trimmed.includes('.')) {
    return trimmed.toLowerCase();
  }

  return `${trimmed.toLowerCase()}.eth`;
}
