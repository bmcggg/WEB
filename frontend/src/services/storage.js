// storage.js
import { STORAGE_KEYS } from './config';

export const session = {
  getToken: () => localStorage.getItem(STORAGE_KEYS.token),
  getUser() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEYS.user) || 'null'); }
    catch { return null; }
  },
  clear() {
    localStorage.removeItem(STORAGE_KEYS.token);
    localStorage.removeItem(STORAGE_KEYS.user);
  },
};