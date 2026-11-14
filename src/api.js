async function request(url, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  if (options.adminPassword) {
    headers['x-admin-password'] = options.adminPassword;
  }

  const res = await fetch(url, {
    headers,
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Error de conexión con el servidor local.');
  }
  return data;
}

export const api = {
  getState: () => request('/api/state'),
  createJob: (payload) =>
    request('/api/jobs', { method: 'POST', body: JSON.stringify(payload) }),
  updateJob: (id, payload, adminPassword) =>
    request(`/api/jobs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
      adminPassword,
    }),
  deleteJob: (id, adminPassword) =>
    request(`/api/jobs/${id}`, {
      method: 'DELETE',
      adminPassword,
    }),
  createVale: (payload) =>
    request('/api/vales', { method: 'POST', body: JSON.stringify(payload) }),
  deleteVale: (id, adminPassword) =>
    request(`/api/vales/${id}`, {
      method: 'DELETE',
      adminPassword,
    }),
  createGasto: (payload) =>
    request('/api/gastos', { method: 'POST', body: JSON.stringify(payload) }),
  deleteGasto: (id, adminPassword) =>
    request(`/api/gastos/${id}`, {
      method: 'DELETE',
      adminPassword,
    }),
  updateCajaBase: (dateKey, amount, adminPassword) =>
    request('/api/caja-base', {
      method: 'PUT',
      body: JSON.stringify({ dateKey, amount }),
      adminPassword,
    }),
  createCorteDiario: (payload) =>
    request('/api/cortes-diarios', { method: 'POST', body: JSON.stringify(payload) }),
  deleteCorteDiario: (id, adminPassword) =>
    request(`/api/cortes-diarios/${id}`, {
      method: 'DELETE',
      adminPassword,
    }),
  closeCorte: () =>
    request('/api/cortes', { method: 'POST' }),
  aperturarCaja: (baseAmount, dateKey) =>
    request('/api/caja/apertura', {
      method: 'POST',
      body: JSON.stringify({ baseAmount, dateKey }),
    }),
};
