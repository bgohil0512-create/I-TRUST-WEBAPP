import { getToken } from './auth';

export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
  requestId?: string;
};

const API_URL = import.meta.env.VITE_APPS_SCRIPT_API_URL as string | undefined;

export async function apiRequest<T>(
  action: string,
  payload: Record<string, unknown> = {},
  authenticated = action !== 'LOGIN',
): Promise<ApiResponse<T>> {
  if (!API_URL) {
    return {
      success: false,
      error: 'Apps Script API URL is not configured.',
    };
  }

  const token = authenticated ? getToken() : undefined;
  if (authenticated && !token) {
    return { success: false, error: 'Your session has expired. Please login again.' };
  }

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({
      action,
      payload: authenticated ? { ...payload, token } : payload,
    }),
  });

  if (!response.ok) {
    return { success: false, error: `API request failed (${response.status}).` };
  }

  return response.json() as Promise<ApiResponse<T>>;
}
