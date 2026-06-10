const API_BASE = '/api';

function getToken(): string | null {
  return localStorage.getItem('auth_token');
}

export function setToken(token: string) {
  localStorage.setItem('auth_token', token);
}

export function clearToken() {
  localStorage.removeItem('auth_token');
}

async function request<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (res.status === 401) {
    clearToken();
    window.location.href = '/register';
    throw new Error('Unauthorized');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed: ${res.status}`);
  return data as T;
}

// ===== AUTH =====
export const authApi = {
  register: (email: string, password: string, fullName?: string) =>
    request<{ token: string; user: any }>('/auth/register', {
      method: 'POST', body: JSON.stringify({ email, password, fullName }),
    }),
  login: (email: string, password: string) =>
    request<{ token: string; user: any }>('/auth/login', {
      method: 'POST', body: JSON.stringify({ email, password }),
    }),
  me: () => request<{ id: string; email: string; fullName: string | null; isSuperAdmin?: boolean }>('/auth/me'),
};

// ===== FINANCE =====
export const financeApi = {
  getState: () =>
    request<{
      incomes: { id: string; source: string; amount: number }[];
      expenses: { id: string; name: string; amount: number }[];
      debts: { id: string; name: string; balance: number; apr: number; minPayment: number }[];
      strategy: 'avalanche' | 'snowball';
      theme: 'dark' | 'light';
    }>('/finance/state'),
  seedDefaults: () => request('/finance/seed-defaults', { method: 'POST' }),
  createIncome: (data: { source: string; amount: number }) =>
    request('/finance/incomes', { method: 'POST', body: JSON.stringify(data) }),
  updateIncome: (id: string, data: any) =>
    request(`/finance/incomes/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteIncome: (id: string) =>
    request(`/finance/incomes/${id}`, { method: 'DELETE' }),
  createExpense: (data: { name: string; amount: number }) =>
    request('/finance/expenses', { method: 'POST', body: JSON.stringify(data) }),
  updateExpense: (id: string, data: any) =>
    request(`/finance/expenses/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteExpense: (id: string) =>
    request(`/finance/expenses/${id}`, { method: 'DELETE' }),
  createDebt: (data: { name: string; balance: number; apr: number; minPayment: number }) =>
    request('/finance/debts', { method: 'POST', body: JSON.stringify(data) }),
  updateDebt: (id: string, data: any) =>
    request(`/finance/debts/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteDebt: (id: string) =>
    request(`/finance/debts/${id}`, { method: 'DELETE' }),
  setPreferences: (prefs: { strategy?: 'avalanche' | 'snowball'; theme?: 'dark' | 'light' }) =>
    request('/finance/preferences', { method: 'PUT', body: JSON.stringify(prefs) }),
};

// ===== GEO CHAT =====
export const chatApi = {
  status: () => request<{ enabled: boolean }>('/chat/status'),
  send: (messages: { role: 'user' | 'assistant'; content: string }[]) =>
    request<{ reply: string }>('/chat/message', {
      method: 'POST', body: JSON.stringify({ messages }),
    }),
  insight: () => request<{ insight: string | null }>('/chat/insight'),
};
