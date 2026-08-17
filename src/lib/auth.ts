import { apiRequest } from './api';

export type AuthUser = {
  userId: string;
  name: string;
  username: string;
  roleId: string;
  status: string;
};

export type Session = {
  token: string;
  user: AuthUser;
};

const SESSION_KEY = 'itrust.session';

export async function login(username: string, password: string) {
  const response = await apiRequest<Session>('LOGIN', { username, password });
  if (!response.success || !response.data) throw new Error(response.error || 'Login failed.');
  localStorage.setItem(SESSION_KEY, JSON.stringify(response.data));
  return response.data;
}

export function getSession(): Session | null {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw) as Session; } catch { localStorage.removeItem(SESSION_KEY); return null; }
}

export function logout() {
  localStorage.removeItem(SESSION_KEY);
}

export function getToken() {
  return getSession()?.token;
}
