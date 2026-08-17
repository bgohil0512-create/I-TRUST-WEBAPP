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
): Promise<ApiResponse<T>> {
  if (!API_URL) {
    return {
      success: false,
      error: 'Apps Script API URL is not configured.',
    };
  }

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action, payload }),
  });

  if (!response.ok) {
    return { success: false, error: `API request failed (${response.status}).` };
  }

  return response.json() as Promise<ApiResponse<T>>;
}
