const cache = new Map();
const STORAGE_PREFIX = "cache:";

function getStorageKey(key) {
  return `${STORAGE_PREFIX}${key}`;
}

function readFromStorage(key) {
  try {
    const raw = localStorage.getItem(getStorageKey(key));
    if (!raw) return undefined;
    const parsed = JSON.parse(raw);
    if (parsed?.e && Date.now() > parsed.e) {
      localStorage.removeItem(getStorageKey(key));
      return undefined;
    }
    return parsed?.v;
  } catch {
    return undefined;
  }
}

function writeToStorage(key, value, ttlMs) {
  const payload = {
    v: value,
    e: ttlMs ? Date.now() + ttlMs : null,
  };
  try {
    localStorage.setItem(getStorageKey(key), JSON.stringify(payload));
  } catch {
    // Ignore storage errors.
  }
}

export function getCache(key, { persist = false } = {}) {
  if (cache.has(key)) return cache.get(key);
  if (!persist) return undefined;
  const stored = readFromStorage(key);
  if (stored !== undefined) {
    cache.set(key, stored);
  }
  return stored;
}

export function setCache(key, value, { persist = false, ttlMs } = {}) {
  cache.set(key, value);
  if (persist) {
    writeToStorage(key, value, ttlMs);
  }
}

export function clearCache(prefix) {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) {
      cache.delete(key);
    }
  }
  try {
    for (let i = localStorage.length - 1; i >= 0; i -= 1) {
      const storageKey = localStorage.key(i);
      if (storageKey && storageKey.startsWith(`${STORAGE_PREFIX}${prefix}`)) {
        localStorage.removeItem(storageKey);
      }
    }
  } catch {
    // Ignore storage errors.
  }
}
