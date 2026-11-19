import axios from 'axios';
import { API_BASE_URL, SESSION_EXPIRED_EVENT } from './config';
import { session } from './storage';

export const readUser = session.getUser;

export function assetUrl(value) {
  if (!value) return '';
  try {
    const base = new URL(API_BASE_URL, window.location.origin);
    const url = new URL(value, base.origin);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
  } catch {
    return '';
  }
}

export class ApiError extends Error {
  constructor(message, { status, cause } = {}) {
    super(message, { cause });
    this.name = 'ApiError';
    this.status = status;
  }
}

const http = axios.create({ baseURL: API_BASE_URL });

// 1 interceptor request duy nhất: kiểm tra URL -> rồi mới gắn token
http.interceptors.request.use((config) => {
  const base = new URL(API_BASE_URL + '/', window.location.origin);
  const target = new URL(axios.getUri(config), window.location.origin);
  if (target.origin !== base.origin || !target.pathname.startsWith(base.pathname)) {
    throw new ApiError('URL API không hợp lệ.');
  }
  const token = session.getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  config._hadToken = Boolean(token);
  return config;
});

http.interceptors.response.use(
  (res) => {
    const type = res.headers['content-type'] || '';
    if (res.config.responseType === 'json' && res.status !== 204 && !type.includes('application/json')) {
      throw new ApiError('Máy chủ trả dữ liệu không hợp lệ.');
    }
    return res;
  },
  (error) => {
    if (axios.isCancel(error)) return Promise.reject(error);
    if (error instanceof ApiError) return Promise.reject(error);
    if (!error.response) {
      return Promise.reject(new ApiError('Không kết nối được máy chủ. Vui lòng thử lại.', { cause: error }));
    }
    const { status, data, config } = error.response;
    if (status === 401 && config._hadToken) {
      session.clear();
      window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
    }
    const message = (data && typeof data === 'object' && data.error) || `Yêu cầu thất bại (${status}).`;
    return Promise.reject(new ApiError(message, { status, cause: error }));
  }
);

const unwrap = (p) => p.then((res) => (res.status === 204 ? null : res.data));

// Giữ tương thích với các component đang gọi fetchAPI(url, { method, body, ... }).
export async function fetchAPI(url, { method = 'GET', body, ...config } = {}) {
  let data = body;

  // Axios nhận object để tự mã hóa JSON và đặt Content-Type phù hợp.
  if (typeof body === 'string') {
    try {
      data = JSON.parse(body);
    } catch {
      // Giữ nguyên body nếu đó không phải JSON.
    }
  }

  try {
    const response = await http.request({
      url,
      method,
      data,
      ...config,
    });
    return response.status === 204 ? null : response.data;
  } catch (error) {
    if (axios.isCancel(error)) {
      throw new DOMException('The operation was aborted.', 'AbortError');
    }
    throw error;
  }
}

export const api = {
  get: (url, cfg) => unwrap(http.get(url, cfg)),
  post: (url, body, cfg) => unwrap(http.post(url, body, cfg)),
  put: (url, body, cfg) => unwrap(http.put(url, body, cfg)),
  patch: (url, body, cfg) => unwrap(http.patch(url, body, cfg)),
  delete: (url, cfg) => unwrap(http.delete(url, cfg)),
  blob: (url, cfg) => unwrap(http.get(url, { ...cfg, responseType: 'blob' })),
};
