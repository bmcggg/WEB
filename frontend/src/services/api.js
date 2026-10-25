const API_BASE_URL = (import.meta.env?.VITE_API_BASE_URL || '/api').replace(/\/$/, '');

export function readUser() {
  try { return JSON.parse(localStorage.getItem('fella_user') || 'null'); }
  catch { return null; }
}

export function assetUrl(value) {
  if (!value) return '';
  const base = new URL(API_BASE_URL, window.location.origin);
  const url = new URL(value, base.origin);
  return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
}

function requestUrl(endpoint) {
  const base = new URL(API_BASE_URL + '/', window.location.origin);
  const relative = endpoint.startsWith('/api/') ? endpoint.slice(5) : endpoint.replace(/^\//, '');
  const target = new URL(relative, base);
  if (target.origin !== base.origin || !target.pathname.startsWith(base.pathname)) throw new Error('URL API không hợp lệ.');
  return target.href;
}

export async function fetchAPI(endpoint, options = {}) {
  const { responseType = 'json', ...requestOptions } = options;
  const token = localStorage.getItem('fella_token');
  const headers = new Headers(requestOptions.headers);
  if (requestOptions.body instanceof FormData) headers.delete('Content-Type');
  else if (requestOptions.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', 'Bearer ' + token);
  let response;
  try {
    response = await fetch(requestUrl(endpoint), {
      ...requestOptions,
      headers,
      credentials: 'include', // Tự động gửi & nhận HttpOnly Cookie fella_token an toàn
      cache: 'no-store'
    });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new Error('Không kết nối được máy chủ. Vui lòng thử lại.', { cause: error });
  }
  if (!response.ok) {
    const data = response.headers.get('content-type')?.includes('application/json')
      ? await response.json().catch(() => null) : null;
    if (response.status === 401 && token) {
      localStorage.removeItem('fella_token');
      localStorage.removeItem('fella_user');
      window.dispatchEvent(new Event('fella:session-expired'));
    }
    const error = new Error(data?.error || 'Yêu cầu thất bại (' + response.status + ').');
    error.status = response.status;
    error.data = data;
    throw error;
  }
  if (response.status === 204) return null;
  if (responseType === 'blob') return response.blob();
  if (!response.headers.get('content-type')?.includes('application/json')) throw new Error('Máy chủ trả dữ liệu không hợp lệ.');
  return response.json();
}

export async function logoutAPI() {
  try {
    await fetchAPI('/auth/logout', { method: 'POST' });
  } catch (_) {}
  localStorage.removeItem('fella_user');
  localStorage.removeItem('fella_token');
  window.dispatchEvent(new Event('fella:session-expired'));
}
