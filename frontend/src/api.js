const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3001').replace(/\/$/, '');
const TOKEN_KEY = 'nc_nmc_token';
const USER_KEY = 'nc_nmc_user';

const storage = {
  get(key) {
    try { return localStorage.getItem(key); } catch { return null; }
  },
  set(key, value) {
    try { localStorage.setItem(key, value); } catch { /* private mode */ }
  },
  remove(key) {
    try { localStorage.removeItem(key); } catch { /* private mode */ }
  },
};

export const session = {
  token: () => storage.get(TOKEN_KEY),
  user: () => {
    try { return JSON.parse(storage.get(USER_KEY) || 'null'); } catch { return null; }
  },
  save(token, user) {
    storage.set(TOKEN_KEY, token);
    storage.set(USER_KEY, JSON.stringify(user || {}));
  },
  clear() {
    storage.remove(TOKEN_KEY);
    storage.remove(USER_KEY);
  },
};

export class ApiError extends Error {
  constructor(message, status, data = null) {
    super(message);
    this.status = status;
    this.code = data?.code || '';
    this.data = data;
  }
}

const request = async (path, { method = 'GET', body, form, auth = true } = {}) => {
  const headers = {};
  if (auth && session.token()) headers.Authorization = `Bearer ${session.token()}`;
  if (body) headers['Content-Type'] = 'application/json';

  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: form || (body ? JSON.stringify(body) : undefined),
    });
  } catch {
    throw new ApiError('Server se connect nahi ho paya. Internet check karke dobara try karein.', 0);
  }

  let data = null;
  try { data = await response.json(); } catch { /* empty body */ }

  if (!response.ok) {
    if (response.status === 401 && auth) {
      session.clear();
      window.dispatchEvent(new Event('nc-logout'));
    }
    throw new ApiError(data?.error || data?.message || `Request failed (${response.status})`, response.status, data);
  }
  return data;
};

export const api = {
  login: (email, password) => request('/api/auth/login', { method: 'POST', body: { email, password }, auth: false }),
  signup: (name, email, password) => request('/api/auth/signup', { method: 'POST', body: { name, email, password }, auth: false }),

  audit: ({ text, url, file, category, fresh = false }) => {
    const form = new FormData();
    form.append('country', 'India');
    form.append('category', category);
    form.append('analysisMode', 'Standard');
    if (text) form.append('text', text);
    if (url) form.append('url', url);
    if (file) form.append('file', file);
    if (fresh) form.append('fresh', 'true');
    return request('/api/audit', { method: 'POST', form });
  },

  // Live audit: calls onEvent for each progress event and resolves with the final result
  auditStream: async ({ text, url, file, category, fresh = false }, onEvent) => {
    const form = new FormData();
    form.append('country', 'India');
    form.append('category', category);
    form.append('analysisMode', 'Standard');
    if (text) form.append('text', text);
    if (url) form.append('url', url);
    if (file) form.append('file', file);
    if (fresh) form.append('fresh', 'true');

    let response;
    try {
      response = await fetch(`${API_URL}/api/audit/stream`, {
        method: 'POST',
        headers: session.token() ? { Authorization: `Bearer ${session.token()}` } : {},
        body: form,
      });
    } catch {
      throw new ApiError('Server se connect nahi ho paya. Internet check karke dobara try karein.', 0);
    }
    if (!response.ok || !response.body) {
      let data = null;
      try { data = await response.json(); } catch { /* empty */ }
      if (response.status === 401) { session.clear(); window.dispatchEvent(new Event('nc-logout')); }
      throw new ApiError(data?.error || `Request failed (${response.status})`, response.status, data);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let final = null;
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let nl;
      while ((nl = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, nl).trim();
        buffer = buffer.slice(nl + 1);
        if (!line) continue;
        let event;
        try { event = JSON.parse(line); } catch { continue; }
        if (event.type === 'result') final = event;
        else if (event.type !== 'ping') onEvent?.(event);
      }
    }
    if (!final) throw new ApiError('The connection was interrupted. Your audit may still finish — check Audit History in a minute.', 0);
    if (final.status >= 400) throw new ApiError(final.body?.error || 'Audit failed', final.status, final.body);
    return final.body;
  },

  history: () => request('/api/audit/history?limit=50'),
  auditById: (id) => request(`/api/audit/${id}`),
  rulePack: () => request('/api/rules/pack?country=india', { auth: false }),

  plans: () => request('/api/billing/plans', { auth: false }),
  account: () => request('/api/billing/me'),
  ledger: () => request('/api/billing/ledger'),
  createOrder: (kind, planId) => request('/api/billing/order', { method: 'POST', body: { kind, planId } }),
  verifyPayment: (payload) => request('/api/billing/verify', { method: 'POST', body: payload }),
  tryAudit: (payload) => request('/api/try-audit', { method: 'POST', body: payload, auth: false }),
  enterpriseLead: (form) => request('/api/billing/enterprise', { method: 'POST', body: form, auth: false }),
};
