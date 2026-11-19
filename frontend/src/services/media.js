import { api } from './api';
import { session } from './storage';

const cache = new Map();

export function acquireMedia(url) {
  const key = session.getToken() + ':' + url;
  let entry = cache.get(key);
  if (!entry) {
    const controller = new AbortController();
    entry = { references: 0, controller, objectUrl: null };
    entry.promise = api.blob(url, { signal: controller.signal }).then((blob) => {
      if (!entry.references) throw new DOMException('Released', 'AbortError');
      entry.objectUrl = URL.createObjectURL(blob);
      return entry.objectUrl;
    });
    cache.set(key, entry);
  }
  entry.references += 1;
  let released = false;
  return {
    promise: entry.promise,
    release() {
      if (released) return;
      released = true;
      if (--entry.references === 0) {
        entry.controller.abort();
        if (entry.objectUrl) URL.revokeObjectURL(entry.objectUrl);
        cache.delete(key);
      }
    },
  };
}