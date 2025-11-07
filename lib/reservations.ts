export const DEFAULT_BRANCH_ID = 'MATRIZ';
export const MAX_MONTHS_IN_ADVANCE = 1;

export const normalizeDateOnly = (isoInput: string) => {
  if (!isoInput) return '';
  if (isoInput.includes('T')) {
    return isoInput.split('T')[0];
  }
  return isoInput;
};

export const isDateWithinRange = (dateOnly: string) => {
  if (!dateOnly) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const limit = new Date(today);
  limit.setMonth(limit.getMonth() + MAX_MONTHS_IN_ADVANCE);

  const [year, month, day] = dateOnly.split('-').map(Number);
  if ([year, month, day].some((part) => Number.isNaN(part))) {
    return false;
  }

  const candidate = new Date(year, month - 1, day);
  candidate.setHours(0, 0, 0, 0);
  return candidate >= today && candidate <= limit;
};

export const trimTimeToMinutes = (timeValue?: string | null) => {
  if (!timeValue) return null;
  return timeValue.slice(0, 5);
};
