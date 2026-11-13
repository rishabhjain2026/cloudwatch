const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

function getCsrfToken() {
  const match = document.cookie.match(/(?:^|; )ip_csrf=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

async function request(path, options = {}) {
  const headers = {
    Accept: 'application/json',
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...options.headers,
  };

  const method = (options.method || 'GET').toUpperCase();
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    const csrf = getCsrfToken();
    if (csrf) headers['X-CSRF-Token'] = csrf;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    ...options,
    headers,
  });

  const payload = await res.json().catch(() => null);

  if (!res.ok || payload?.success === false) {
    const error = new Error(payload?.error?.message || `Request failed (${res.status})`);
    error.status = res.status;
    error.code = payload?.error?.code;
    error.details = payload?.error?.details;
    throw error;
  }

  return payload;
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body: JSON.stringify(body ?? {}) }),
  patch: (path, body) => request(path, { method: 'PATCH', body: JSON.stringify(body ?? {}) }),
  put: (path, body) => request(path, { method: 'PUT', body: JSON.stringify(body ?? {}) }),
  delete: (path) => request(path, { method: 'DELETE' }),
  health: () => request('/api/health'),

  // Public read-only endpoints
  publicOverview: (range = '24h') =>
    request(`/api/v1/public/overview?range=${encodeURIComponent(range)}`),
  publicServers: () => request('/api/v1/public/servers'),
  publicAlerts: () => request('/api/v1/public/alerts'),
  publicIncidents: () => request('/api/v1/public/incidents'),
  publicLogs: (page = 1, pageSize = 20, level = '') =>
    request(
      `/api/v1/public/logs?page=${page}&pageSize=${pageSize}${level ? `&level=${encodeURIComponent(level)}` : ''}`,
    ),
  publicDeployments: () => request('/api/v1/public/deployments'),
  publicApis: () => request('/api/v1/public/apis'),
  publicDocker: (query = '') => request(`/api/v1/public/docker${query ? `?${query}` : ''}`),
  publicDockerContainer: (id) => request(`/api/v1/public/docker/containers/${encodeURIComponent(id)}`),
  publicNetwork: () => request('/api/v1/public/network'),
  publicCosts: () => request('/api/v1/public/costs'),
  publicDomains: () => request('/api/v1/public/domains'),
  publicAwsResources: (query = '') => request(`/api/v1/public/aws/resources${query ? `?${query}` : ''}`),
  publicAwsResource: (id) => request(`/api/v1/public/aws/resources/${encodeURIComponent(id)}`),
  publicAwsSummary: () => request('/api/v1/public/aws/resources/summary'),

  // Admin auth
  login: (email, password) =>
    request('/api/v1/admin/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  logout: () => request('/api/v1/admin/auth/logout', { method: 'POST', body: '{}' }),
  me: () => request('/api/v1/admin/auth/me'),
  awsStatus: () => request('/api/v1/admin/aws/status'),
  awsSync: () => request('/api/v1/admin/aws/sync', { method: 'POST', body: '{}' }),
  adminAwsResource: (id) => request(`/api/v1/admin/aws/resources/${encodeURIComponent(id)}`),
};
