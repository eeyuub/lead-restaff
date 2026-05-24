const BASE_URL = (import.meta.env.VITE_API_URL as string) || 'http://localhost:3000';
const API_KEY = (import.meta.env.VITE_INTERNAL_API_KEY as string) || '';

type FetchOpts = RequestInit & { params?: Record<string, string | number | undefined> };

async function request<T>(path: string, opts: FetchOpts = {}): Promise<T> {
  const url = new URL(path, BASE_URL);
  if (opts.params) {
    for (const [k, v] of Object.entries(opts.params)) {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
    }
  }
  const resp = await fetch(url.toString(), {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
      ...(opts.headers ?? {}),
    },
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`${resp.status}: ${text}`);
  }
  if (resp.status === 204) return undefined as T;
  return resp.json();
}

export const api = {
  get: <T>(path: string, params?: FetchOpts['params']) => request<T>(path, { method: 'GET', params }),
  post: <T>(path: string, body?: any) =>
    request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: any) =>
    request<T>(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  delete: <T = void>(path: string) => request<T>(path, { method: 'DELETE' }),
};
