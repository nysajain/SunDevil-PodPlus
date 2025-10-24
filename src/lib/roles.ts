export type Role = 'student' | 'captain-candidate' | 'captain';

const ROLE_KEY = 'role';
const CURRENT_USER_ID_KEY = 'currentUserId';

const isBrowser = () => typeof window !== 'undefined' && typeof localStorage !== 'undefined';

export const getRole = (): Role => {
  if (!isBrowser()) return 'student';
  const stored = localStorage.getItem(ROLE_KEY) as Role | null;
  if (stored === 'captain' || stored === 'captain-candidate' || stored === 'student') {
    return stored;
  }
  return 'student';
};

export const setRole = (role: Role) => {
  if (!isBrowser()) return;
  localStorage.setItem(ROLE_KEY, role);
  window.dispatchEvent(new Event('pods:role-updated'));
};

export const isCaptain = (): boolean => getRole() === 'captain';

export const currentUserId = (): string | null => {
  if (!isBrowser()) return null;
  return localStorage.getItem(CURRENT_USER_ID_KEY);
};

export const setCurrentUserId = (id: string | null) => {
  if (!isBrowser()) return;
  if (id) {
    localStorage.setItem(CURRENT_USER_ID_KEY, id);
  } else {
    localStorage.removeItem(CURRENT_USER_ID_KEY);
  }
  window.dispatchEvent(new Event('pods:session-updated'));
};
