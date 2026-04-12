function getCookie(name: string): string | null {
  const m = document.cookie.match(new RegExp('(^|;)\\s*' + name + '\\s*=\\s*([^;]+)'));
  return m ? decodeURIComponent(m.pop()!.trim()) : null;
}

const API_PREFIX = '/api';

export async function apiFetch<T = unknown>(
  path: string,
  opts: RequestInit = {}
): Promise<T> {
  const headers = new Headers(opts.headers);
  const method = (opts.method || 'GET').toUpperCase();
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    const token = getCookie('csrftoken');
    if (token) headers.set('X-CSRFToken', token);
  }
  headers.set('Accept', 'application/json');
  if (
    opts.body &&
    typeof opts.body === 'string' &&
    !headers.has('Content-Type')
  ) {
    headers.set('Content-Type', 'application/json');
  }
  const res = await fetch(`${API_PREFIX}${path}`, {
    ...opts,
    headers,
    credentials: 'include',
  });
  if (res.status === 401) {
    const err = new Error('Unauthorized') as Error & { status: number };
    err.status = 401;
    throw err;
  }
  if (!res.ok) {
    const t = await res.text();
    throw new Error(t || res.statusText);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

/** multipart/form-data (без ручного Content-Type — браузер выставит boundary) */
export async function apiUpload<T = unknown>(path: string, form: FormData): Promise<T> {
  const headers = new Headers();
  const token = getCookie('csrftoken');
  if (token) headers.set('X-CSRFToken', token);
  headers.set('Accept', 'application/json');
  const res = await fetch(`${API_PREFIX}${path}`, {
    method: 'POST',
    body: form,
    headers,
    credentials: 'include',
  });
  if (res.status === 401) {
    const err = new Error('Unauthorized') as Error & { status: number };
    err.status = 401;
    throw err;
  }
  if (!res.ok) {
    const t = await res.text();
    throw new Error(t || res.statusText);
  }
  return res.json() as Promise<T>;
}

export async function ensureCsrf(): Promise<void> {
  await apiFetch('/auth/csrf/');
}
