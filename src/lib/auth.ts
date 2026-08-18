import { apiRequest } from './api';

export type AuthUser = {
  userId: string;
  name: string;
  username: string;
  email?: string;
  roleId: string;
  status: string;
};

export type AssignedShop = {
  userShopId?: string;
  userId: string;
  shopId: string;
  status: string;
  isPrimary?: boolean | string;
  shopName?: string;
  name?: string;
  [key: string]: unknown;
};

export type Session = {
  token: string;
  user: AuthUser;
  permissions: string[];
  shops: AssignedShop[];
};

const SESSION_KEY = 'itrust.session';

export async function login(username: string, password: string): Promise<Session> {
  const response = await apiRequest<Session>('LOGIN', { username, password });
  if (!response.success || !response.data) {
    throw new Error(response.error || 'Login failed.');
  }

  localStorage.setItem(SESSION_KEY, JSON.stringify(response.data));
  return response.data;
}

export function getSession(): Session | null {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as Session;
  } catch {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
}

export function logout() {
  localStorage.removeItem(SESSION_KEY);
}

export function getToken(): string | undefined {
  return getSession()?.token;
}

export function getRoleName(): string {
  const roleId = getSession()?.user.roleId || '';
  return roleId.replace(/^ROLE_/i, '').toUpperCase();
}

export function hasPermission(permission: string): boolean {
  const permissions = getSession()?.permissions || [];
  return permissions.includes('*') || permissions.includes(permission);
}

export function getAssignedShops(): AssignedShop[] {
  const shops = [...(getSession()?.shops || [])];
  return shops.sort((a, b) => Number(Boolean(b.isPrimary)) - Number(Boolean(a.isPrimary)));
}

export function getPrimaryShop(): AssignedShop | null {
  return getAssignedShops()[0] || null;
}
