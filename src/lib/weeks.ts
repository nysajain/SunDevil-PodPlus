const MIN_WEEK = 1;
const MAX_WEEK = 14;
const WEEK_STORAGE_KEY = 'currentWeek';

export const clampWeek = (value: number) => Math.min(MAX_WEEK, Math.max(MIN_WEEK, Math.round(value)));

const semesterAnchor = (referenceDate: Date) => new Date(referenceDate.getFullYear(), 7, 19);

export const deriveWeekFromAnchor = (referenceDate: Date = new Date()) => {
  const anchor = semesterAnchor(referenceDate);
  const diffMs = referenceDate.getTime() - anchor.getTime();
  const weeks = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 7));
  return clampWeek(1 + weeks);
};

export const getRealWeek = () => deriveWeekFromAnchor(new Date());

export const readStoredWeek = () => {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return getRealWeek();
  }
  const stored = localStorage.getItem(WEEK_STORAGE_KEY);
  if (stored) {
    const parsed = parseInt(stored, 10);
    if (!Number.isNaN(parsed)) {
      return clampWeek(parsed);
    }
  }
  const derived = getRealWeek();
  try {
    localStorage.setItem(WEEK_STORAGE_KEY, derived.toString());
  } catch (error) {
    console.error('Unable to persist derived week', error);
  }
  return derived;
};

export const persistWeek = (week: number) => {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return;
  }
  try {
    localStorage.setItem(WEEK_STORAGE_KEY, clampWeek(week).toString());
  } catch (error) {
    console.error('Unable to persist current week', error);
  }
};

