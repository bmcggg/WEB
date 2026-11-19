// config.js
export const API_BASE_URL = (import.meta.env?.VITE_API_BASE_URL || '/api').replace(/\/$/, '');
export const STORAGE_KEYS = { token: 'fella_token', user: 'fella_user' };
export const SESSION_EXPIRED_EVENT = 'fella:session-expired';