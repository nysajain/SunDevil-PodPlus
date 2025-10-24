const isBrowser = () => typeof window !== 'undefined' && typeof localStorage !== 'undefined';

const keyFor = (userId: string | null | undefined) => {
  if (!userId) return 'points';
  return `points:${userId}`;
};

export const getPoints = (userId: string | null | undefined): number => {
  if (!isBrowser()) return 0;
  const stored = localStorage.getItem(keyFor(userId));
  if (!stored) return 0;
  const value = parseInt(stored, 10);
  return Number.isFinite(value) ? value : 0;
};

export const setPoints = (userId: string | null | undefined, value: number) => {
  if (!isBrowser()) return;
  const safeValue = Math.max(Math.round(value), 0);
  localStorage.setItem(keyFor(userId), safeValue.toString());
  window.dispatchEvent(new CustomEvent('pods:points-updated', { detail: safeValue }));
};

export const adjustPoints = (userId: string | null | undefined, delta: number) => {
  if (!isBrowser()) return 0;
  const next = Math.max(getPoints(userId) + delta, 0);
  setPoints(userId, next);
  return next;
};

export const transferLegacyPoints = (userId: string | null | undefined) => {
  if (!isBrowser() || !userId) return;
  const legacy = localStorage.getItem('points');
  if (!legacy) return;
  const value = parseInt(legacy, 10);
  if (!Number.isFinite(value)) return;
  localStorage.setItem(keyFor(userId), Math.max(value, 0).toString());
  localStorage.removeItem('points');
};
