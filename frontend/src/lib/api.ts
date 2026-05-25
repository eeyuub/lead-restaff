const BASE_URL = (import.meta.env.VITE_API_URL as string) || 'http://localhost:3000';
const KEY_STORAGE = 'restaff.apiKey';

export const auth = {
  get key(): string {
    return localStorage.getItem(KEY_STORAGE) || '';
  },
  set(key: string) {
    localStorage.setItem(KEY_STORAGE, key);
  },
  clear() {
    localStorage.removeItem(KEY_STORAGE);
  },
  isAuthed(): boolean {
    return !!this.key;
  },
};

export class UnauthorizedError extends Error {
  constructor(message = 'Unauthorized') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

type FetchOpts = RequestInit & {
  params?: Record<string, string | number | undefined>;
  /** Skip Authorization header (used by /auth/login). */
  anonymous?: boolean;
};

async function request<T>(path: string, opts: FetchOpts = {}): Promise<T> {
  const url = new URL(path, BASE_URL);
  if (opts.params) {
    for (const [k, v] of Object.entries(opts.params)) {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
    }
  }
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(opts.headers as Record<string, string> | undefined),
  };
  if (!opts.anonymous) {
    const key = auth.key;
    if (!key) {
      // No key — kick back to login.
      auth.clear();
      window.dispatchEvent(new Event('restaff:unauthenticated'));
      throw new UnauthorizedError('No API key stored');
    }
    headers['x-api-key'] = key;
  }
  const resp = await fetch(url.toString(), { ...opts, headers });
  if (resp.status === 401) {
    auth.clear();
    window.dispatchEvent(new Event('restaff:unauthenticated'));
    throw new UnauthorizedError();
  }
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`${resp.status}: ${text}`);
  }
  if (resp.status === 204) return undefined as T;
  return resp.json();
}

export const api = {
  get: <T>(path: string, params?: FetchOpts['params']) =>
    request<T>(path, { method: 'GET', params }),
  post: <T>(path: string, body?: any, opts?: FetchOpts) =>
    request<T>(path, {
      ...opts,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    }),
  patch: <T>(path: string, body?: any) =>
    request<T>(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  delete: <T = void>(path: string) => request<T>(path, { method: 'DELETE' }),
};

/** Validate a key against the backend. Returns true on success. */
export async function login(key: string): Promise<boolean> {
  try {
    await request<{ ok: true }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ key }),
      anonymous: true,
    });
    auth.set(key);
    window.dispatchEvent(new Event('restaff:authenticated'));
    return true;
  } catch {
    return false;
  }
}
